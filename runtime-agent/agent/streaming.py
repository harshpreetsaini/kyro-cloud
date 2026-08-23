import subprocess
import os
import time
import threading
import socket
import shutil
import json
import websocket

DISPLAY = os.environ.get("LUNA_DISPLAY", ":1")
DESKTOP_PROC = None
STREAM_PROC = None
XVFB_PROC = None
VNC_TUNNEL = None
_GSTREAMER_proc = None
_selkies_proc = None
_gstreamer_fps = 0
_gstreamer_frame_count = 0
_gstreamer_last_fps_time = 0
_current_quality = None

# ── Centralized backend URL (imported from main.py at runtime) ──────────
BACKEND_WS = os.environ.get("LUNA_BACKEND_WS", "ws://localhost:3000/agent")
RUNTIME_AUTH_SECRET = os.environ.get("RUNTIME_AUTH_SECRET", "")
_tunnel_stop = threading.Event()  # signals tunnel threads to exit

# Quality presets: maps (resolution, quality) -> (width, height, bitrate_kbps, key_int_fps_mult)
QUALITY_PRESETS = {
    # (resolution_label, quality_label) -> (width, height, bitrate_kbps, key_int_multiplier)
    # Low latency / low quality
    ("720p", "low"):       (1280, 720,  2000, 0.5),
    ("720p", "balanced"):  (1280, 720,  3500, 0.5),
    ("720p", "high"):      (1280, 720,  5000, 1),
    # Medium
    ("900p", "low"):       (1600, 900,  3500, 0.5),
    ("900p", "balanced"):  (1600, 900,  5000, 1),
    ("900p", "high"):      (1600, 900,  7000, 1),
    # High
    ("1080p", "low"):      (1920, 1080, 5000, 1),
    ("1080p", "balanced"): (1920, 1080, 8000, 1),
    ("1080p", "high"):     (1920, 1080, 12000, 2),
    # Auto defaults to 1080p balanced
    ("Auto", "low"):       (1920, 1080, 5000, 1),
    ("Auto", "balanced"):  (1920, 1080, 8000, 1),
    ("Auto", "high"):      (1920, 1080, 12000, 2),
}

# Network-adaptive bitrate tiers (kbps) based on network quality
ADAPTIVE_BITRATE = {
    "excellent": {"720p": 5000, "900p": 7000, "1080p": 12000, "Auto": 12000},
    "good":      {"720p": 3500, "900p": 5000, "1080p": 8000,  "Auto": 8000},
    "fair":      {"720p": 2000, "900p": 3500, "1080p": 5000,  "Auto": 5000},
    "poor":      {"720p": 1500, "900p": 2000, "1080p": 3500,  "Auto": 3500},
    "unknown":   {"720p": 3500, "900p": 5000, "1080p": 8000,  "Auto": 8000},
}


def _display_up(display: str) -> bool:
    try:
        num = int(str(display).lstrip(":").split(".")[0])
        s = socket.create_connection(("127.0.0.1", 6000 + num), timeout=1)
        s.close()
        return True
    except Exception:
        return False


