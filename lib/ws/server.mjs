import { WebSocketServer } from "ws";
import net from "net";
import { spawn } from "child_process";
import { getManager } from "../runtime/manager.mjs";

const RUNTIME_AUTH = process.env.RUNTIME_AUTH_SECRET || "runtime-change-me";

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });
  const manager = getManager();

  server.on("upgrade", (req, socket, head) => {
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
      handleStreamUpgrade(req, socket, head, manager);
    } else if (path === "/agent") {
      wss.handleUpgrade(req, socket, head, (ws) => handleAgent(ws, url, manager));
    } else if (path === "/ws/terminal") {
      wss.handleUpgrade(req, socket, head, (ws) => handleTerminal(ws));
    } else if (path === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => handleClient(ws, manager));
    } else if (path === "/ws/signal") {
      wss.handleUpgrade(req, socket, head, (ws) => handleSignal(ws, url));
    } else {
      socket.destroy();
    }
  });

  manager.attachBroadcaster((event) => {
    const msg = JSON.stringify(event);
    for (const c of wss.clients) {
      if (c._role === "client" && c.readyState === 1) c.send(msg);
    }
  });

  function handleClient(ws, manager) {
    ws._role = "client";
    const init = [
      { type: "runtime.status", payload: manager.sessionInfo(), ts: Date.now() },
      { type: "system.info", payload: manager.systemInfo, ts: Date.now() },
      { type: "system.stats", payload: manager.stats, ts: Date.now() },
    ];
    if (manager.stream) init.push({ type: "stream.status", payload: manager.stream, ts: Date.now() });
    for (const e of init) ws.send(JSON.stringify(e));

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
          return;
        }
        if (msg.type === "launch_game" && manager.sendToAgent) {
          manager.sendToAgent({ type: "launch_game", payload: msg.payload });
        } else if (msg.type === "gamepad" && manager.sendToAgent) {
          manager.sendToAgent({ type: "gamepad", payload: msg.payload });
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
    ws.on("close", () => {});
  }

  function handleAgent(ws, url, manager) {
    const token = url.searchParams.get("token");
    if (token !== RUNTIME_AUTH) {
      ws.close(4401, "unauthorized");
      return;
    }
    ws._role = "agent";
    manager.attachAgent(ws);
    manager.emitAgentEvent("agent_attached", {});
    manager.notify("Runtime agent connected.", "success");

    // Keepalive ping for agent connection
    const agentPingInterval = setInterval(() => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
      }
    }, 30000);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "pong") return; // ignore pong responses
        manager.emitAgentEvent(msg.type, msg.payload);
      } catch {}
    });
    ws.on("close", () => {
      clearInterval(agentPingInterval);
      manager.detachAgent();
      manager.emitAgentEvent("agent_disconnected", {});
      manager.notify("Runtime agent disconnected.", "error");
    });
    ws.on("error", () => {
      clearInterval(agentPingInterval);
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
    if (token !== RUNTIME_AUTH) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
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

        // Buffer monitoring: track browser-side buffer health
        let browserBufferLevel = 0;
        const MAX_BROWSER_BUFFER = 5; // Max frames buffered before dropping

        const onTunnel = (data) => {
          if (ws.readyState !== 1) return;

          // Monitor browser buffer level via bufferedAmount
          if (ws.bufferedAmount > 1024 * 1024) { // > 1MB buffered
            // Under congestion: drop delta frames (non-keyframes)
            // Keyframes start with 0x65, 0x61, 0x41, or 0x21 (NAL type 1, 5, 7, 8)
            // For simplicity, we check if this is a video frame (0x00 prefix)
            if (data.length > 0 && data[0] === 0x00) {
              // Check if this might be a keyframe (rough heuristic: large frame)
              if (data.length < 10000) {
                // Small frame = likely delta, drop it
                return;
              }
            }
          }

          // Add timestamp for latency measurement (4-byte milliseconds since epoch)
          const ts = Date.now() % 0xFFFFFFFF;
          const tsBuf = Buffer.alloc(4);
          tsBuf.writeUInt32BE(ts, 0);

          // For video frames (0x00 prefix), prepend timestamp
          if (data.length > 0 && data[0] === 0x00) {
            const framed = Buffer.concat([Buffer.from([0x00]), tsBuf, data.slice(1)]);
            ws.send(framed);
          } else {
            // Audio or other data - send as-is
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
    if (role === "agent" && url.searchParams.get("token") !== RUNTIME_AUTH) {
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
