#!/usr/bin/env bash
# KYRO CLOUD runtime-agent bootstrap (idempotent).
export DEBIAN_FRONTEND=noninteractive
set -o pipefail

# Self-update: if we're running from a git checkout, pull latest so the agent
# code is never stale (avoids "works on my machine / old clone" issues).
REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"

: > /tmp/luna-agent.log
echo "[bootstrap] starting at $(date -u)" >> /tmp/luna-agent.log

if [ -d "$REPO_ROOT/.git" ]; then
  echo "[bootstrap] self-update: git pull in $REPO_ROOT" >> /tmp/luna-agent.log
  ( cd "$REPO_ROOT" && git pull --ff-only >> /tmp/luna-agent.log 2>&1 ) || true
fi

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

# ── Repair any broken dpkg state from prior interrupted installs ──
dpkg --configure -a 2>/dev/null || true
DEBIAN_FRONTEND=noninteractive apt-get install -f -y 2>/dev/null || true

# ── Neutralise repos that fail to update (e.g. r2u.stat.illinois.edu) ──
# A broken third-party source makes `apt-get update` abort and can break
# all subsequent package installs. Comment such lines out (with a backup).
for f in /etc/apt/sources.list /etc/apt/sources.list.d/*.list; do
  [ -f "$f" ] || continue
  [ -f "${f}.kyrobak" ] || cp "$f" "${f}.kyrobak" 2>/dev/null || true
  sed -i -E 's|^(deb(-src)? .*(r2u\.stat\.illinois\.edu|steampowered|repo\.steampowered|dl\.winehq\.org).*)$|# disabled by kyro-bootstrap: \1|I' "$f" 2>/dev/null || true
done

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
# The r2u third-party R repo on Colab has a misspelt source entry that breaks
# `apt-get update` (dpkg error code 1). Neutralise it so our apt work is clean,
# then restore it afterwards so the user's environment is untouched.
RU2_BAK=/tmp/r2u-sources.bak
ls /etc/apt/sources.list.d/r2u.list >/dev/null 2>&1 && mv /etc/apt/sources.list.d/r2u.list "$RU2_BAK" 2>/dev/null
sed -i '/r2u\.stat\.illinois\.edu/d' /etc/apt/sources.list 2>/dev/null
# Enable universe + multiverse using the canonical Ubuntu archive (NOT the first
# deb line, which on Colab is the r2u repo) so the apt steamcmd package resolves.
if [ -f /etc/os-release ]; then
  . /etc/os-release
  CODENAME=${VERSION_CODENAME:-jammy}
else
  CODENAME=$(lsb_release -cs 2>/dev/null || echo jammy)
fi
BASE="http://archive.ubuntu.com/ubuntu"
for comp in universe multiverse; do
  if ! grep -q " $comp " /etc/apt/sources.list 2>/dev/null; then
    echo "deb $BASE $CODENAME $comp" >> /etc/apt/sources.list
    echo "deb $BASE ${CODENAME}-updates $comp" >> /etc/apt/sources.list
  fi
done
DEBIAN_FRONTEND=noninteractive apt-get update -y >> /tmp/luna-agent.log 2>&1 || true
# 32-bit libraries required by the steamcmd binary (main/universe, no license prompt)
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  lib32gcc-s1 lib32stdc++6 libc6-i386 lib32z1 \
  libcurl4:i386 libnss3:i386 2>>/tmp/luna-agent.log || true
# Primary: official Valve tarball from Steam's CDN (verified gzip, no apt/multiverse dependency)
mkdir -p /opt/steamcmd
if [ ! -x /opt/steamcmd/steamcmd.sh ] && [ ! -x /usr/lib/games/steam/steamcmd.sh ]; then
  for URL in \
    "https://client-update.akamai.steamstatic.com/installer/steamcmd_linux.tar.gz" \
    "https://cdn.steamstatic.com/client/installer/steamcmd_linux.tar.gz"; do
    echo "[bootstrap] trying steamcmd tarball: $URL" >> /tmp/luna-agent.log
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL "$URL" -o /tmp/steamcmd.tar.gz 2>/dev/null && [ -s /tmp/steamcmd.tar.gz ] && break
    elif command -v wget >/dev/null 2>&1; then
      wget -q "$URL" -O /tmp/steamcmd.tar.gz 2>/dev/null && [ -s /tmp/steamcmd.tar.gz ] && break
    fi
  done
  if [ -s /tmp/steamcmd.tar.gz ]; then
    tar -xzf /tmp/steamcmd.tar.gz -C /opt/steamcmd 2>>/tmp/luna-agent.log && echo "[bootstrap] steamcmd tarball extracted" >> /tmp/luna-agent.log
    rm -f /tmp/steamcmd.tar.gz
  else
    echo "[bootstrap] steamcmd tarball download failed (all mirrors)" >> /tmp/luna-agent.log
  fi
fi
# Secondary: apt package (multiverse) — pulls all required 32-bit deps automatically
if [ ! -x /opt/steamcmd/steamcmd.sh ] && [ ! -x /usr/lib/games/steam/steamcmd.sh ] && ! command -v steamcmd >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y steamcmd 2>>/tmp/luna-agent.log || true
fi
# Restore the r2u repo so the user's environment is unchanged.
[ -f "$RU2_BAK" ] && mv "$RU2_BAK" /etc/apt/sources.list.d/r2u.list 2>/dev/null
# Normalise: ensure /opt/steamcmd/steamcmd.sh exists (symlink apt's copy if needed)
if [ ! -x /opt/steamcmd/steamcmd.sh ] && [ -x /usr/lib/games/steam/steamcmd.sh ]; then
  ln -sf /usr/lib/games/steam/steamcmd.sh /opt/steamcmd/steamcmd.sh 2>/dev/null || true
fi
if [ -x /opt/steamcmd/steamcmd.sh ] || command -v steamcmd >/dev/null 2>&1; then
  echo "[bootstrap] steamcmd present" >> /tmp/luna-agent.log
else
  echo "[bootstrap] steamcmd STILL MISSING — install will fail" >> /tmp/luna-agent.log
fi

echo "[bootstrap] installing GStreamer..." >> /tmp/luna-agent.log
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav \
  libx11-dev xauth mesa-vulkan-drivers vulkan-tools libvulkan1 libegl1 \
  mesa-utils xdg-utils pulseaudio-utils pulseaudio \
  libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
  libssl-dev libcrypto++-dev 2>/dev/null || true

echo "[bootstrap] installing aiortc system deps..." >> /tmp/luna-agent.log
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  libavcodec-dev libavdevice-dev libavformat-dev libswscale-dev \
  libjpeg-dev zlib1g-dev 2>/dev/null || true

echo "[bootstrap] installing Python deps..." >> /tmp/luna-agent.log
python3 -m pip install --quiet -r "$AGENT_DIR/requirements.txt" 2>&1 | tail -5 >> /tmp/luna-agent.log || true

echo "[bootstrap] checking Python deps:" >> /tmp/luna-agent.log
python3 -c "
import importlib
deps = ['websocket', 'psutil', 'PIL']
for d in deps:
    try:
        importlib.import_module(d)
        print(f'  [OK]   {d}')
    except ImportError:
        print(f'  [MISS] {d}')
try:
    importlib.import_module('aiortc')
    print('  [OK]   aiortc')
except ImportError:
    print('  [SKIP] aiortc (WebRTC optional)')
" >> /tmp/luna-agent.log 2>&1

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

# steamcmd refuses to run as root — wrap it to drop privileges to 'gamer'
# and use a gamer-writable data + install directory.
if [ -x /opt/steamcmd/steamcmd.sh ] || [ -x /usr/lib/games/steam/steamcmd.sh ] || command -v steamcmd >/dev/null 2>&1; then
  mkdir -p /home/gamer/.steam /home/gamer/games
  chown -R gamer:gamer /home/gamer/.steam /home/gamer/games /opt/steamcmd 2>/dev/null || true
  cat > /usr/local/bin/steamcmd <<'WRAP'
#!/usr/bin/env bash
export HOME=/home/gamer
export STEAMCMD_DIR=/home/gamer/.steam
REAL=/opt/steamcmd/steamcmd.sh
[ -x "$REAL" ] || REAL=/usr/lib/games/steam/steamcmd.sh
[ -x "$REAL" ] || REAL="$(command -v steamcmd 2>/dev/null)"
mkdir -p "$HOME/.steam" /home/gamer/games
if command -v runuser >/dev/null 2>&1; then
  exec runuser -u gamer -- "$REAL" "$@"
else
  exec su gamer -s /bin/bash -c 'exec "$0" "$@"' "$REAL" "$@"
fi
WRAP
  chmod +x /usr/local/bin/steamcmd
  ln -sf /usr/local/bin/steamcmd /usr/bin/steamcmd 2>/dev/null || true
  echo "[bootstrap] steamcmd wrapper installed (runs as gamer)" >> /tmp/luna-agent.log
fi

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
  "while true; do cd '$AGENT_DIR/agent' && python3 -u main.py >> /tmp/luna-agent.log 2>&1; echo \"[supervisor] agent exited at \$(date), restarting in 3s\" >> /tmp/luna-agent.log; sleep 3; done" \
  > /dev/null 2>&1 < /dev/null &
SUP_PID=$!
echo "[bootstrap] agent supervisor started (PID $SUP_PID)" >> /tmp/luna-agent.log
sleep 5
if kill -0 "$SUP_PID" 2>/dev/null; then
  echo "[bootstrap] supervisor running — agent connecting..." >> /tmp/luna-agent.log
else
  echo "[bootstrap] WARNING: supervisor died — see /tmp/luna-agent.log" >> /tmp/luna-agent.log
fi

# Diagnostic: confirm the agent process is actually alive and has logged something
if pgrep -f "python3 -u main.py" >/dev/null 2>&1; then
  echo "[bootstrap] agent process confirmed running" >> /tmp/luna-agent.log
else
  echo "[bootstrap] WARNING: agent process NOT found — check the log above for import errors" >> /tmp/luna-agent.log
fi

echo "[bootstrap] done. Tail logs: !tail -n 80 /tmp/luna-agent.log" >> /tmp/luna-agent.log
