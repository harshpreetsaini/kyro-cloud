#!/usr/bin/env bash
# LUNA CLOUD runtime-agent bootstrap (idempotent).
# Run inside the Colab runtime. Installs desktop + Selkies WebRTC + agent deps.
set -euo pipefail

echo "[bootstrap] updating apt..."
sudo apt-get update -qq || apt-get update -qq || true

echo "[bootstrap] installing desktop environment + VNC..."
sudo apt-get install -y -qq xfce4 xvfb tigervnc-standalone-server 2>/dev/null || \
  apt-get install -y -qq xfce4 xvfb tigervnc-standalone-server || true

echo "[bootstrap] installing Python deps..."
python3 -m pip install --quiet -r "$(dirname "$0")/../requirements.txt" || true

echo "[bootstrap] installing Selkies WebRTC stack (best-effort)..."
bash -c "$(curl -fsSL https://raw.githubusercontent.com/selkies-project/selkies-gstreamer/main/scripts/install.sh)" || \
  echo "[bootstrap] Selkies install skipped/failed — WebRTC streaming unavailable until installed."

echo "[bootstrap] starting agent..."
cd "$(dirname "$0")/.."
LUNA_BACKEND_WS="${LUNA_BACKEND_WS:-ws://localhost:3000/agent}" \
  RUNTIME_AUTH_SECRET="${RUNTIME_AUTH_SECRET:-runtime-change-me}" \
  nohup python3 -m agent.main > /tmp/luna-agent.log 2>&1 &

echo "[bootstrap] done. Agent connecting to ${LUNA_BACKEND_WS}"
