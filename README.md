# LUNA CLOUD

> **Your PC. Anywhere.** — a private, single-user personal cloud gaming platform.

LUNA CLOUD turns a GPU runtime (Google Colab first) into a temporary personal gaming
computer you control through a modern web interface. It streams a real Linux desktop with
mouse, keyboard, and audio, and lets you install launchers, games, mods, and manage files
just like a normal PC.

## Architecture

```
USER DEVICE
  → WEB APP (Next.js)
    → BACKEND (Next API + WebSocket server)   ← single deployable
      → COMPUTE PROVIDER  (mock | local | colab)
        → STREAMING PROVIDER (vnc/noVNC | webrtc/Selkies)
          → RUNTIME AGENT (Python, runs inside Colab, connects outward)
```

The compute and streaming layers are abstracted so Google Colab is the first provider but
dedicated GPU servers or other clouds can be added without rewriting the app.

## Quick start (local dev)

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
```

- Default login: `owner` / `change-me` (set `LUNA_USER` / `LUNA_PASSWORD`).
- Default provider is **mock** → the full UI works with simulated system data and a
  placeholder desktop (no GPU needed).
- Set `COMPUTE_PROVIDER=local` and `STREAMING_PROVIDER=vnc`, then install a real desktop:

  ```bash
  sudo apt-get install -y tigervnc-standalone-server xfce4
  COMPUTE_PROVIDER=local STREAMING_PROVIDER=vnc npm run dev
  ```

  The browser will then stream an actual XFCE desktop via noVNC (mouse + keyboard work).

## Connecting a real Colab GPU

1. Deploy the backend somewhere reachable over HTTPS/WSS.
2. Open `colab/notebooks/luna_cloud.ipynb` in Colab, set `LUNA_BACKEND_WS` and
   `RUNTIME_AUTH_SECRET`, and run the cell. The Python agent installs a desktop + Selkies
   WebRTC stack and connects **outward** to your backend. No inbound access required.
3. In the web app, set provider to `colab` and start the session; the backend arms and
   waits for the agent, then streams via WebRTC (Selkies).

## Scripts

- `npm run dev` — custom server (Next + WebSocket) in dev mode
- `npm run build` / `npm start` — production
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — provider + manager unit tests

## Project layout

```
app/                 Next.js App Router (pages + API routes)
components/          React UI (Sidebar, TopBar, RemoteDesktop, …)
lib/                 providers, runtime state machine, ws server, auth, fs
hooks/               (runtime hooks live in components/providers)
shared/              TypeScript API + WebSocket contract
runtime-agent/       Python agent + Colab bootstrap
colab/               Notebook + setup
docs/                Architecture & dev notes
```

## Notes & honesty

- Hardware values are read from the runtime when available; otherwise the UI shows `--` /
  `Unavailable`. Nothing is fabricated.
- Windows-only games without a Linux compatibility path (Steam + Proton/Wine) are marked
  `UNSUPPORTED` / `UNKNOWN`; Windows support is never faked.
- Mock mode is clearly labeled **SIMULATED** in the UI.
