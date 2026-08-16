#!/usr/bin/env bash
# LUNA CLOUD runtime-agent bootstrap (idempotent).
# Run inside the Colab runtime. Installs desktop + Selkies WebRTC + agent deps.
export DEBIAN_FRONTEND=noninteractive
set -euo pipefail

# Robust defaults. `sudo` strips the environment, so the notebook must invoke this
# with `sudo -E`; these defaults also keep the script from dying on unset variables.
export LUNA_BACKEND_WS="${LUNA_BACKEND_WS:-wss://kyro-cloud-3fp0.onrender.com/agent}"
export RUNTIME_AUTH_SECRET="${RUNTIME_AUTH_SECRET:-runtime-change-me}"
export LUNA_DISPLAY="${LUNA_DISPLAY:-:1}"

AGENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[bootstrap] updating apt (this may take 1-2 minutes)..."
sudo apt-get update  || apt-get update  || true

echo "[bootstrap] installing desktop environment + VNC (this may take 3-5 minutes)..."
sudo apt-get install -y  xfce4 xvfb tigervnc-standalone-server dbus-x11 2>/dev/null || \
  apt-get install -y  xfce4 xvfb tigervnc-standalone-server dbus-x11 || true
# Ensure openbox is available as a lightweight WM fallback
sudo apt-get install -y  openbox 2>/dev/null || apt-get install -y  openbox || true

echo "[bootstrap] installing Python deps..."
python3 -m pip install --quiet -r "$AGENT_DIR/requirements.txt" || true

echo "[bootstrap] installing Selkies WebRTC stack (best-effort)..."
if python3 -m pip install --quiet selkies-gstreamer 2>/dev/null; then
  echo "[bootstrap] selkies-gstreamer pip package installed."
  if command -v selkies-gstreamer-install >/dev/null 2>&1; then
    selkies-gstreamer-install >/tmp/selkies-install.log 2>&1 || \
      echo "[bootstrap] selkies-gstreamer-install failed; see /tmp/selkies-install.log"
  fi
else
  echo "[bootstrap] selkies-gstreamer pip install failed — WebRTC streaming unavailable until installed."
fi

echo "[bootstrap] killing any old agents..."
pkill -f "python3 main.py" 2>/dev/null || true

echo "[bootstrap] starting agent (backend: ${LUNA_BACKEND_WS})..."
cd "$AGENT_DIR/agent"
nohup python3 main.py > /tmp/luna-agent.log 2>&1 & \
  echo "[bootstrap] agent started in background (PID $!)"

echo "[bootstrap] done. Tail logs: !tail -f /tmp/luna-agent.log"
