#!/usr/bin/env bash
# KYRO CLOUD runtime-agent bootstrap (idempotent).
export DEBIAN_FRONTEND=noninteractive
set -o pipefail

: > /tmp/luna-agent.log
echo "[bootstrap] starting at $(date -u)" >> /tmp/luna-agent.log

export LUNA_BACKEND_WS="${LUNA_BACKEND_WS:-wss://kyro-cloud-3fp0.onrender.com/agent}"
export RUNTIME_AUTH_SECRET="${RUNTIME_AUTH_SECRET:-runtime-change-me}"
export LUNA_DISPLAY="${LUNA_DISPLAY:-:1}"

if [ "$RUNTIME_AUTH_SECRET" = "runtime-change-me" ]; then
  echo "[bootstrap] WARNING: RUNTIME_AUTH_SECRET not set — agent may fail to authenticate" >> /tmp/luna-agent.log
fi

echo "keyboard-configuration keyboard-configuration/layout select 'English (US)'" | debconf-set-selections 2>/dev/null || true
echo "keyboard-configuration keyboard-configuration/variant select 'English (US)'" | debconf-set-selections 2>/dev/null || true
echo "console-setup console-setup/charmap47 select 'UTF-8'" | debconf-set-selections 2>/dev/null || true

AGENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[bootstrap] updating apt..." >> /tmp/luna-agent.log
DEBIAN_FRONTEND=noninteractive apt-get update -y 2>/dev/null || true
dpkg --configure -a 2>/dev/null || true
add-apt-repository -y universe 2>/dev/null || true
DEBIAN_FRONTEND=noninteractive apt-get update -y 2>/dev/null || true

echo "[bootstrap] installing desktop + VNC..." >> /tmp/luna-agent.log
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  xfce4 xvfb x11vnc openbox dbus-x11 feh \
  xterm xfce4-terminal thunar xdotool \
  wget curl ca-certificates 2>/dev/null || true

echo "[bootstrap] installing steamcmd..." >> /tmp/luna-agent.log
dpkg --add-architecture i386 2>/dev/null || true
DEBIAN_FRONTEND=noninteractive apt-get update -y 2>/dev/null || true
DEBIAN_FRONTEND=noninteractive apt-get install -y steamcmd 2>/dev/null || true
if ! command -v steamcmd >/dev/null 2>&1; then
  echo "deb http://repo.steampowered.com/steam/ stable steam" > /etc/apt/sources.list.d/steam.list
  curl -fsSL https://steamcdn-a.akamai.net/client/installer/steamcmd_linux.tar.gz | tar -xzf - -C /usr/local/bin/ 2>/dev/null || true
fi

echo "[bootstrap] installing GStreamer..." >> /tmp/luna-agent.log
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav \
  libx11-dev xauth mesa-vulkan-drivers vulkan-tools libvulkan1 libegl1 \
  mesa-utils xdg-utils pulseaudio-utils pulseaudio \
  libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
  libssl-dev libcrypto++-dev 2>/dev/null || true

echo "[bootstrap] installing Python deps..." >> /tmp/luna-agent.log
python3 -m pip install --quiet -r "$AGENT_DIR/requirements.txt" 2>/dev/null || true

echo "[bootstrap] killing old agents..." >> /tmp/luna-agent.log
pkill -f "main.py" 2>/dev/null || true

python3 - <<'PY' 2>/dev/null
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

if ! id gamer >/dev/null 2>&1; then
  echo "[bootstrap] creating 'gamer' user..." >> /tmp/luna-agent.log
  useradd -m -s /bin/bash gamer 2>/dev/null || true
fi
usermod -aG video,audio,gamer gamer 2>/dev/null || true
mkdir -p /home/gamer/.config /home/gamer/.cache
chown -R gamer:gamer /home/gamer 2>/dev/null || true

echo "[bootstrap] verifying components:" >> /tmp/luna-agent.log
for b in Xvfb x11vnc openbox steamcmd gst-launch-1.0; do
  if command -v "$b" >/dev/null 2>&1; then
    echo "  [OK]   $b" >> /tmp/luna-agent.log
  else
    echo "  [MISS] $b" >> /tmp/luna-agent.log
  fi
done

echo "[bootstrap] starting agent (backend: ${LUNA_BACKEND_WS})..." >> /tmp/luna-agent.log
cd "$AGENT_DIR/agent"
nohup setsid bash -c \
  "while true; do cd '$AGENT_DIR/agent' && python3 main.py >> /tmp/luna-agent.log 2>&1; echo \"[supervisor] agent exited at \$(date), restarting in 3s\" >> /tmp/luna-agent.log; sleep 3; done" \
  > /dev/null 2>&1 < /dev/null &
SUP_PID=$!
echo "[bootstrap] agent supervisor started (PID $SUP_PID)" >> /tmp/luna-agent.log
sleep 2
if kill -0 "$SUP_PID" 2>/dev/null; then
  echo "[bootstrap] supervisor running — agent connecting..." >> /tmp/luna-agent.log
else
  echo "[bootstrap] WARNING: supervisor died — see /tmp/luna-agent.log" >> /tmp/luna-agent.log
fi

echo "[bootstrap] done. Tail logs: !tail -n 80 /tmp/luna-agent.log" >> /tmp/luna-agent.log
