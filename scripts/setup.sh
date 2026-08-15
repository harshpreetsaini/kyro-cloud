#!/usr/bin/env bash
# LUNA CLOUD — one-command backend setup. Idempotent.
set -euo pipefail

echo "== LUNA CLOUD backend setup =="

# 1. Node dependencies
echo "[1/4] Installing Node dependencies..."
npm install

# 2. Environment file with generated secrets (zero-config)
if [ ! -f .env.local ]; then
  echo "[2/4] Creating .env.local with generated secrets..."
  cp .env.example .env.local
  AUTH=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)
  RT=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)
  sed -i "s/^AUTH_SECRET=.*/AUTH_SECRET=$AUTH/" .env.local
  sed -i "s/^RUNTIME_AUTH_SECRET=.*/RUNTIME_AUTH_SECRET=$RT/" .env.local
  echo "      login: owner / change-me   (set LUNA_USER/LUNA_PASSWORD in .env.local to change)"
else
  echo "[2/4] .env.local already exists — keeping it."
fi

# 3. Optional system deps for a REAL local desktop (VNC streaming)
if command -v apt-get >/dev/null 2>&1; then
  echo "[3/4] Installing desktop streaming deps (tigervnc + xfce4)..."
  if sudo -n true 2>/dev/null; then
    sudo apt-get update -qq && sudo apt-get install -y -qq tigervnc-standalone-server xfce4 openbox \
      || echo "      (skipped — install manually if you want a real desktop in local mode)"
  else
    echo "      (no passwordless sudo — skip; run manually: sudo apt-get install -y tigervnc-standalone-server xfce4)"
  fi
else
  echo "[3/4] No apt-get (non-Debian) — skipping system deps."
fi

# 4. Production build
echo "[4/4] Building..."
npm run build

echo ""
echo "== Setup complete =="
echo "  Dev (mock, no GPU needed):   npm run dev"
echo "  Real local desktop:          COMPUTE_PROVIDER=local STREAMING_PROVIDER=vnc npm run dev"
echo "  Colab GPU:                   COMPUTE_PROVIDER=colab STREAMING_PROVIDER=webrtc npm run dev"
echo "  Docker deploy:              npm run deploy"
echo "  Health check:                curl http://localhost:3000/api/health"
