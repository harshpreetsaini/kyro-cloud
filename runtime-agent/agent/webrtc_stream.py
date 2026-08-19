import asyncio
import json
import os
import shutil
import subprocess
import threading
import websocket

try:
    from aiortc import RTCPeerConnection, VideoStreamTrack, RTCSessionDescription, RTCConfiguration, RTCIceServer
    from aiortc.mediastreams import MediaStreamTrack
    import mss

    _HAVE_AIORTC = True
except Exception as _e:  # pragma: no cover - optional dependency
    _HAVE_AIORTC = False
    _AIORTC_ERROR = _e

DISPLAY = os.environ.get("LUNA_DISPLAY", ":1")
_backend = os.environ.get("LUNA_BACKEND_WS", "ws://localhost:3000/agent")


class DisplayVideoTrack(VideoStreamTrack):
    """Captures the Colab Xvfb display and exposes it as a WebRTC video track."""

    kind = "video"

    def __init__(self, display=DISPLAY):
        super().__init__()
        self._sct = mss.mss(display=":" + display.lstrip(":").split(".")[0])
        self._monitor = self._sct.monitors[1]
        self._last = 0

    async def recv(self):
        from av import VideoFrame
        import time

        grab = self._sct.grab(self._monitor)
        img = self._sct.get_pixels(grab, "rgb24")
        frame = VideoFrame.from_ndarray(img, format="rgb24")
        now = time.time()
        frame.pts = int((now - self._start) * 90000)
        frame.time_base = 1 / 90000
        await asyncio.sleep(1 / 30.0)
        return frame


def start(payload=None) -> dict:
    """Connect to the Render signaling relay and negotiate a WebRTC peer
    connection that streams the desktop. Runs the asyncio loop in a thread."""
    if not _HAVE_AIORTC:
        return {"ok": False, "error": "aiortc not installed in Colab (pip install aiortc). WebRTC unavailable."}
    room = (payload or {}).get("room", "default")
    ice = (payload or {}).get("iceServers", [{"urls": "stun:stun.l.google.com:19302"}])
    token = os.environ.get("RUNTIME_AUTH_SECRET", "runtime-change-me")
    ws_url = "%s/signal?room=%s&role=agent&token=%s" % (
        _backend.replace("/agent", ""),
        room,
        token,
    )
    try:
        signaling = websocket.create_connection(ws_url, timeout=15)
    except Exception as e:
        return {"ok": False, "error": "WebRTC signaling connect failed: %s" % e}

    loop = asyncio.new_event_loop()
    pc = RTCPeerConnection(
        RTCConfiguration(iceServers=[RTCIceServer(urls=i["urls"]) for i in ice])
    )
    pc.addTrack(DisplayVideoTrack())

    def on_datachannel(dc):
        @dc.on("message")
        def on_msg(msg):
            try:
                _inject_input(msg)
            except Exception:
                pass

    pc.on("datachannel", on_datachannel)

    @pc.on("icecandidate")
    def on_ice(candidate):
        if candidate:
            try:
                signaling.send(json.dumps({"type": "candidate", "candidate": candidate.to_dict()}))
            except Exception:
                pass

    def run():
        loop.run_until_complete(_negotiate(loop, pc, signaling))

    t = threading.Thread(target=run, daemon=True)
    t.start()
    return {"ok": True, "room": room}


async def _negotiate(loop, pc, signaling):
    async def handle():
        while True:
            try:
                raw = signaling.recv()
            except Exception:
                return
            if not raw:
                return
            msg = json.loads(raw)
            if msg.get("type") == "offer":
                await pc.setRemoteDescription(RTCSessionDescription(sdp=msg["sdp"], type="offer"))
                answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                signaling.send(json.dumps({"type": "answer", "sdp": pc.localDescription.sdp}))
            elif msg.get("type") == "candidate" and msg.get("candidate"):
                from aiortc import RTCIceCandidate

                c = msg["candidate"]
                cand = RTCIceCandidate(
                    candidate=c.get("candidate"),
                    sdpMid=c.get("sdpMid"),
                    sdpMLineIndex=c.get("sdpMLineIndex"),
                )
                try:
                    await pc.addIceCandidate(cand)
                except Exception:
                    pass

    await handle()


def _inject_input(msg):
    """Translate browser input (over the WebRTC data channel) into X input
    events via xdotool.  Uses a persistent xdotool process with stdin pipe
    to avoid the cost of forking a new process per event."""
    import json
    import os

    if isinstance(msg, (bytes, bytearray)):
        msg = msg.decode("utf-8", "ignore")
    if isinstance(msg, str):
        try:
            msg = json.loads(msg)
        except Exception:
            return
    if not isinstance(msg, dict):
        return

    env = dict(os.environ, DISPLAY=DISPLAY)
    xdo = shutil.which("xdotool")
    if not xdo:
        return

    # Lazy-init: keep a single xdotool process alive for all events.
    proc = getattr(_inject_input, "_proc", None)
    if proc is None or proc.poll() is not None:
        proc = subprocess.Popen(
            [xdo, "-"],
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=env,
        )
        _inject_input._proc = proc

    t = msg.get("t")
    try:
        if t == "mmove":
            proc.stdin.write(f"mousemove {int(msg.get('x', 0))} {int(msg.get('y', 0))}\n".encode())
        elif t == "mdown":
            btn = {0: "1", 1: "2", 2: "3"}.get(msg.get("b", 0), "1")
            proc.stdin.write(f"mousedown {btn}\n".encode())
        elif t == "mup":
            btn = {0: "1", 1: "2", 2: "3"}.get(msg.get("b", 0), "1")
            proc.stdin.write(f"mouseup {btn}\n".encode())
        elif t == "wheel":
            proc.stdin.write(f"click {'4' if msg.get('d', 0) < 0 else '5'}\n".encode())
        elif t in ("kdown", "kup"):
            key = _xkey(msg.get("k"), msg.get("code"))
            if key:
                proc.stdin.write(f"{'keydown' if t == 'kdown' else 'keyup'} {key}\n".encode())
        proc.stdin.flush()
    except (BrokenPipeError, OSError):
        # Process died — will be recreated on next event.
        _inject_input._proc = None


def _xkey(k, code):
    """Map a browser key/code to an xdotool key name (best-effort)."""
    if not k:
        return None
    special = {
        " ": "space", "Enter": "Return", "Backspace": "BackSpace", "Tab": "Tab",
        "Escape": "Escape", "ArrowLeft": "Left", "ArrowRight": "Right",
        "ArrowUp": "Up", "ArrowDown": "Down", "Shift": "shift", "Control": "ctrl",
        "Alt": "alt", "Meta": "super", "Delete": "Delete", "Home": "Home",
        "End": "End", "PageUp": "Prior", "PageDown": "Next",
    }
    if k in special:
        return special[k]
    if len(k) == 1:
        return k
    # code like "KeyA" / "Digit1"
    if code and code.startswith("Key"):
        return code[3:].lower()
    if code and code.startswith("Digit"):
        return code[5:]
    return k


def stop_all():
    pass
