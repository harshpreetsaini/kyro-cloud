# Deploying LUNA CLOUD backend

The backend is a single Node process (Next.js + WebSocket server in `server.mjs`). It needs
**long-lived WebSocket support**, so use Docker / Railway / Render — not Vercel (serverless
WebSockets are not supported there).

## 1. Environment variables

Copy `.env.example` to `.env` (or set them in your PaaS dashboard) and change the secrets:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_NAME` | UI brand |
| `BACKEND_URL` | Public base URL of this backend (used by clients/agent) |
| `AUTH_SECRET` | Signs the web session JWT |
| `LUNA_USER` / `LUNA_PASSWORD` | Private web login |
| `RUNTIME_AUTH_SECRET` | Secret the Colab agent must present at `/agent` |
| `COMPUTE_PROVIDER` | `mock` \| `local` \| `colab` |
| `STREAMING_PROVIDER` | `vnc` \| `webrtc` |
| `DATABASE_URL` | JSON file store path |

For a Colab-connected deployment set `COMPUTE_PROVIDER=colab` and `STREAMING_PROVIDER=webrtc`.

## 2. Run locally (production)

```bash
npm run build
NODE_ENV=production node server.mjs
# or: npm start
```

Health check: `GET /api/health` → `{ ok: true }`.

## 3. Docker

```bash
docker build -t luna-cloud .
docker run -p 3000:3000 --env-file .env luna-cloud
# or: docker compose up --build
```

## 4. Railway

1. New project → Deploy from GitHub repo.
2. Railway auto-detects `railway.json` (Dockerfile build, `node server.mjs`, healthcheck `/api/health`).
3. Set the env vars above (generate `AUTH_SECRET` and `RUNTIME_AUTH_SECRET`).
4. Deploy. Note the generated `https://…railway.app` URL — that is your `BACKEND_URL`.

## 5. Render

1. New → Web Service → connect repo.
2. Render uses `render.yaml` (Docker runtime, healthcheck `/api/health`).
3. Fill `BACKEND_URL` with the Render URL and set the other secrets.
4. Deploy.

## 6. Point a Colab runtime at it

Open `colab/notebooks/luna_cloud.ipynb` and set:

- `LUNA_BACKEND_WS = wss://<YOUR-BACKEND>/agent`
- `RUNTIME_AUTH_SECRET` = the same value as on the backend

The Python agent connects **outward**, so no inbound firewall rules are needed. Then start the
session in the web app; the backend arms and waits for the agent, then streams via WebRTC.

## Notes
- WebSockets require a host that keeps connections open (Railway/Render/your VM do).
- TLS is required for `wss://` from the browser; put the backend behind HTTPS (Railway/Render
  provide this automatically; for a VM use a reverse proxy such as Caddy/Nginx).