def start_desktop(display: str = DISPLAY) -> bool:
    """Start Xvfb and optionally a window manager.

    In headless mode (for cloud gaming), a WM is *optional* — apps render
    directly on the Xvfb framebuffer.  The function returns True as long as
    Xvfb is up, even when no WM could be started.
    """
    global DESKTOP_PROC, XVFB_PROC
    if DESKTOP_PROC and DESKTOP_PROC.poll() is None:
        return True

    # Always use :1 as the Colab virtual display
    display = ":1"

    # Start Xvfb first (virtual framebuffer) if not already running.
    xvfb = os.environ.get("LUNA_XVFB", "Xvfb")
    if not _display_up(display):
        xvfb_cmd = [xvfb, display, "-screen", "0", "1920x1080x24", "-ac", "-nolisten", "tcp"]
        if XVFB_PROC is None or XVFB_PROC.poll() is not None:
            try:
                XVFB_PROC = subprocess.Popen(xvfb_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(2)
                if XVFB_PROC.poll() is not None:
                    print("[stream] Xvfb exited immediately")
                    return False
            except FileNotFoundError:
                print(f"[stream] {xvfb} not found")
                XVFB_PROC = None
                return False
    else:
        print("[stream] X display already up, reusing it")

    # Try to launch a window manager, but do NOT fail if none are available —
    # headless cloud gaming works without a WM (apps render directly on Xvfb).
    env = dict(os.environ, DISPLAY=display)
    dbus = shutil.which("dbus-launch")

    def launch(cmd):
        if dbus and cmd[0] != "openbox":
            return subprocess.Popen([dbus, *cmd], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    wm_started = False
    for wm in ("openbox", "xfce4-session", "lxsession", "gnome-session"):
        try:
            DESKTOP_PROC = launch([wm])
            time.sleep(3)
            if DESKTOP_PROC.poll() is None:
                wm_started = True
                print(f"[stream] window manager {wm} started")
                break
        except FileNotFoundError:
            continue

    if not wm_started:
        print("[stream] no window manager available — headless mode (apps render directly)")

    # Paint a visible background so the desktop is never pure black.
    try:
        wp = "/usr/share/backgrounds/luna-cloud.png"
        if os.path.exists(wp) and shutil.which("feh"):
            subprocess.Popen(["feh", "--bg-scale", wp], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            subprocess.Popen(["xsetroot", "-solid", "#16161e"], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

    return True


def start_stream(payload: dict) -> dict:
    """Start the best available streaming pipeline.

    Priority: selkies-gstreamer (WebRTC, lowest latency) > custom GStreamer > VNC.
    Returns a signaling descriptor for the frontend client.
    """
    global _selkies_proc, STREAM_PROC

    # Try selkies-gstreamer first (best latency, hardware WebRTC)
    if shutil.which("selkies-gstreamer"):
        try:
            resolution = payload.get("resolution", "1080p")
            fps = payload.get("fps", 60)
            res_map = {"720p": "1280x720", "900p": "1600x900", "1080p": "1920x1080", "Auto": "1920x1080"}
            env = dict(os.environ, DISPLAY=DISPLAY)
            _selkies_proc = subprocess.Popen(
                ["selkies-gstreamer",
                 "--resolution", res_map.get(resolution, "1920x1080"),
                 "--fps", str(fps),
                 "--encoder", "nvh264enc" if shutil.which("nvh264enc") else "x264enc",
                 "--enable-audio"],
                env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            )
            STREAM_PROC = _selkies_proc
            time.sleep(2)
            if _selkies_proc.poll() is None:
                print("[stream] selkies-gstreamer started (lowest latency)")
                return {"ok": True, "mode": "selkies", "resolution": resolution, "fps": fps}
        except Exception as e:
            print(f"[stream] selkies-gstreamer failed: {e}")

    # Fall back to custom GStreamer pipeline
    return {"ok": True, "mode": "gstreamer", "resolution": payload.get("resolution", "1080p")}


# ── Game launching (native Linux + Windows-via-Proton) ─────────────────
def _largest_file(root: str, suffixes) -> str | None:
    best, best_size = None, 0
    for r, _dirs, files in os.walk(root):
        for f in files:
            if not f.lower().endswith(suffixes):
                continue
            p = os.path.join(r, f)
            try:
                sz = os.path.getsize(p)
            except OSError:
                continue
            if sz > best_size:
                best, best_size = p, sz
    return best


def _is_elf(path: str) -> bool:
    try:
        with open(path, "rb") as fh:
            return fh.read(4) == b"\x7fELF"
    except Exception:
        return False


def _resolve_game_target(payload: dict) -> dict:
    """Resolve {exe, mode} for a launch request. Windows titles (.exe under a
    directory marked .kyro_proton, or any .exe hit) run through umu-run
    (Proton); native ELF binaries exec directly. Returns {} when unresolvable."""
    game_id = str(payload.get("id") or "")
    app_id = str(payload.get("appId") or payload.get("steamAppId") or "")
    install_dir = payload.get("installDir") or (os.path.join("/home/gamer/games", game_id) if game_id else "")
    exe = payload.get("executable") or ""

    marker = os.path.join(install_dir, ".kyro_proton") if install_dir else ""

    if exe and os.path.isfile(exe):
        mode = "proton" if exe.lower().endswith(".exe") else "native"
        return {"exe": exe, "mode": mode, "installDir": install_dir or None}

    if install_dir and os.path.isdir(install_dir):
        is_proton = os.path.exists(marker)
        if is_proton:
            win_exe = _largest_file(install_dir, (".exe",))
            if win_exe:
                return {"exe": win_exe, "mode": "proton", "installDir": install_dir}
        # Native: prefer shell launchers, then the biggest ELF binary.
        for cand in ("start.sh", "launcher.sh"):
            p = os.path.join(install_dir, cand)
            if os.path.isfile(p):
                return {"exe": p, "mode": "sh", "installDir": install_dir}
        elfs = []
        for r, _d, files in os.walk(install_dir):
            for f in files:
                if f.lower().endswith((".so", ".pak", ".bin", ".dat", ".txt", ".json", ".xml", ".cfg")):
                    continue
                p = os.path.join(r, f)
                try:
                    if os.access(p, os.X_OK) and _is_elf(p):
                        elfs.append((os.path.getsize(p), p))
                except OSError:
                    continue
        if elfs:
            elfs.sort(reverse=True)
            return {"exe": elfs[0][1], "mode": "native", "installDir": install_dir}
        # A Windows tree without the marker: treat biggest .exe as Proton.
        win_exe = _largest_file(install_dir, (".exe",))
        if win_exe:
            return {"exe": win_exe, "mode": "proton", "installDir": install_dir}

    # Catalog fallback gave us a bare appId (no local install yet).
    if app_id.isdigit() or exe.isdigit():
        raise FileNotFoundError(
            f"No installed game found for '{payload.get('id')}' — install it first "
            f"(no executable can be resolved from appId '{exe or app_id}')."
        )
    if exe:
        raise FileNotFoundError(f"Executable '{exe}' does not exist on this machine.")
    raise FileNotFoundError("Launch request had neither an executable nor an installed game.")


def launch_game(payload: dict) -> dict:
    """Start a game process. Returns {'proc': Popen, 'mode': ...} so the caller
    can track/stop it. Windows titles run via umu-run (Proton) under the gamer
    user with a per-game WINEPREFIX."""
    tgt = _resolve_game_target(payload)
    exe = tgt["exe"]
    mode = tgt["mode"]
    install_dir = tgt.get("installDir")

    args = payload.get("arguments", "").split() if payload.get("arguments") else []
    env = dict(os.environ, DISPLAY=DISPLAY)

    if mode == "proton":
        app_id = str(payload.get("appId") or payload.get("steamAppId") or "0")
        prefix = os.path.join(install_dir or "/home/gamer/games/proton-prefixes", "compat")
        os.makedirs(prefix, exist_ok=True)
        try:
            subprocess.run(["chown", "-R", "gamer:gamer", prefix], check=False, timeout=30)
        except Exception:
            pass
        umu = shutil.which("umu-run")
        if not umu:
            raise FileNotFoundError("umu-run not installed — re-run the bootstrap notebook (Proton support)")
        cmd = ["runuser", "-u", "gamer", "--", "env",
               f"DISPLAY={DISPLAY}",
               f"STEAM_COMPAT_DATA_PATH={prefix}",
               f"WINEPREFIX={prefix}",
               f"GAMEID=umu-{app_id}",
               "UMU_NO_RUNTIME=" ,
               umu, exe] + args
    else:
        cmd = ["runuser", "-u", "gamer", "--", "env", f"DISPLAY={DISPLAY}", exe] + args

    print(f"[stream] launching ({mode}): {exe}", flush=True)
    proc = subprocess.Popen(cmd, cwd=install_dir or None, env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            start_new_session=True)
    return {"proc": proc, "mode": mode, "exe": exe}


def start_vnc(payload=None) -> dict:
    """Start x11vnc (mirroring the existing X display) on the Colab desktop and
    tunnel it to the backend over the agent's outbound /vnc WebSocket (no public
    ingress required)."""
    global STREAM_PROC, DESKTOP_PROC, XVFB_PROC, VNC_TUNNEL
    try:
        if not start_desktop():
            return {"ok": False, "error": "desktop environment failed to start"}
        x11vnc = shutil.which("x11vnc")
        if not x11vnc:
            return {"ok": False, "error": "x11vnc not installed — re-run the bootstrap notebook (apt install x11vnc)"}
        # Kill any stale x11vnc (e.g. left over from a previous agent run) that would
        # otherwise hold port 5901 and make the new one exit with "could not obtain
        # listening port".
        try:
            subprocess.run(["pkill", "-f", "x11vnc"], check=False, timeout=5)
        except Exception:
            pass
        time.sleep(1)
        # x11vnc mirrors the Xvfb display (:1) and serves VNC on 5901 (loopback only).
        args = [
            x11vnc, "-display", DISPLAY, "-rfbport", "5901", "-nopw", "-forever",
            "-localhost", "-quiet", "-shared", "-noshm",
        ]
        STREAM_PROC = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        # Wait for x11vnc to actually bind the VNC port before we start pumping,
        # otherwise noVNC would connect to an empty tunnel and show a black screen.
        vnc_sock = None
        for _ in range(40):
            time.sleep(0.5)
            if STREAM_PROC.poll() is not None:
                err = b""
                try:
                    err = STREAM_PROC.stderr.read()
                except Exception:
                    pass
                return {
                    "ok": False,
                    "error": "x11vnc exited (code %s): %s"
                    % (STREAM_PROC.returncode, err.decode(errors="replace")[:600]),
                }
            try:
                vnc_sock = socket.create_connection(("127.0.0.1", 5901), timeout=2)
                break
            except Exception:
                vnc_sock = None
        if vnc_sock is None:
            return {"ok": False, "error": "x11vnc did not open port 5901"}

        # Open the outbound tunnel to the backend /vnc endpoint.
        backend = BACKEND_WS.replace("/agent", "/vnc")
        token = RUNTIME_AUTH_SECRET
        ws_url = "%s?token=%s" % (backend, token)
        try:
            VNC_TUNNEL = websocket.create_connection(
                ws_url, timeout=15,
                suppress_origin=True,
            )
            # Enable TCP_NODELAY for zero-latency video forwarding
            if hasattr(VNC_TUNNEL, 'sock') and VNC_TUNNEL.sock:
                VNC_TUNNEL.sock.setsockopt(__import__('socket').IPPROTO_TCP, __import__('socket').TCP_NODELAY, 1)
        except Exception as e:
            return {"ok": False, "error": "VNC tunnel connect failed: %s" % e}
    except Exception as e:
        return {"ok": False, "error": "start_vnc failed: %s" % e}

    # Pump VNC TCP (127.0.0.1:5901) <-> tunnel WebSocket.
    s = vnc_sock
    tunnel = VNC_TUNNEL
    _tunnel_stop.clear()

    def vnc_to_ws():
        """Forward VNC frames to WebSocket with zero-copy optimization."""
        try:
            while not _tunnel_stop.is_set():
                data = s.recv(262144)  # 256KB chunks for large frames
                if not data:
                    break
                try:
                    tunnel.send(data, opcode=websocket.ABNF.OPCODE_BINARY)
                except Exception:
                    break
        except Exception:
            pass

    def ws_to_vnc():
        """Forward WebSocket commands to VNC socket."""
        try:
            while not _tunnel_stop.is_set():
                data = tunnel.recv()
                if data is None:
                    break
                if isinstance(data, str):
                    data = data.encode()
                try:
                    s.sendall(data)
                except Exception:
                    break
        except Exception:
            pass

    def _tunnel_keepalive():
        """Send WebSocket ping every 10s to prevent proxy timeout."""
        while not _tunnel_stop.is_set():
            time.sleep(10)
            if _tunnel_stop.is_set():
                return
            try:
                tunnel.ping()
            except Exception:
                break

    threading.Thread(target=vnc_to_ws, daemon=True).start()
    threading.Thread(target=ws_to_vnc, daemon=True).start()
    threading.Thread(target=_tunnel_keepalive, daemon=True).start()
    return {"ok": True}


def _detect_encoder():
    """Detect the best available H.264 encoder and screen capture source.
    Returns (encoder_element, capture_element, needs_parse)."""
    # Check if ximagesrc is available (needed for screen capture).
    capture = "ximagesrc"
    try:
        r = subprocess.run(["gst-inspect-1.0", "ximagesrc"], capture_output=True, timeout=5)
        if r.returncode != 0:
            # Try XShm variant.
            capture = "ximagesrc"
            print("[stream] ximagesrc not found — GStreamer screen capture unavailable")
    except Exception:
        pass

    # Try NVENC first (GPU hardware encoding — lowest latency).
    for enc in ("nvh264enc",):
        try:
            r = subprocess.run(["gst-inspect-1.0", enc], capture_output=True, timeout=5)
            if r.returncode == 0:
                return enc, capture, True
        except Exception:
            pass
    # Try VAAPI (AMD/Intel GPU).
    try:
        r = subprocess.run(["gst-inspect-1.0", "vaapih264enc"], capture_output=True, timeout=5)
        if r.returncode == 0:
            return "vaapih264enc", capture, True
    except Exception:
        pass
    # Fall back to x264enc (CPU software encoding — still much faster than x11vnc RFB).
    try:
        r = subprocess.run(["gst-inspect-1.0", "x264enc"], capture_output=True, timeout=5)
        if r.returncode == 0:
            return "x264enc", capture, True
    except Exception:
        pass
    return None, None, False


def _start_audio_capture(ws_tunnel):
    """Capture audio from PulseAudio and send Opus-encoded frames over the WebSocket.

    Audio packets are prefixed with 0x01 to distinguish them from video (0x00).
    Runs in a daemon thread — best effort, never raises."""
    def _audio_thread():
        try:
            proc = subprocess.Popen(
                [
                    "gst-launch-1.0", "-e",
                    "pulsesrc",
                    "!", "audio/x-raw,channels=2,rate=48000",
                    "!", "opusenc", "bitrate=128000", "complexity=0",
                    "!", "oggmux",
                    "!", "fdsink", "sync=false",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
            )
            while True:
                data = proc.stdout.read(4096)
                if not data:
                    break
                if ws_tunnel:
                    ws_tunnel.send(b"\x01" + data)
        except Exception:
            pass

    threading.Thread(target=_audio_thread, daemon=True).start()


def _resolve_quality_preset(resolution, quality, fps):
    """Resolve quality preset to (width, height, bitrate_kbps, key_int_multiplier)."""
    key = (resolution, quality)
    if key in QUALITY_PRESETS:
        w, h, br, kim = QUALITY_PRESETS[key]
    else:
        # Fallback to Auto balanced
        w, h, br, kim = QUALITY_PRESETS[("Auto", "balanced")]
    return w, h, br, kim


def adjust_quality(payload: dict) -> dict:
    """Adjust streaming quality at runtime by restarting the GStreamer pipeline.

    Supported payload keys:
      - resolution: "720p" | "900p" | "1080p" | "Auto"
      - quality: "low" | "balanced" | "high"
      - fps: 30 | 60
      - network_quality: "excellent" | "good" | "fair" | "poor" | "unknown"
        (auto-selects bitrate based on network conditions)
    """
    global _current_quality

    if not _GSTREAMER_proc or _GSTREAMER_proc.poll() is not None:
        return {"ok": False, "error": "GStreamer is not running"}

    # Determine target quality
    resolution = payload.get("resolution", _current_quality.get("resolution", "1080p") if _current_quality else "1080p")
    quality = payload.get("quality", _current_quality.get("quality", "balanced") if _current_quality else "balanced")
    fps = payload.get("fps", _current_quality.get("fps", 60) if _current_quality else 60)
    network_quality = payload.get("network_quality")

    # If network quality is provided, use adaptive bitrate mapping
    if network_quality and network_quality in ADAPTIVE_BITRATE:
        bitrate = ADAPTIVE_BITRATE[network_quality].get(resolution, 8000)
        print(f"[stream] Adaptive quality: network={network_quality}, bitrate={bitrate}kbps")
    else:
        _, _, bitrate, _ = _resolve_quality_preset(resolution, quality, fps)

    # Kill current pipeline
    try:
        _GSTREAMER_proc.terminate()
        _GSTREAMER_proc.wait(timeout=3)
    except Exception:
        try:
            _GSTREAMER_proc.kill()
        except Exception:
            pass

    # Restart with new quality settings
    new_payload = {
        "resolution": resolution,
        "quality": quality,
        "fps": fps,
    }
    result = start_gstreamer(new_payload)

    # Notify backend of quality change
    if result.get("ok") and VNC_TUNNEL:
        try:
            VNC_TUNNEL.send(json.dumps({
                "type": "gst-quality-changed",
                "resolution": resolution,
                "quality": quality,
                "fps": fps,
                "bitrate": result.get("bitrate", bitrate),
                "width": result.get("width"),
                "height": result.get("height"),
            }))
        except Exception:
            pass

    return result


def get_current_quality() -> dict:
    """Return the current streaming quality configuration."""
    if _current_quality:
        return {"ok": True, **_current_quality}
    return {"ok": False, "error": "No active stream"}


def start_gstreamer(payload=None) -> dict:
    """Start GPU-accelerated streaming via GStreamer.

    Captures the Xvfb display with ``ximagesrc``, encodes with NVENC (or
    software x264enc as fallback), and tunnels the raw H.264 bitstream to
    the backend over the agent's outbound WebSocket.  The browser decodes
    with WebCodecs — far lower latency than x11vnc + noVNC.

    Falls back to ``start_vnc()`` if GStreamer or a suitable encoder is
    unavailable.
    """
    global _GSTREAMER_proc, VNC_TUNNEL, STREAM_PROC, _current_quality

    if not start_desktop():
        return {"ok": False, "error": "desktop environment failed to start"}

    encoder, capture, needs_parse = _detect_encoder()
    if encoder is None:
        print("[stream] no GStreamer H.264 encoder found — falling back to VNC")
        return start_vnc(payload)

    payload = payload or {}
    fps = payload.get("fps", 60)
    resolution = payload.get("resolution", "1080p")
    quality = payload.get("quality", "balanced")

    # Resolve quality preset
    width, height, bitrate, key_int_mult = _resolve_quality_preset(resolution, quality, fps)
    _current_quality = {"resolution": resolution, "quality": quality, "fps": fps,
                        "width": width, "height": height, "bitrate": bitrate,
                        "encoder": encoder}

    # Build the GStreamer pipeline with ultra-low-latency settings.
    # Output: raw H.264 Annex-B byte stream to stdout (fdsink).
    if "nv" in encoder:
        enc_props = f"bitrate={bitrate} tune=zerolatency max-latency=0 preset=1 rc-mode=cbr"
    else:
        enc_props = f"bitrate={bitrate // 1000} speed-preset=ultrafast tune=zerolatency bframes=0 ref=1"
    key_int = max(int(fps * key_int_mult), 1)
    # Ultra-low-latency pipeline: sync=false on ALL elements, no queue buffering
    if "nv" in encoder:
        enc_props = f"bitrate={bitrate} tune=zerolatency max-latency=0 preset=1 rc-mode=cbr gpu-id=0"
    else:
        enc_props = f"bitrate={bitrate // 1000} speed-preset=ultrafast tune=zerolatency bframes=0 ref=1 threads=4"
    pipeline = (
        f"gst-launch-1.0 -e "
        f"{capture} display-name={DISPLAY} use-damage=false show-pointer=true "
        f"! video/x-raw,framerate={fps}/1 "
        f"! videoconvert n-threads=4 "
        f"! video/x-raw,format=I420,width={width},height={height} "
        f"! {encoder} {enc_props} key-int-max={key_int} threads=4 "
        f"! video/x-h264,stream-format=byte-stream,profile=baseline "
        f"! h264parse config-interval=-1 "
        f"! identity sync=false "
        f"! fdsink sync=false async=false"
    )

    print(f"[stream] GStreamer pipeline: {pipeline}")
    try:
        _GSTREAMER_proc = subprocess.Popen(
            pipeline.split(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except Exception as e:
        print(f"[stream] GStreamer failed to start: {e} — falling back to VNC")
        return start_vnc(payload)

    # Wait a moment for the pipeline to start producing frames.
    time.sleep(1)
    if _GSTREAMER_proc.poll() is not None:
        err = _GSTREAMER_proc.stderr.read().decode(errors="replace")[:500]
        print(f"[stream] GStreamer exited immediately: {err} — falling back to VNC")
        return start_vnc(payload)

    # Open the outbound tunnel to the backend /vnc endpoint.
    backend = BACKEND_WS.replace("/agent", "/vnc")
    token = RUNTIME_AUTH_SECRET
    ws_url = "%s?token=%s" % (backend, token)
    try:
        VNC_TUNNEL = websocket.create_connection(
            ws_url, timeout=15,
            suppress_origin=True,
        )
        # Enable TCP_NODELAY for zero-latency video forwarding
        if hasattr(VNC_TUNNEL, 'sock') and VNC_TUNNEL.sock:
            VNC_TUNNEL.sock.setsockopt(__import__('socket').IPPROTO_TCP, __import__('socket').TCP_NODELAY, 1)
    except Exception as e:
        _GSTREAMER_proc.terminate()
        _GSTREAMER_proc = None
        return {"ok": False, "error": "GStreamer tunnel connect failed: %s" % e}

    # Signal the backend that this is a raw H.264 stream (not VNC RFB).
    try:
        VNC_TUNNEL.send(json.dumps({
            "type": "gst-init", "encoder": encoder, "fps": fps,
            "width": width, "height": height, "bitrate": bitrate,
            "quality": quality, "resolution": resolution,
        }))
    except Exception:
        pass

    STREAM_PROC = _GSTREAMER_proc
    _tunnel_stop.clear()

    def _gst_to_ws():
        """Read encoded H.264 frames from GStreamer stdout and send over WebSocket."""
        global _gstreamer_fps, _gstreamer_frame_count, _gstreamer_last_fps_time
        _gstreamer_last_fps_time = time.time()
        _gstreamer_frame_count = 0
        tunnel = VNC_TUNNEL
        stdout = _GSTREAMER_proc.stdout
        frame_buf = b"\x00"
        try:
            while not _tunnel_stop.is_set():
                chunk = stdout.read(65536)
                if not chunk:
                    break
                _gstreamer_frame_count += 1
                now = time.time()
                if now - _gstreamer_last_fps_time >= 1.0:
                    _gstreamer_fps = _gstreamer_frame_count / (now - _gstreamer_last_fps_time)
                    _gstreamer_frame_count = 0
                    _gstreamer_last_fps_time = now
                if tunnel:
                    try:
                        tunnel.send(frame_buf + chunk, opcode=websocket.ABNF.OPCODE_BINARY)
                    except Exception:
                        break
        except Exception:
            pass

    def _gst_stderr():
        """Drain GStreamer stderr to prevent blocking."""
        try:
            while not _tunnel_stop.is_set():
                line = _GSTREAMER_proc.stderr.readline()
                if not line:
                    break
        except Exception:
            pass

    def _tunnel_keepalive():
        """Send WebSocket ping every 10s to prevent proxy timeout."""
        while not _tunnel_stop.is_set():
            time.sleep(10)
            if _tunnel_stop.is_set():
                return
            try:
                VNC_TUNNEL.ping()
            except Exception:
                break

    threading.Thread(target=_gst_to_ws, daemon=True).start()
    threading.Thread(target=_gst_stderr, daemon=True).start()
    threading.Thread(target=_tunnel_keepalive, daemon=True).start()

    # Start audio capture in a separate thread.
    _start_audio_capture(VNC_TUNNEL)

    # Watchdog: if GStreamer crashes within 5 seconds, fall back to VNC.
    def _gst_watchdog():
        time.sleep(5)
        if _GSTREAMER_proc and _GSTREAMER_proc.poll() is not None:
            err = ""
            try:
                err = _GSTREAMER_proc.stderr.read().decode(errors="replace")[:500]
            except Exception:
                pass
            print(f"[stream] GStreamer crashed after 5s (code {_GSTREAMER_proc.returncode}): {err}")
            print("[stream] falling back to VNC")
            try:
                VNC_TUNNEL.close()
            except Exception:
                pass
            start_vnc(payload)
    threading.Thread(target=_gst_watchdog, daemon=True).start()

    print(f"[stream] GStreamer GPU streaming started ({encoder}, {width}x{height}@{fps}fps, {bitrate}kbps)")
    return {"ok": True, "encoder": encoder, "mode": "gstreamer", "bitrate": bitrate,
            "width": width, "height": height, "fps": fps}


def stop_all() -> None:
    global VNC_TUNNEL, _GSTREAMER_proc, _selkies_proc
    _tunnel_stop.set()  # signal all tunnel threads to exit
    if VNC_TUNNEL:
        try:
            VNC_TUNNEL.close()
        except Exception:
            pass
        VNC_TUNNEL = None
    for p in (STREAM_PROC, DESKTOP_PROC, XVFB_PROC, _GSTREAMER_proc, _selkies_proc):
        try:
            if p:
                p.terminate()
        except Exception:
            pass
    _GSTREAMER_proc = None
    _selkies_proc = None
