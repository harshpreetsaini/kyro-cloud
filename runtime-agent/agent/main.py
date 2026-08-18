import os
import json
import time
import threading

import websocket  # websocket-client

from system import detect_gpu, system_info, collect_stats
import streaming
import apps

BACKEND_WS = os.environ.get("LUNA_BACKEND_WS", "ws://localhost:3000/agent")
TOKEN = os.environ.get("RUNTIME_AUTH_SECRET", "runtime-change-me")
RECONNECT = int(os.environ.get("LUNA_RECONNECT", "5"))
_running = True
_session_active = False
_ws = None


def url() -> str:
    sep = "?" if "?" not in BACKEND_WS else "&"
    return f"{BACKEND_WS}{sep}token={TOKEN}"


def send(ws, type_: str, payload=None):
    try:
        ws.send(json.dumps({"type": type_, "payload": payload}))
    except Exception:
        pass


def agent_send(type_: str, payload=None):
    """Send to the active backend websocket (set by on_open)."""
    if _ws is not None:
        send(_ws, type_, payload)


def stats_loop(ws):
    while _running:
        if _session_active:
            send(ws, "stats", collect_stats())
            send(ws, "system_info", system_info())
        time.sleep(2)


def on_open(ws):
    global _ws
    _ws = ws
    send(ws, "ready", {"gpu": detect_gpu(), "hostname": os.uname().nodename})
    send(ws, "app.list", apps.detect_apps())
    threading.Thread(target=stats_loop, args=(ws,), daemon=True).start()


def on_message(ws, raw):
    global _session_active
    try:
        msg = json.loads(raw)
    except Exception:
        return
    t = msg.get("type")
    p = msg.get("payload") or {}
    if t == "prepare_desktop":
        _session_active = True
        streaming.start_desktop(p.get("display", streaming.DISPLAY))
        send(ws, "desktop_ready", {})
    elif t == "start_stream":
        _session_active = True
        result = streaming.start_stream(p)
        if result.get("error"):
            send(ws, "error", result)
        else:
            send(ws, "stream_ready", result)
    elif t == "start_vnc":
        _session_active = True
        result = streaming.start_vnc(p)
        if result.get("error"):
            send(ws, "error", result)
        else:
            send(ws, "vnc_ready", result)
    elif t == "launch_game":
        streaming.launch_game(p)
        send(ws, "game.started", p)
    elif t == "detect_apps":
        send(ws, "app.list", apps.detect_apps())
    elif t == "launch_app":
        result = apps.launch_app(p.get("id"), agent_send)
        send(ws, "app.launch_result", {"id": p.get("id"), **result})
    elif t == "stop_app":
        result = apps.stop_app(p.get("id"), agent_send)
        send(ws, "app.stop_result", {"id": p.get("id"), **result})
    elif t == "stop":
        _session_active = False
        streaming.stop_all()
        apps.stop_all()
    elif t == "ping":
        send(ws, "pong", {})


def on_error(ws, err):
    print(f"[agent] error: {err}")


def on_close(ws, *args):
    print("[agent] disconnected")


def main():
    while _running:
        try:
            ws = websocket.WebSocketApp(
                url(),
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close,
            )
            ws.run_forever(reconnect=RECONNECT)
        except Exception as e:
            print(f"[agent] connection failed: {e}")
        time.sleep(RECONNECT)


if __name__ == "__main__":
    main()
