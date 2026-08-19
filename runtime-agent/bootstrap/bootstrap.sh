#!/usr/bin/env bash
# LUNA CLOUD runtime-agent bootstrap (idempotent).
# Run inside the Colab runtime. Installs a real desktop + VNC + gaming apps,
# then starts the agent that connects to the Render backend.
export DEBIAN_FRONTEND=noninteractive
set -uo pipefail

# Create the agent log immediately so we can tell (even from a failed run)
# whether the bootstrap executed at all. The agent appends to this file too.
: > /tmp/luna-agent.log
echo "[bootstrap] starting at $(date -u)" >> /tmp/luna-agent.log

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

# Enable the universe repository (provides Lutris, etc.) and refresh indexes.
$SUDO add-apt-repository -y universe 2>/dev/null \
  || $SUDO sed -i 's/^#\s*\(deb.*universe\)$/\1/' /etc/apt/sources.list 2>/dev/null \
  || true
$SUDO DEBIAN_FRONTEND=noninteractive apt-get update -y 2>/dev/null || apt-get update -y || true

echo "[bootstrap] installing desktop environment + VNC (this may take 3-5 minutes)..."
apt_install xfce4 xfce4-goodies xvfb tigervnc-standalone-server dbus-x11 x11vnc openbox feh
# Ensure openbox is available as a lightweight WM fallback
apt_install openbox

echo "[bootstrap] installing utility applications (terminal, file manager, settings)..."
apt_install xterm xfce4-terminal pcmanfm thunar xfce4-settings xfce4-settings-manager xdotool wget curl ca-certificates libfuse2 xclip xsel

# Firefox: apt is a snap transitional package on 22.04, so fall back to the
# official Mozilla tarball which always provides a real `firefox` binary.
install_firefox() {
  if command -v firefox >/dev/null 2>&1; then
    echo "[ok] firefox present"; return
  fi
  apt_install firefox 2>/dev/null || true
  if command -v firefox >/dev/null 2>&1; then
    echo "[ok] firefox via apt"; return
  fi
  echo "[bootstrap] apt firefox unavailable (snap) — downloading official build..."
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o /tmp/firefox.tar.bz2 "https://download.mozilla.org/?product=firefox-latest&os=linux64&lang=en-US" 2>/dev/null \
      && $SUDO tar -xjf /tmp/firefox.tar.bz2 -C /opt 2>/dev/null \
      && $SUDO ln -sf /opt/firefox/firefox /usr/local/bin/firefox 2>/dev/null \
      && echo "[ok] firefox via tarball" \
      || echo "[warn] firefox not installed"
  fi
}
install_firefox

# Steam: enable i386, try apt, fall back to the official Valve .deb.
install_steam() {
  if command -v steam >/dev/null 2>&1; then
    echo "[ok] steam present"; return
  fi
  $SUDO dpkg --add-architecture i386 2>/dev/null || dpkg --add-architecture i386 2>/dev/null || true
  $SUDO apt-get update -y 2>/dev/null || true
  apt_install steam 2>/dev/null || true
  if command -v steam >/dev/null 2>&1; then
    echo "[ok] steam via apt"; return
  fi
  echo "[bootstrap] apt steam unavailable — downloading official .deb..."
  if command -v curl >/dev/null 2>&1; then
    for url in \
      "https://cdn.cloudflare.steamstatic.com/client/installer/steam.deb" \
      "https://steamcdn-a.akamai.net/client/installer/steam.deb" \
      "https://cdn.steampowered.com/client/installer/steam.deb"; do
      if curl -fsSL -o /tmp/steam.deb "$url" 2>/dev/null && [ -s /tmp/steam.deb ]; then
        echo "[bootstrap] downloaded steam.deb from $url"
        break
      fi
    done
    if [ -s /tmp/steam.deb ]; then
      ($SUDO dpkg -i /tmp/steam.deb 2>/dev/null || dpkg -i /tmp/steam.deb 2>/dev/null || true) \
        && ($SUDO apt-get install -f -y 2>/dev/null || apt-get install -f -y 2>/dev/null || true)
    fi
  fi
  command -v steam >/dev/null 2>&1 && echo "[ok] steam via deb" || echo "[warn] steam not installed"
}
install_steam

echo "[bootstrap] installing GStreamer + GPU encoding (NVENC) + X11 capture..."
apt_install gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav libx11-dev xauth \
  mesa-vulkan-drivers vulkan-tools libvulkan1 libegl1 mesa-utils xdg-utils \
  pulseaudio-utils pulseaudio

