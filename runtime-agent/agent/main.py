import os
import json
import time
import threading

import websocket  # websocket-client

from system import detect_gpu, system_info, collect_stats
import streaming
import apps
import webrtc_stream

BACKEND_WS = os.environ.get("LUNA_BACKEND_WS", "ws://localhost:3000/agent")
TOKEN = os.environ.get("RUNTIME_AUTH_SECRET", "runtime-change-me")
RECONNECT = int(os.environ.get("LUNA_RECONNECT", "5"))
_running = True
_session_active = False
_ws = None
_terminal_procs = {}  # channel_id -> Popen


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
        # Send telemetry whenever the backend is connected so the Control panel
        # always reflects the real Colab hardware (CPU/GPU/RAM/Storage/network).
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

        def _do_prepare():
            try:
                ok = streaming.start_desktop(p.get("display", streaming.DISPLAY))
                if ok:
                    send(ws, "desktop_ready", {"ok": True})
                else:
                    send(
                        ws,
                        "desktop_ready",
                        {
                            "ok": False,
                            "error": "Could not start Xvfb / window manager. Re-run the bootstrap notebook so xvfb, openbox/xfce4 and x11vnc get installed.",
                        },
                    )
            except Exception as ex:
                send(ws, "desktop_ready", {"ok": False, "error": f"desktop start crashed: {ex}"})

        threading.Thread(target=_do_prepare, daemon=True).start()
    elif t == "start_stream":
        _session_active = True
        try:
            result = streaming.start_stream(p)
        except Exception as ex:
            result = {"ok": False, "error": f"start_stream crashed: {ex}"}
        if result.get("error"):
            send(ws, "error", result)
        else:
            send(ws, "stream_ready", result)
    elif t == "start_vnc":
        _session_active = True
        try:
            result = streaming.start_vnc(p)
        except Exception as ex:
            result = {"ok": False, "error": f"start_vnc crashed: {ex}"}
        # Always reply (with ok or a real error) so the backend never hangs waiting.
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
    elif t == "start_webrtc":
        _session_active = True
        try:
            result = webrtc_stream.start(p)
        except Exception as ex:
            result = {"ok": False, "error": f"start_webrtc crashed: {ex}"}
        send(ws, "webrtc_ready", result)
    elif t == "terminal.start":
        _terminal_start(p)
    elif t == "terminal.input":
        _terminal_input(p)
    elif t == "terminal.stop":
        _terminal_stop(p)
    elif t == "files.list":
        _files_list(p)
    elif t == "files.read":
        _files_read(p)
    elif t == "files.write":
        _files_write(p)
    elif t == "files.mkdir":
        _files_mkdir(p)
    elif t == "files.rename":
        _files_rename(p)
    elif t == "files.delete":
        _files_delete(p)
    elif t == "stop":
        _session_active = False
        streaming.stop_all()
        apps.stop_all()
        for ch_id, proc in list(_terminal_procs.items()):
            try:
                proc.terminate()
            except Exception:
                pass
        _terminal_procs.clear()
    elif t == "ping":
        send(ws, "pong", {})


def _terminal_start(p):
    """Start an interactive shell session on Colab for a terminal channel."""
    channel_id = p.get("channelId", "default")
    cwd = p.get("cwd", "/root")
    import subprocess as _sp
    try:
        proc = _sp.Popen(
            [os.environ.get("SHELL", "/bin/bash")],
            stdin=_sp.PIPE,
            stdout=_sp.PIPE,
            stderr=_sp.PIPE,
            cwd=cwd,
            env=dict(os.environ, TERM="xterm-256color"),
        )
        _terminal_procs[channel_id] = proc

        def _reader(f, stream_type):
            try:
                while True:
                    chunk = f.read(4096)
                    if not chunk:
                        break
                    agent_send("terminal.output", {
                        "channelId": channel_id,
                        stream_type: chunk.decode(errors="replace"),
                    })
            except Exception:
                pass

        threading.Thread(target=_reader, args=(proc.stdout, "stdout"), daemon=True).start()
        threading.Thread(target=_reader, args=(proc.stderr, "stderr"), daemon=True).start()
        agent_send("terminal.started", {"channelId": channel_id, "ok": True})
    except Exception as e:
        agent_send("terminal.started", {"channelId": channel_id, "ok": False, "error": str(e)})


def _terminal_input(p):
    """Write input to a running terminal channel on Colab."""
    channel_id = p.get("channelId", "default")
    data = p.get("data", "")
    proc = _terminal_procs.get(channel_id)
    if proc and proc.poll() is None:
        try:
            proc.stdin.write(data.encode())
            proc.stdin.flush()
        except Exception:
            pass


def _terminal_stop(p):
    """Stop a running terminal channel on Colab."""
    channel_id = p.get("channelId", "default")
    proc = _terminal_procs.pop(channel_id, None)
    if proc:
        try:
            proc.terminate()
        except Exception:
            pass


def _files_list(p):
    """List directory contents on Colab."""
    import pathlib
    rid = p.get("requestId", "")
    dirpath = p.get("path", "/")
    try:
        base = pathlib.Path(dirpath)
        items = []
        for entry in sorted(base.iterdir()):
            stat = entry.stat(follow_symlinks=False)
            items.append({
                "name": entry.name,
                "path": str(entry),
                "type": "directory" if entry.is_dir() else "file",
                "sizeBytes": stat.st_size if entry.is_file() else None,
                "modified": stat.st_mtime,
            })
        agent_send("files.result", {"requestId": rid, "ok": True, "items": items})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


def _files_read(p):
    """Read a file from Colab."""
    rid = p.get("requestId", "")
    fpath = p.get("path", "")
    try:
        with open(fpath, "rb") as f:
            data = f.read()
        agent_send("files.result", {"requestId": rid, "ok": True, "data": list(data)})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


def _files_write(p):
    """Write a file to Colab."""
    rid = p.get("requestId", "")
    fpath = p.get("path", "")
    content = p.get("content", [])
    try:
        with open(fpath, "wb") as f:
            f.write(bytes(content))
        agent_send("files.result", {"requestId": rid, "ok": True})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


def _files_mkdir(p):
    """Create a directory on Colab."""
    import pathlib
    rid = p.get("requestId", "")
    try:
        pathlib.Path(p.get("path", "/")).mkdir(parents=True, exist_ok=True)
        agent_send("files.result", {"requestId": rid, "ok": True})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


def _files_rename(p):
    """Rename a file/directory on Colab."""
    rid = p.get("requestId", "")
    try:
        import pathlib
        src = pathlib.Path(p.get("path", ""))
        dst = src.parent / p.get("newName", "")
        src.rename(dst)
        agent_send("files.result", {"requestId": rid, "ok": True})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


def _files_delete(p):
    """Delete a file or directory on Colab."""
    import pathlib, shutil
    rid = p.get("requestId", "")
    target = pathlib.Path(p.get("path", ""))
    try:
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()
        agent_send("files.result", {"requestId": rid, "ok": True})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


def on_error(ws, err):
    print(f"[agent] error: {err}")


def on_close(ws, *args):
    print("[agent] disconnected")


def main():
    print(
        f"[agent] starting — backend={BACKEND_WS} token={'set' if TOKEN and TOKEN != 'runtime-change-me' else 'MISSING (using default)'}"
    )
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
