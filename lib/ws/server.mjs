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
        if (msg.type === "launch_game" && manager.sendToAgent) {
          manager.sendToAgent({ type: "launch_game", payload: msg.payload });
        } else if (msg.type === "gamepad" && manager.sendToAgent) {
          manager.sendToAgent({ type: "gamepad", payload: msg.payload });
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

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        manager.emitAgentEvent(msg.type, msg.payload);
      } catch {}
    });
    ws.on("close", () => {
      manager.detachAgent();
      manager.emitAgentEvent("agent_disconnected", {});
      manager.notify("Runtime agent disconnected.", "error");
    });
    ws.on("error", () => manager.detachAgent());
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
      // The first message from the agent may be a GStreamer init frame
      // (JSON with type "gst-init") or raw VNC RFB data.
      const origOnMessage = ws.on;
      let initialized = false;
      ws.on("message", function onFirstMsg(data) {
        if (initialized) return;
        initialized = true;
        ws.off("message", onFirstMsg);
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === "gst-init") {
            // Mark the stream as GStreamer H.264 mode.
            manager.setStream({
              ...manager.stream,
              type: "gstreamer",
              encoder: msg.encoder,
              fps: msg.fps,
              width: msg.width,
              height: msg.height,
            });
            return; // Don't relay the init message to the browser.
          }
        } catch {
          // Not JSON — this is raw VNC data.  Relay it as-is.
        }
        // If we get here, the first message was raw VNC data — send it through.
        if (ws.readyState === 1 && manager.vncTunnelWs) {
          // The browser WS will be created on handleStreamUpgrade, so we just
          // let the normal relay handle subsequent messages.
        }
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
        const onTunnel = (data) => {
          if (ws.readyState === 1) ws.send(data);
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
