#!/usr/bin/env bash
# KYRO CLOUD runtime-agent bootstrap (idempotent).
# Installs only what's needed: desktop, VNC, steamcmd, GStreamer, agent deps.
export DEBIAN_FRONTEND=noninteractive
set -uo pipefail

: > /tmp/luna-agent.log
echo "[bootstrap] starting at $(date -u)" >> /tmp/luna-agent.log

# Robust defaults. `sudo` strips the environment, so the notebook must invoke this
# with `sudo -E`; these defaults also keep the script from dying on unset variables.
export LUNA_BACKEND_WS="${LUNA_BACKEND_WS:-wss://kyro-cloud-3fp0.onrender.com/agent}"
export RUNTIME_AUTH_SECRET="${RUNTIME_AUTH_SECRET:-runtime-change-me}"
export LUNA_DISPLAY="${LUNA_DISPLAY:-:1}"

# ── Validate auth token before doing anything ──────────────────────────
if [ "$RUNTIME_AUTH_SECRET" = "runtime-change-me" ] || [ -z "$RUNTIME_AUTH_SECRET" ]; then
  echo "[bootstrap] ERROR: RUNTIME_AUTH_SECRET is not set!"
  echo "[bootstrap] The notebook cell must set RUNTIME_AUTH_SECRET before running bootstrap."
  echo "[bootstrap] Set it in the notebook or export it as an environment variable."
  exit 1
fi

# Pre-seed debconf answers so package installs never block on interactive prompts.
echo "keyboard-configuration keyboard-configuration/layout select 'English (US)'" | debconf-set-selections 2>/dev/null || true
echo "keyboard-configuration keyboard-configuration/variant select 'English (US)'" | debconf-set-selections 2>/dev/null || true
echo "console-setup console-setup/charmap47 select 'UTF-8'" | debconf-set-selections 2>/dev/null || true

AGENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[bootstrap] updating apt..."
DEBIAN_FRONTEND=noninteractive apt-get update -y 2>/dev/null || true
dpkg --configure -a 2>/dev/null || true

# Enable universe repo for lutris etc.
add-apt-repository -y universe 2>/dev/null || true
DEBIAN_FRONTEND=noninteractive apt-get update -y 2>/dev/null || true

# ── Core desktop: Xvfb + VNC + window manager ──────────────────────────
echo "[bootstrap] installing desktop + VNC..."
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  xfce4 xvfb x11vnc openbox dbus-x11 feh \
  xterm xfce4-terminal thunar xdotool \
  wget curl ca-certificates 2>/dev/null || true

# ── steamcmd — the CLI tool for downloading Steam games ────────────────
echo "[bootstrap] installing steamcmd..."
dpkg --add-architecture i386 2>/dev/null || true
DEBIAN_FRONTEND=noninteractive apt-get update -y 2>/dev/null || true
DEBIAN_FRONTEND=noninteractive apt-get install -y steamcmd 2>/dev/null || true
if ! command -v steamcmd >/dev/null 2>&1; then
  echo "[bootstrap] steamcmd not in apt — installing from Valve repo..."
  # Add Valve's official repo
  echo "deb http://repo.steampowered.com/steam/ stable steam" > /etc/apt/sources.list.d/steam.list
  curl -fsSL https://steamcdn-a.akamai.net/client/installer/steamcmd_linux.tar.gz | tar -xzf - -C /usr/local/bin/ 2>/dev/null || true
fi
if command -v steamcmd >/dev/null 2>&1; then
  echo "[bootstrap] steamcmd OK: $(command -v steamcmd)"
else
  echo "[bootstrap] WARNING: steamcmd not found — game downloads will fail!"
fi

# ── GStreamer (NVENC + software fallback) ───────────────────────────────
echo "[bootstrap] installing GStreamer..."
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav \
  libx11-dev xauth mesa-vulkan-drivers vulkan-tools libvulkan1 libegl1 \
  mesa-utils xdg-utils pulseaudio-utils pulseaudio \
  libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
  libssl-dev libcrypto++-dev 2>/dev/null || true

# ── Python agent deps ──────────────────────────────────────────────────
echo "[bootstrap] installing Python deps..."
python3 -m pip install --quiet -r "$AGENT_DIR/requirements.txt" 2>/dev/null || true

# ── Kill old agents ────────────────────────────────────────────────────
echo "[bootstrap] killing old agents..."
pkill -f "main.py" 2>/dev/null || true

# ── Generate wallpaper ─────────────────────────────────────────────────
python3 - <<'PY'
try:
    from PIL import Image, ImageDraw
    W,H=1920,1080
    img=Image.new("RGB",(W,H),(22,22,30))
    d=ImageDraw.Draw(img)
    for i in range(0,W,4):
        c=int(30+ (i/W)*40)
        d.line([(i,0),(i,H)],fill=(c,c,max(20,c-10)))
    img.save("/usr/share/backgrounds/luna-cloud.png")
    print("[bootstrap] wallpaper generated")
except Exception as e:
    print("[bootstrap] wallpaper skipped:", e)
PY

# ── Create non-root user for GUI apps ──────────────────────────────────
if ! id gamer >/dev/null 2>&1; then
  echo "[bootstrap] creating 'gamer' user..."
  useradd -m -s /bin/bash gamer 2>/dev/null || true
fi
usermod -aG video,audio,gamer gamer 2>/dev/null || true
mkdir -p /home/gamer/.config /home/gamer/.cache
chown -R gamer:gamer /home/gamer 2>/dev/null || true
export GAMER_USER=gamer

# ── Verify ─────────────────────────────────────────────────────────────
echo "[bootstrap] verifying components:"
for b in Xvfb x11vnc openbox steamcmd gst-launch-1.0; do
  if command -v "$b" >/dev/null 2>&1; then
    echo "  [OK]   $b"
  else
    echo "  [MISS] $b"
  fi
done

# ── Start agent ────────────────────────────────────────────────────────
echo "[bootstrap] starting agent (backend: ${LUNA_BACKEND_WS})..."
cd "$AGENT_DIR/agent"
nohup setsid bash -c \
  "while true; do cd '$AGENT_DIR/agent' && python3 main.py >> /tmp/luna-agent.log 2>&1; echo \"[supervisor] agent exited at \$(date), restarting in 3s\" >> /tmp/luna-agent.log; sleep 3; done" \
  > /dev/null 2>&1 < /dev/null &
SUP_PID=$!
echo "[bootstrap] agent supervisor started (PID $SUP_PID)"
sleep 2
if kill -0 "$SUP_PID" 2>/dev/null; then
  echo "[bootstrap] supervisor running — agent connecting..."
else
  echo "[bootstrap] WARNING: supervisor died — see /tmp/luna-agent.log"
fi

echo "[bootstrap] done. Tail logs: !tail -n 80 /tmp/luna-agent.log"
