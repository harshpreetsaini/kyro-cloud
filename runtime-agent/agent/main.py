import os
import json
import time
import threading

import websocket  # websocket-client

from system import detect_gpu, system_info, collect_stats
import streaming

BACKEND_WS = os.environ.get("LUNA_BACKEND_WS", "ws://localhost:3000/agent")
TOKEN = os.environ.get("RUNTIME_AUTH_SECRET", "runtime-change-me")
RECONNECT = int(os.environ.get("LUNA_RECONNECT", "5"))
_running = True


def url() -> str:
    sep = "?" if "?" not in BACKEND_WS else "&"
    return f"{BACKEND_WS}{sep}token={TOKEN}"


def send(ws, type_: str, payload=None):
    try:
        ws.send(json.dumps({"type": type_, "payload": payload}))
    except Exception:
        pass


def stats_loop(ws):
    while _running:
        send(ws, "stats", collect_stats())
        send(ws, "system_info", system_info())
        time.sleep(2)


def on_open(ws):
    send(ws, "ready", {"gpu": detect_gpu(), "hostname": os.uname().nodename})
    threading.Thread(target=stats_loop, args=(ws,), daemon=True).start()


def on_message(ws, raw):
    try:
        msg = json.loads(raw)
    except Exception:
        return
    t = msg.get("type")
    p = msg.get("payload") or {}
    if t == "prepare_desktop":
        streaming.start_desktop(p.get("display", streaming.DISPLAY))
        send(ws, "desktop_ready", {})
    elif t == "start_stream":
        result = streaming.start_stream(p)
        if result.get("error"):
            send(ws, "error", result)
        else:
            send(ws, "stream_ready", result)
    elif t == "launch_game":
        streaming.launch_game(p)
        send(ws, "game.started", p)
    elif t == "stop":
        streaming.stop_all()
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
