# Deploying KYRO CLOUD (Vercel + Render + Colab)

Three tiers:

| Tier | Platform | Role |
| --- | --- | --- |
| Frontend | **Vercel** | Next.js UI only (dashboard, desktop, games, files, terminal, settings) |
| Backend | **Render** | API, auth, session control, runtime registration, heartbeat, WebRTC signaling. **No GPU, no games.** |
| Compute | **Google Colab** | GPU, desktop, games, streaming. Connects **outward** to Render. |

The browser talks to Render for API/WS control, and to Colab directly for the game stream (WebRTC).

## 1. Backend → Render

The repo already contains `render.yaml` + `Dockerfile`. Render auto-deploys on push.

Set these env vars in the Render dashboard (the ones marked `sync: false` are blank by default):

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | your Vercel URL, e.g. `https://kyro-cloud.vercel.app` |
| `AUTH_SECRET` | generated (leave blank → Render generates) |
| `LUNA_USER` / `LUNA_PASSWORD` | private web login |
| `RUNTIME_AUTH_SECRET` | generated; the Colab agent must match this |
| `COMPUTE_PROVIDER` | `colab` |
| `STREAMING_PROVIDER` | `webrtc` |
| `HEARTBEAT_TIMEOUT_MS` | `20000` |

Render injects `$PORT`; the server listens on `0.0.0.0:$PORT`. Health: `GET /api/health`.

CORS is enabled in `middleware.ts` and allows `FRONTEND_URL`. Authentication accepts either the
session cookie (same-origin/local) or a `Authorization: Bearer <token>` header (cross-origin/Vercel).

## 2. Frontend → Vercel

Deploy the **same repo** to Vercel. Vercel serves the UI; it does NOT run the backend pieces
(API routes there are unused — the frontend calls Render instead via `NEXT_PUBLIC_API_URL`).

1. New Project → import the GitHub repo.
2. Framework preset: Next.js (auto-detected).
3. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL` = `https://<your-render-backend>` (e.g. `https://kyro-cloud-3fp0.onrender.com`)
4. Deploy. The frontend build inlines `NEXT_PUBLIC_API_URL` at build time.

On login, the frontend stores the JWT in `localStorage` and sends it as a `Bearer` header to Render
(cross-domain cookies are blocked, so the token-in-storage approach is required).

## 3. Compute → Google Colab

The Colab runtime runs the lightweight Python agent (`runtime-agent/`). It connects **outward** to
Render, so no inbound networking is needed.

1. Open `colab/notebooks/luna_cloud.ipynb` in a Colab GPU runtime.
2. Set:
   - `LUNA_BACKEND_WS = wss://<your-render-backend>/agent`
   - `RUNTIME_AUTH_SECRET` = same value as on Render
   - (optional) `LUNA_SIGNALING_URL` = public Selkies signaling URL for WebRTC
3. Run the notebook. The agent registers, authenticates, sends heartbeats, starts the desktop +
   streaming, and reports status.
4. In the web app, click **Start**; the backend arms, the agent attaches, and the browser receives
   WebRTC signaling and streams directly from Colab.

## 4. Runtime lifecycle (no keep-alive)

Colab is not permanent. When the runtime ends, the agent's heartbeat stops and Render marks the
session **DISCONNECTED** (see `lib/runtime/manager.mjs`). The UI shows "Runtime disconnected —
start a new session". Start a fresh Colab runtime and click Start again; no fake "still alive" state.

## Local dev (single machine)

```bash
npm run setup          # install + .env.local + build
npm run dev            # mock mode (no GPU)
# real local desktop:
COMPUTE_PROVIDER=local STREAMING_PROVIDER=vnc npm run dev
```

Notes:
- WebSockets need a host that keeps connections open (Render does; Vercel serverless does not — that
  is why the backend lives on Render and the frontend on Vercel).
- TLS required for `wss://`; Render/Vercel provide HTTPS automatically.
- Persistent game saves/mods should use an external store; the Colab filesystem is temporary.