# Try to install the NVENC GStreamer plugin (hardware GPU encoding).
# On Colab (Ubuntu 22.04) this is often gstreamer1.0-nvenc or available via
# the NVIDIA driver package.  If not available, GStreamer will fall back to
# x264enc (software) which still beats x11vnc's RFB protocol.
apt_install gstreamer1.0-nvenc 2>/dev/null \
  || apt_install libgstreamer-plugins-bad1.0-dev 2>/dev/null \
  || echo "[bootstrap] NVENC GStreamer plugin not in apt (will use software fallback or existing driver)"

# Ensure PulseAudio is running for audio capture.
pulseaudio --start --exit-idle-time=-1 2>/dev/null || true

echo "[bootstrap] installing Lutris..."
apt_install lutris 2>/dev/null || echo "[warn] lutris not installed"

echo "[bootstrap] installing Heroic Games Launcher (Epic / GOG)..."
if command -v heroic >/dev/null 2>&1; then
  echo "[ok] heroic present."
else
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o /opt/heroic.AppImage "https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest/download/Heroic-x86_64.AppImage" 2>/dev/null \
      && chmod +x /opt/heroic.AppImage 2>/dev/null \
      && ln -sf /opt/heroic.AppImage /usr/local/bin/heroic 2>/dev/null \
      && echo "[ok] heroic installed." \
      || echo "[warn] heroic download failed (optional) — Epic/GOG unavailable until installed."
  fi
fi

echo "[bootstrap] installing Python deps..."
python3 -m pip install --quiet -r "$AGENT_DIR/requirements.txt" || true

echo "[bootstrap] killing any old agents..."
pkill -f "main.py" 2>/dev/null || true

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
for b in Xvfb x11vnc openbox xfce4-session xterm firefox steam lutris heroic feh gst-launch-1.0 xclip; do
  if command -v "$b" >/dev/null 2>&1; then
    echo "  [OK]   $b -> $(command -v $b)"
  else
    echo "  [MISS] $b"
  fi
done

# Verify GStreamer encoding capabilities (NVENC vs software fallback).
echo "[bootstrap] GStreamer encoding check:"
if gst-inspect-1.0 nvh264enc >/dev/null 2>&1; then
  echo "  [OK]   nvh264enc (NVENC GPU encoding available)"
elif gst-inspect-1.0 x264enc >/dev/null 2>&1; then
  echo "  [OK]   x264enc (software fallback available)"
else
  echo "  [WARN] no H.264 encoder found — video streaming may not work"
fi

# Create a non-root user so GUI apps (Steam in particular) that refuse to run as
# root can be launched safely. The Xvfb display is started with -ac (no auth) so
# this user can connect to it.
if ! id gamer >/dev/null 2>&1; then
  echo "[bootstrap] creating 'gamer' user for GUI apps..."
  useradd -m -s /bin/bash gamer 2>/dev/null || useradd -m gamer 2>/dev/null || true
fi
usermod -aG video,audio,gamer gamer 2>/dev/null || true
mkdir -p /home/gamer/.config /home/gamer/.cache
chown -R gamer:gamer /home/gamer 2>/dev/null || true
export GAMER_USER=gamer

echo "[bootstrap] starting agent (backend: ${LUNA_BACKEND_WS})..."
cd "$AGENT_DIR/agent"
# Supervise the agent inside its own session (setsid) so Colab cannot reap it
# when this cell finishes, and wrap it in a restart loop so it comes back if it
# ever exits or crashes. stdin is redirected from /dev/null.
nohup setsid bash -c \
  "while true; do cd '$AGENT_DIR/agent' && python3 main.py >> /tmp/luna-agent.log 2>&1; echo \"[supervisor] agent exited at \$(date), restarting in 3s\" >> /tmp/luna-agent.log; sleep 3; done" \
  > /dev/null 2>&1 < /dev/null &
SUP_PID=$!
echo "[bootstrap] agent supervisor started (PID $SUP_PID)"
# Confirm the supervisor survived the fork before declaring success.
sleep 2
if kill -0 "$SUP_PID" 2>/dev/null; then
  echo "[bootstrap] supervisor is running — agent should connect within a few seconds."
else
  echo "[bootstrap] WARNING: supervisor did not stay up — see /tmp/luna-agent.log"
fi

echo "[bootstrap] done. Tail logs: !tail -n 80 /tmp/luna-agent.log"
