# Architecture

KYRO CLOUD is a single-user personal cloud gaming platform. The web app and backend are a
**Next.js monolith**; a separate **Python runtime-agent** runs inside the compute environment
(Google Colab first) and connects **outward** to the backend.

## Layers

```
Browser (Next.js client)
  └─ WebSocket /ws  ── events (runtime.status, system.stats, stream.status, …)
  └─ REST /api/*    ── actions (start/stop, files, games, auth)
        │
Next.js custom server (server.mjs)
  ├─ Next request handler (pages + API routes)
  └─ WebSocket server (lib/ws/server.mjs)
        ├─ /ws            runtime event channel (browser)
        ├─ /ws/stream     WS→TCP bridge to the VNC/desktop port (streaming)
        ├─ /ws/terminal   browser → runtime shell
        └─ /agent         runtime-agent control channel (authenticated by RUNTIME_AUTH_SECRET)
        │
RuntimeManager (lib/runtime/manager.mjs, single shared instance via globalThis)
  ├─ state machine: OFFLINE → STARTING → … → STREAMING → STOPPING → OFFLINE
  ├─ ComputeProvider (mock | local | colab)
  └─ StreamingProvider (vnc/noVNC | webrtc/Selkies)
        │
Runtime agent (Python, inside Colab) — connects to /agent, sends heartbeat + GPU/stats,
handles prepare_desktop / start_stream / launch_game / stop.
```

## Provider abstraction

- **ComputeProvider**: `start()`, `stop()`. `MockComputeProvider` (UI dev, labeled SIMULATED),
  `LocalComputeProvider` (spawns a real X display + desktop on this machine), `ColabComputeProvider`
  (arms and waits for the Python agent to attach and report ready).
- **StreamingProvider**: `start(opts)`. `VNCStreamingProvider` launches `Xvnc` + a desktop and
  exposes `/ws/stream` (noVNC/RFB in the browser). `WebRTCStreamingProvider` tells the agent to
  start the Selkies WebRTC pipeline and returns the signaling URL.

## Honesty rules

- Hardware values come from the runtime (`nvidia-smi`, `free`, `df`, `psutil`). Missing sensors
  surface as `--` / `Unavailable` — never fabricated.
- Mock mode is clearly labeled **SIMULATED** in the UI.
- Windows-only titles without a Linux compatibility path are marked `UNSUPPORTED` / `UNKNOWN`.

## Local verification performed

- `npm run typecheck`, `npm test`, `npm run build` all pass.
- Authenticated flow: login → start (mock) → WebSocket receives `runtime.status` / `system.info`
  / `system.stats`; stream config returned with `simulated:true`.
- Real path: with `COMPUTE_PROVIDER=local STREAMING_PROVIDER=vnc`, `Xvnc` starts, listens on
  `5901`, and `/ws/stream` relays the VNC protocol (`RFB 003.008`) to the browser.
