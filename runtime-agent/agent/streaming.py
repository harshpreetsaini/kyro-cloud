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
_gstreamer_fps = 0
_gstreamer_frame_count = 0
_gstreamer_last_fps_time = 0


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
    """Start the Selkies WebRTC streaming pipeline.

    Requires the selkies-gstreamer webrtc stack to be installed by the bootstrap.
    Returns a signaling descriptor for the frontend client.
    """
    global STREAM_PROC
    resolution = payload.get("resolution", "1080p")
    fps = payload.get("fps", 60)
    env = dict(os.environ, DISPLAY=DISPLAY)
    try:
        STREAM_PROC = subprocess.Popen(
            [
                "selkies-gstreamer",
                "--resolution",
                {"720p": "1280x720", "900p": "1600x900", "1080p": "1920x1080", "Auto": "1920x1080"}.get(
                    resolution, "1920x1080"
                ),
                "--fps",
                str(fps),
                "--webrtc",
            ],
            env=env,
        )
        return {
            "signalingUrl": os.environ.get("LUNA_SIGNALING_URL"),
            "iceServers": [{"urls": "stun:stun.l.google.com:19302"}],
        }
    except FileNotFoundError:
        return {"error": "selkies-gstreamer not installed"}


def launch_game(payload: dict) -> None:
    exe = payload.get("executable")
    if not exe:
        return
    env = dict(os.environ, DISPLAY=DISPLAY)
    subprocess.Popen(
        [exe] + (payload.get("arguments", "").split() if payload.get("arguments") else []),
        cwd=payload.get("workingDir"),
        env=env,
    )


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
        backend = os.environ.get("LUNA_BACKEND_WS", "wss://kyro-cloud-3fp0.onrender.com/agent").replace("/agent", "/vnc")
        token = os.environ.get("RUNTIME_AUTH_SECRET", "runtime-change-me")
        ws_url = "%s?token=%s" % (backend, token)
        try:
            VNC_TUNNEL = websocket.create_connection(ws_url, timeout=15)
        except Exception as e:
            return {"ok": False, "error": "VNC tunnel connect failed: %s" % e}
    except Exception as e:
        return {"ok": False, "error": "start_vnc failed: %s" % e}

    # Pump VNC TCP (127.0.0.1:5901) <-> tunnel WebSocket.
    s = vnc_sock
    def vnc_to_ws():
        try:
            while True:
                data = s.recv(65536)
                if not data:
                    break
                VNC_TUNNEL.send(data)
        except Exception:
            pass
    def ws_to_vnc():
        try:
            while True:
                data = VNC_TUNNEL.recv()
                if data is None:
                    break
                if isinstance(data, str):
                    data = data.encode()
                s.send(data)
        except Exception:
            pass
    threading.Thread(target=vnc_to_ws, daemon=True).start()
    threading.Thread(target=ws_to_vnc, daemon=True).start()
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


def start_gstreamer(payload=None) -> dict:
    """Start GPU-accelerated streaming via GStreamer.

    Captures the Xvfb display with ``ximagesrc``, encodes with NVENC (or
    software x264enc as fallback), and tunnels the raw H.264 bitstream to
    the backend over the agent's outbound WebSocket.  The browser decodes
    with WebCodecs — far lower latency than x11vnc + noVNC.

    Falls back to ``start_vnc()`` if GStreamer or a suitable encoder is
    unavailable.
    """
    global _GSTREAMER_proc, VNC_TUNNEL, STREAM_PROC

    if not start_desktop():
        return {"ok": False, "error": "desktop environment failed to start"}

    encoder, capture, needs_parse = _detect_encoder()
    if encoder is None:
        print("[stream] no GStreamer H.264 encoder found — falling back to VNC")
        return start_vnc(payload)

    payload = payload or {}
    fps = payload.get("fps", 60)
    width = payload.get("width", 1920)
    height = payload.get("height", 1080)

    # Build the GStreamer pipeline.
    # Output: raw H.264 Annex-B byte stream to stdout (fdsink).
    enc_props = "bitrate=8000 tune=zerolatency" if "nv" in encoder else "speed-preset=ultrafast tune=zerolatency"
    pipeline = (
        f"gst-launch-1.0 -e "
        f"{capture} display-name={DISPLAY} use-damage=false "
        f"! video/x-raw,framerate={fps}/1 "
        f"! videoconvert "
        f"! video/x-raw,format=I420,width={width},height={height} "
        f"! {encoder} {enc_props} key-int-max={fps * 2} "
        f"! video/x-h264,stream-format=byte-stream,profile=baseline "
        f"! h264parse "
        f"! fdsink sync=false"
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
    backend = os.environ.get("LUNA_BACKEND_WS", "wss://kyro-cloud-3fp0.onrender.com/agent").replace("/agent", "/vnc")
    token = os.environ.get("RUNTIME_AUTH_SECRET", "runtime-change-me")
    ws_url = "%s?token=%s" % (backend, token)
    try:
        VNC_TUNNEL = websocket.create_connection(ws_url, timeout=15)
    except Exception as e:
        _GSTREAMER_proc.terminate()
        _GSTREAMER_proc = None
        return {"ok": False, "error": "GStreamer tunnel connect failed: %s" % e}

    # Signal the backend that this is a raw H.264 stream (not VNC RFB).
    try:
        VNC_TUNNEL.send(json.dumps({"type": "gst-init", "encoder": encoder, "fps": fps, "width": width, "height": height}))
    except Exception:
        pass

    STREAM_PROC = _GSTREAMER_proc

    def _gst_to_ws():
        """Read encoded H.264 frames from GStreamer stdout and send over WebSocket."""
        global _gstreamer_fps, _gstreamer_frame_count, _gstreamer_last_fps_time
        _gstreamer_last_fps_time = time.time()
        _gstreamer_frame_count = 0
        try:
            while True:
                data = _GSTREAMER_proc.stdout.read(65536)
                if not data:
                    break
                _gstreamer_frame_count += 1
                # Calculate FPS every second.
                now = time.time()
                if now - _gstreamer_last_fps_time >= 1.0:
                    _gstreamer_fps = _gstreamer_frame_count / (now - _gstreamer_last_fps_time)
                    _gstreamer_frame_count = 0
                    _gstreamer_last_fps_time = now
                if VNC_TUNNEL:
                    # Prefix with 0x00 to mark as video data.
                    VNC_TUNNEL.send(b"\x00" + data)
        except Exception:
            pass

    def _gst_stderr():
        """Drain GStreamer stderr to prevent blocking."""
        try:
            while True:
                line = _GSTREAMER_proc.stderr.readline()
                if not line:
                    break
        except Exception:
            pass

    threading.Thread(target=_gst_to_ws, daemon=True).start()
    threading.Thread(target=_gst_stderr, daemon=True).start()

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

    print("[stream] GStreamer GPU streaming started (NVENC/x264)")
    return {"ok": True, "encoder": encoder, "mode": "gstreamer"}


def stop_all() -> None:
    global VNC_TUNNEL, _GSTREAMER_proc
    if VNC_TUNNEL:
        try:
            VNC_TUNNEL.close()
        except Exception:
            pass
        VNC_TUNNEL = None
    for p in (STREAM_PROC, DESKTOP_PROC, XVFB_PROC, _GSTREAMER_proc):
        try:
            if p:
                p.terminate()
        except Exception:
            pass
    _GSTREAMER_proc = None
