import { WebSocketServer } from "ws";
import net from "net";
import { spawn } from "child_process";
import { timingSafeEqual } from "crypto";
import { getManager } from "../runtime/manager.mjs";
import { verifySession } from "../../lib/auth/jwt.mjs";

// Fail-closed: an unset RUNTIME_AUTH_SECRET disables every agent-auth path
// instead of falling back to a guessable default.
const RUNTIME_AUTH = process.env.RUNTIME_AUTH_SECRET || "";

// Constant-time secret comparison (length-mismatch safe).
function safeEq(a, b) {
  const ab = Buffer.from(String(a ?? ""));
  const bb = Buffer.from(String(b ?? ""));
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// A browser-side session is mandatory for user-facing channels.
async function sessionOk(url) {
  try {
    const t = url.searchParams.get("token");
    if (!t) return false;
    const s = await verifySession(t);
    return !!(s && s.userId != null);
  } catch {
    return false;
  }
}

export function setupWebSocket(server) {
  // 16MB is generous for H.264 frames / gst-init JSON; 256MB allowed
  // memory-exhaustion DoS from a single socket.
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 * 1024 });
  const manager = getManager();

  server.on("upgrade", async (req, socket, head) => {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      socket.destroy();
      return;
    }
    const path = url.pathname;
    if (path === "/vnc") {
      handleVncTunnel(req, socket, head, manager);
    } else if (path === "/ws/stream") {
      if (!(await sessionOk(url))) {
        console.error("[ws] stream upgrade rejected: no valid session");
        socket.destroy();
        return;
      }
      handleStreamUpgrade(req, socket, head, manager);
    } else if (path === "/agent") {
      wss.handleUpgrade(req, socket, head, (ws) => handleAgent(ws, url, manager));
    } else if (path === "/ws/terminal") {
      if (!(await sessionOk(url))) {
        console.error("[ws] terminal upgrade rejected: no valid session");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => handleTerminal(ws, manager));
    } else if (path === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => handleClient(ws, manager, url));
    } else if (path === "/ws/signal") {
      wss.handleUpgrade(req, socket, head, (ws) => handleSignal(ws, url));
    } else {
      socket.destroy();
    }
  });

  manager.attachBroadcaster((event) => {
    // Installed games are persisted to the user's Vercel Postgres profile by the
    // frontend (on the games.installed event). The backend stays DB-free.
    const msg = JSON.stringify(event);
    for (const c of wss.clients) {
      if (c._role === "client" && c.readyState === 1) c.send(msg);
    }
  });

  async function handleClient(ws, manager, url) {
    // The control channel is authenticated: no token → no broadcasts,
    // no agent-command injection.
    if (!(await sessionOk(url))) {
      console.error("[ws] control-channel connect rejected: no valid session");
      ws.close(4401, "unauthorized");
      return;
    }
    ws._role = "client";
    // Enable TCP_NODELAY for low-latency control messages
    if (ws._socket) ws._socket.setNoDelay(true);

    // Per-user attribution: the browser passes ?token=<session> when opening the WS.
    let userId = null;
    try {
      const t = url.searchParams.get("token");
      const s = await verifySession(t);
      if (s && s.userId != null) userId = s.userId;
    } catch {}
    ws.userId = userId;
    if (userId != null) manager.activeUserId = userId;

    const init = [
      { type: "runtime.status", payload: manager.sessionInfo(), ts: Date.now() },
      { type: "system.info", payload: manager.systemInfo, ts: Date.now() },
      { type: "system.stats", payload: manager.stats, ts: Date.now() },
    ];
    if (manager.stream) init.push({ type: "stream.status", payload: manager.stream, ts: Date.now() });
    if (manager.installedGames) init.push({ type: "games.installed", payload: manager.installedGames, ts: Date.now() });
    // Replay the active user's linked-provider accounts from the in-memory relay
    // cache (immediate UI feedback; the durable source of truth is Vercel Postgres).
    try {
      const providers = globalThis.__getActiveLinked ? globalThis.__getActiveLinked() : {};
      for (const [provider, info] of Object.entries(providers || {})) {
        if (!info) continue;
        init.push({
          type: "provider.login.result",
          payload: { provider, ok: true, username: info.username },
          ts: Date.now(),
        });
      }
    } catch {}
    for (const e of init) ws.send(JSON.stringify(e));

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          // Echo the client's timestamp so it can compute round-trip latency
          ws.send(JSON.stringify({ type: "pong", ts: msg.ts }));
          return;
        }
        if (msg.type === "launch_game" && manager.sendToAgent) {
          manager.sendToAgent({ type: "launch_game", payload: msg.payload });
        } else if (msg.type === "gamepad" && manager.sendToAgent) {
          manager.sendToAgent({ type: "gamepad", payload: msg.payload });
        } else if (msg.type === "game.install" && manager.sendToAgent) {
          manager.sendToAgent({ type: "game.install", payload: msg.payload });
        } else if (msg.type === "game.uninstall" && manager.sendToAgent) {
          manager.sendToAgent({ type: "game.uninstall", payload: msg.payload });
        } else if (msg.type === "game.install.cancel" && manager.sendToAgent) {
          manager.sendToAgent({ type: "game.install.cancel", payload: msg.payload });
        } else if (msg.type === "steam.guard.code" && manager.sendToAgent) {
          manager.sendToAgent({ type: "steam.guard.code", payload: msg.payload });
        } else if (
          (msg.type === "provider.login" || msg.type === "provider.sync" || msg.type === "provider.logout") &&
          manager.sendToAgent
        ) {
          manager.sendToAgent({ type: msg.type, payload: msg.payload });
        } else if (msg.type === "adjust_quality") {
          // Quality adjustment from the frontend
          const result = manager.adjustQuality(msg.payload);
          ws.send(JSON.stringify({ type: "quality_adjusted", payload: result, ts: Date.now() }));
        } else if (msg.type === "get_quality") {
          // Get current quality settings
          ws.send(JSON.stringify({
            type: "quality_info",
            payload: manager._currentQuality || null,
            ts: Date.now(),
          }));
        }
      } catch {}
    });
    ws.on("close", () => {
      // Clear per-user attribution when the last authenticated client leaves so
      // a later agent event is never attributed to a stale user.
      try {
        const anyLeft = [...wss.clients].some(
          (c) => c !== ws && c._role === "client" && c.userId != null
        );
        if (!anyLeft && manager.activeUserId === userId) manager.activeUserId = null;
      } catch {}
    });
  }

  function handleAgent(ws, url, manager) {
    const token = url.searchParams.get("token");
    if (!RUNTIME_AUTH || !safeEq(token, RUNTIME_AUTH)) {
      console.error("[ws] Agent auth failed — token mismatch");
      ws.close(4401, "unauthorized");
      return;
    }
    console.log(`[ws] agent connected (${url.searchParams.get("gen") || "?"})`);
    ws._role = "agent";
    // Enable TCP_NODELAY for zero-latency control messages
    if (ws._socket) ws._socket.setNoDelay(true);
    try {
      manager.attachAgent(ws);
    } catch (ex) {
      console.error(`[ws] attachAgent threw: ${ex && ex.stack ? ex.stack : ex}`);
    }
    manager.emitAgentEvent("agent_attached", {});
    manager.notify("Runtime agent connected.", "success");

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        // Reply to the agent's application-level keepalive so its watchdog
        // can detect half-open sockets and reconnect.
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", ts: msg.ts }));
          return;
        }
        try {
          manager.emitAgentEvent(msg.type, msg.payload);
        } catch (ex) {
          console.error(`[ws] emitAgentEvent(${msg.type}) threw: ${ex && ex.stack ? ex.stack : ex}`);
        }
      } catch (ex) {
        console.error(`[ws] agent message parse failed: ${ex}`);
      }
    });
    ws.on("close", (code, reason) => {
      console.log(`[ws] agent disconnected (code=${code}, reason=${reason ? reason.toString() : ""})`);
      manager.detachAgent();
      manager.emitAgentEvent("agent_disconnected", {});
      manager.notify("Runtime agent disconnected.", "error");
    });
    ws.on("error", (err) => {
      console.error(`[ws] agent socket error: ${err && err.message ? err.message : err}`);
      manager.detachAgent();
    });
  }

  function handleTerminal(ws) {
    const channelId = "term-" + Math.random().toString(36).slice(2, 10);

    if (!manager.agentAttached) {
      ws.send("\r\n[Terminal unavailable: Colab agent not connected]\r\n$ ");
      ws.on("close", () => {});
      return;
    }

    // Tell the Colab agent to start a shell for this channel
    manager.sendToAgent({
      type: "terminal.start",
      payload: { channelId, cwd: "/root" },
    });

    // Subscribe to terminal output from the agent for this channel
    const unsub = manager.onEvent("terminal.output", (payload) => {
      if (payload.channelId === channelId && ws.readyState === 1) {
        if (payload.stdout) ws.send(payload.stdout);
        if (payload.stderr) ws.send(payload.stderr);
      }
    });

    const unsubStarted = manager.onEvent("terminal.started", (payload) => {
      if (payload.channelId === channelId && ws.readyState === 1) {
        if (payload.ok) {
          ws.send("\r\n$ ");
        } else {
          ws.send(`\r\n[Terminal failed: ${payload.error}]\r\n$ `);
        }
      }
    });

    ws.on("message", (d) => {
      const data = d.toString();
      // Forward input to the Colab agent shell
      manager.sendToAgent({
        type: "terminal.input",
        payload: { channelId, data },
      });
    });

    ws.on("close", () => {
      unsub();
      unsubStarted();
      manager.sendToAgent({
        type: "terminal.stop",
        payload: { channelId },
      });
    });
    ws.on("error", () => {
      unsub();
      unsubStarted();
      manager.sendToAgent({
        type: "terminal.stop",
        payload: { channelId },
      });
    });
  }

  function handleVncTunnel(req, socket, head, manager) {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      socket.destroy();
      return;
    }
    const token = url.searchParams.get("token");
    if (!RUNTIME_AUTH || !safeEq(token, RUNTIME_AUTH)) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      // Enable TCP_NODELAY for zero-latency video forwarding
      if (ws._socket) ws._socket.setNoDelay(true);
      manager.attachVncTunnel(ws);
      // Detect GStreamer init message from the agent.  The first message may
      // be a JSON `{"type":"gst-init",...}` or raw VNC RFB data.  Mark the
      // stream type accordingly — don't consume the message, just observe.
      let checked = false;
      const origOn = ws.on.bind(ws);
      ws.on("message", function gstCheck(data) {
        if (checked) return;
        checked = true;
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === "gst-init") {
            manager.setStream({
              ...manager.stream,
              type: "gstreamer",
              encoder: msg.encoder,
              fps: msg.fps,
              width: msg.width,
              height: msg.height,
            });
          }
        } catch {
          // Not JSON — raw VNC data, nothing to do.
        }
        // Do NOT return or consume — let the normal relay handler also see it.
      });
      ws.on("close", () => manager.detachVncTunnel());
      ws.on("error", () => manager.detachVncTunnel());
    });
  }

  function handleStreamUpgrade(req, socket, head, manager) {
    // Colab mode: the agent tunnels the stream over its /vnc WebSocket.
    const tunnel = manager.vncTunnelWs;
    if (tunnel && tunnel.readyState === 1) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        // Enable TCP_NODELAY for zero-latency forwarding
        if (ws._socket) ws._socket.setNoDelay(true);

        // For GStreamer mode, send a mode indicator so the browser knows
        // to use WebCodecs instead of noVNC.
        const streamConfig = manager.stream;
        if (streamConfig && streamConfig.type === "gstreamer") {
          ws.send(JSON.stringify({
            type: "gst-mode",
            encoder: streamConfig.encoder,
            fps: streamConfig.fps,
            width: streamConfig.width,
            height: streamConfig.height,
          }));
        }
        // Flush any buffered tunnel data that arrived before the browser connected.
        manager.flushVncBuffer(ws);

        const onTunnel = (data) => {
          if (ws.readyState !== 1) return;

          // Zero-copy: skip delta frames only under extreme congestion
          if (ws.bufferedAmount > 2097152) { // > 2MB buffered
            // Only drop small frames (< 5KB = likely delta)
            if (data.length > 0 && data[0] === 0x00 && data.length < 5120) {
              return;
            }
          }

          // Add 4-byte timestamp for latency measurement
          const ts = Date.now() % 0xFFFFFFFF;
          const framed = Buffer.allocUnsafe(5);
          framed[0] = 0x00;
          framed.writeUInt32BE(ts, 1);

          if (data.length > 0 && data[0] === 0x00) {
            ws.send(Buffer.concat([framed, data.slice(1)]));
          } else {
            ws.send(data);
          }
        };
        const onWs = (data) => {
          if (tunnel.readyState === 1) tunnel.send(data);
        };
        tunnel.on("message", onTunnel);
        ws.on("message", onWs);
        const cleanup = () => {
          try { tunnel.off("message", onTunnel); } catch {}
          try { ws.close(); } catch {}
        };
        ws.on("close", cleanup);
        ws.on("error", cleanup);
        tunnel.on("close", () => { try { ws.close(); } catch {} });
        tunnel.on("error", () => { try { ws.close(); } catch {} });
      });
      return;
    }
    // Local/backend mode: proxy directly to a TCP VNC target.
    const target = manager.streamTarget;
    if (!target) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const tcp = net.connect(target.port, target.host, () => {});
      ws.on("message", (d) => {
        if (tcp.writable) tcp.write(d);
      });
      tcp.on("data", (d) => {
        if (ws.readyState === 1) ws.send(d);
      });
      ws.on("close", () => tcp.destroy());
      ws.on("error", () => tcp.destroy());
      tcp.on("close", () => ws.close());
      tcp.on("error", () => ws.close());
    });
  }

  // ---------------------------------------------------------------------------
  // WebRTC signaling relay (agent-outbound pattern for Colab's no-ingress env).
  // The Colab agent (role=agent) and the browser client (role=client) both
  // connect here; we relay SDP/ICE between the two peers in the same `room`.
  // No public TURN is required because the agent initiates the connection.
  // ---------------------------------------------------------------------------
  const signalRooms = new Map();

  function handleSignal(ws, url) {
    const room = url.searchParams.get("room");
    const role = url.searchParams.get("role");
    if (!room || (role !== "agent" && role !== "client")) {
      ws.close(1008, "missing room/role");
      return;
    }
    if (role === "agent" && (!RUNTIME_AUTH || !safeEq(url.searchParams.get("token"), RUNTIME_AUTH))) {
      ws.close(1008, "unauthorized");
      return;
    }
    if (!signalRooms.has(room)) signalRooms.set(room, {});
    const peers = signalRooms.get(room);
    peers[role] = ws;
    const other = role === "agent" ? peers.client : peers.agent;

    ws.on("message", (data) => {
      const target = role === "agent" ? peers.client : peers.agent;
      if (target && target.readyState === 1) target.send(data);
    });
    const cleanup = () => {
      if (peers[role] === ws) delete peers[role];
      const tgt = role === "agent" ? peers.client : peers.agent;
      if (tgt && tgt.readyState === 1) tgt.send(JSON.stringify({ type: "peer-left" }));
      if (!peers.agent && !peers.client) signalRooms.delete(room);
    };
    ws.on("close", cleanup);
    ws.on("error", cleanup);
    if (other && other.readyState === 1) other.send(JSON.stringify({ type: "peer-joined" }));
  }

  return wss;
}
