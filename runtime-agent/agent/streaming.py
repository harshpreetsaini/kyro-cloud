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


def _display_up(display: str) -> bool:
    try:
        num = int(str(display).lstrip(":").split(".")[0])
        s = socket.create_connection(("127.0.0.1", 6000 + num), timeout=1)
        s.close()
        return True
    except Exception:
        return False


def start_desktop(display: str = DISPLAY) -> bool:
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
                print(f"[stream] {xvfb} not found, trying window manager without X server")
                XVFB_PROC = None
                return False
    else:
        print("[stream] X display already up, reusing it")

    # Launch a window manager on the virtual display
    env = dict(os.environ, DISPLAY=display)
    dbus = shutil.which("dbus-launch")

    def launch(cmd):
        # xfce4 needs a D-Bus session bus to come up cleanly; openbox does not.
        if dbus and cmd[0] != "openbox":
            return subprocess.Popen([dbus, *cmd], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    for wm in ("xfce4-session", "openbox", "lxsession", "gnome-session"):
        try:
            DESKTOP_PROC = launch([wm])
            time.sleep(4)
            if DESKTOP_PROC.poll() is None:
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
