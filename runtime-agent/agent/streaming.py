import subprocess
import os
import time
import threading

DISPLAY = os.environ.get("LUNA_DISPLAY", ":1")
DESKTOP_PROC = None
STREAM_PROC = None


def start_desktop(display: str = DISPLAY) -> bool:
    global DESKTOP_PROC
    if DESKTOP_PROC and DESKTOP_PROC.poll() is None:
        return True
    env = dict(os.environ, DISPLAY=display)
    for wm in ("xfce4-session", "openbox", "lxsession", "gnome-session"):
        try:
            DESKTOP_PROC = subprocess.Popen(wm, env=env)
            time.sleep(2)
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


def stop_all() -> None:
    for p in (STREAM_PROC, DESKTOP_PROC):
        try:
            if p:
                p.terminate()
        except Exception:
            pass
