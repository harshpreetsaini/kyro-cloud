#!/usr/bin/env bash
# LUNA CLOUD runtime-agent bootstrap (idempotent).
# Run inside the Colab runtime. Installs a real desktop + VNC + gaming apps,
# then starts the agent that connects to the Render backend.
export DEBIAN_FRONTEND=noninteractive
set -uo pipefail

# Robust defaults. `sudo` strips the environment, so the notebook must invoke this
# with `sudo -E`; these defaults also keep the script from dying on unset variables.
export LUNA_BACKEND_WS="${LUNA_BACKEND_WS:-wss://kyro-cloud-3fp0.onrender.com/agent}"
export RUNTIME_AUTH_SECRET="${RUNTIME_AUTH_SECRET:-runtime-change-me}"
export LUNA_DISPLAY="${LUNA_DISPLAY:-:1}"

# Pre-seed debconf answers so package installs never block on interactive prompts.
echo "keyboard-configuration keyboard-configuration/layout select 'English (US)'" | sudo debconf-set-selections 2>/dev/null || true
echo "keyboard-configuration keyboard-configuration/variant select 'English (US)'" | sudo debconf-set-selections 2>/dev/null || true
echo "console-setup console-setup/charmap47 select 'UTF-8'" | sudo debconf-set-selections 2>/dev/null || true

# Helper: install packages non-interactively. Colab runs as root, so `sudo` is
# usually a no-op; fall back to running directly if sudo is unavailable.
if command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
else
  SUDO=""
fi
apt_install() {
  $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y \
    -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" \
    "$@" 2>/dev/null \
    || DEBIAN_FRONTEND=noninteractive apt-get install -y \
       -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" \
       "$@" || true
}

AGENT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[bootstrap] updating apt (this may take 1-2 minutes)..."
$SUDO DEBIAN_FRONTEND=noninteractive apt-get update -y 2>/dev/null || apt-get update -y || true

# Repair any packages left half-configured by an interrupted/previous install.
$SUDO DEBIAN_FRONTEND=noninteractive dpkg --configure -a 2>/dev/null || dpkg --configure -a || true

echo "[bootstrap] installing desktop environment + VNC (this may take 3-5 minutes)..."
apt_install xfce4 xfce4-goodies xvfb tigervnc-standalone-server dbus-x11 x11vnc openbox feh
# Ensure openbox is available as a lightweight WM fallback
apt_install openbox

echo "[bootstrap] installing gaming + utility applications..."
apt_install firefox xterm pcmanfm thunar xfce4-settings xfce4-settings-manager xdotool

echo "[bootstrap] installing GStreamer + X11 capture (for WebRTC encode, best-effort)..."
apt_install gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav libx11-dev xauth
  steam lutris mesa-vulkan-drivers vulkan-tools libvulkan1 libegl1 \
  mesa-utils xdg-utils pulseaudio-utils

# Best-effort Heroic Games Launcher (Epic / GOG) via AppImage.
if command -v heroic >/dev/null 2>&1; then
  echo "[bootstrap] heroic already present."
elif [ -d /tmp ] && command -v curl >/dev/null 2>&1; then
  echo "[bootstrap] downloading Heroic Games Launcher AppImage (best-effort)..."
  curl -fsSL -o /opt/heroic.AppImage "https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest/download/Heroic-x86_64.AppImage" 2>/dev/null \
    && chmod +x /opt/heroic.AppImage 2>/dev/null \
    && ln -sf /opt/heroic.AppImage /usr/local/bin/heroic 2>/dev/null \
    && echo "[bootstrap] heroic installed." \
    || echo "[bootstrap] heroic download failed (optional) — Epic/GOG unavailable until installed."
fi

echo "[bootstrap] installing Python deps..."
python3 -m pip install --quiet -r "$AGENT_DIR/requirements.txt" || true

echo "[bootstrap] killing any old agents..."
pkill -f "python3 main.py" 2>/dev/null || true

# Generate a clean wallpaper so the desktop is never a pure-black void.
python3 - <<'PY'
import os
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
    print("[bootstrap] wallpaper gen skipped:", e)
PY

echo "[bootstrap] verifying installed components:"
for b in Xvfb x11vnc openbox xfce4-session firefox steam lutris heroic feh; do
  if command -v "$b" >/dev/null 2>&1; then
    echo "  [OK]   $b -> $(command -v $b)"
  else
    echo "  [MISS] $b"
  fi
done

echo "[bootstrap] starting agent (backend: ${LUNA_BACKEND_WS})..."
cd "$AGENT_DIR/agent"
nohup python3 main.py > /tmp/luna-agent.log 2>&1 & \
  echo "[bootstrap] agent started in background (PID $!)"

echo "[bootstrap] done. Tail logs: !tail -f /tmp/luna-agent.log"
