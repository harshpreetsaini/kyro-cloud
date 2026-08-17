import subprocess
import os
import time
import threading
import socket
import shutil
import websocket

DISPLAY = os.environ.get("LUNA_DISPLAY", ":1")
DESKTOP_PROC = None
STREAM_PROC = None
XVFB_PROC = None
VNC_TUNNEL = None


def start_desktop(display: str = DISPLAY) -> bool:
    global DESKTOP_PROC, XVFB_PROC
    if DESKTOP_PROC and DESKTOP_PROC.poll() is None:
        return True

    # Always use :1 as the Colab virtual display
    display = ":1"

    # Start Xvfb first (virtual framebuffer) if not already running
    xvfb = os.environ.get("LUNA_XVFB", "Xvfb")
    xvfb_cmd = [xvfb, display, "-screen", "0", "1920x1080x24", "-ac", "-nolisten", "tcp"]
    if XVFB_PROC is None or XVFB_PROC.poll() is not None:
        try:
            XVFB_PROC = subprocess.Popen(xvfb_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(2)
            if XVFB_PROC.poll() is not None:
                print("[stream] Xvfb exited immediately")
                return False
        except FileNotFoundError:
            print(f"[stream] {xvfb} not found, trying window manager without X server")
            XVFB_PROC = None

    # Launch a window manager on the virtual display
    env = dict(os.environ, DISPLAY=display)
    for wm in ("xfce4-session", "openbox", "lxsession", "gnome-session"):
        try:
            DESKTOP_PROC = subprocess.Popen(wm, env=env)
            time.sleep(3)
            if DESKTOP_PROC.poll() is None:
                return True
        except FileNotFoundError:
            continue
    return False


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
    if not start_desktop():
        return {"error": "desktop environment failed to start"}
    x11vnc = shutil.which("x11vnc")
    if not x11vnc:
        return {"error": "x11vnc not installed — re-run the bootstrap notebook"}
    # x11vnc mirrors the Xvfb display (:1) and serves VNC on 5901 (loopback only).
    STREAM_PROC = subprocess.Popen(
        [x11vnc, "-display", ":1", "-rfbport", "5901", "-nopw", "-forever", "-localhost", "-quiet"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(2)
    if STREAM_PROC.poll() is not None:
        return {"error": "x11vnc exited (code %s)" % STREAM_PROC.returncode}

    # Open the outbound tunnel to the backend /vnc endpoint.
    backend = os.environ.get("LUNA_BACKEND_WS", "wss://kyro-cloud-3fp0.onrender.com/agent").replace("/agent", "/vnc")
    token = os.environ.get("RUNTIME_AUTH_SECRET", "runtime-change-me")
    ws_url = "%s?token=%s" % (backend, token)
    try:
        VNC_TUNNEL = websocket.create_connection(ws_url)
    except Exception as e:
        return {"error": "VNC tunnel connect failed: %s" % e}

    # Pump VNC TCP (127.0.0.1:5901) <-> tunnel WebSocket.
    s = socket.create_connection(("127.0.0.1", 5901))
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


def stop_all() -> None:
    global VNC_TUNNEL
    if VNC_TUNNEL:
        try:
            VNC_TUNNEL.close()
        except Exception:
            pass
        VNC_TUNNEL = None
    for p in (STREAM_PROC, DESKTOP_PROC, XVFB_PROC):
        try:
            if p:
                p.terminate()
        except Exception:
            pass
