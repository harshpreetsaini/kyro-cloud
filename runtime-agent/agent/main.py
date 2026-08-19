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


def _cleanup_stale():
    """Kill leftover processes from a previous agent run (x11vnc, GStreamer,
    zombie window managers, orphaned bash shells).  Best-effort — never raises."""
    import subprocess as _sp
    for pat in ("x11vnc", "gst-launch-1.0", "selkies-gstreamer"):
        try:
            _sp.run(["pkill", "-f", pat], timeout=5, capture_output=True)
        except Exception:
            pass
    # Kill stale bash shells started by a previous agent (but not the current one).
    try:
        _sp.run(["pkill", "-f", "bash --login"], timeout=5, capture_output=True)
    except Exception:
        pass


def on_open(ws):
    global _ws
    _ws = ws
    _cleanup_stale()
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
    elif t == "start_gstreamer":
        _session_active = True
        try:
            result = streaming.start_gstreamer(p)
        except Exception as ex:
            result = {"ok": False, "error": f"start_gstreamer crashed: {ex}"}
        send(ws, "gst_ready", result)
    elif t == "adjust_quality":
        try:
            result = streaming.adjust_quality(p)
        except Exception as ex:
            result = {"ok": False, "error": f"adjust_quality crashed: {ex}"}
        send(ws, "quality_adjusted", result)
    elif t == "get_quality":
        try:
            result = streaming.get_current_quality()
        except Exception as ex:
            result = {"ok": False, "error": f"get_quality crashed: {ex}"}
        send(ws, "quality_info", result)
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
    elif t == "clipboard.get":
        _clipboard_get(p)
    elif t == "clipboard.set":
        _clipboard_set(p)
    elif t == "provider.login":
        _provider_login(ws, p)
    elif t == "provider.sync":
        _provider_sync(ws, p)
    elif t == "provider.logout":
        _provider_logout(ws, p)
    elif t == "game.install":
        _game_install(ws, p)
    elif t == "game.uninstall":
        _game_uninstall(ws, p)
    elif t == "stop":
        _session_active = False
        streaming.stop_all()
        apps.stop_all()
        for ch_id, rec in list(_terminal_procs.items()):
            try:
                fd = rec.get("fd") if isinstance(rec, dict) else None
                proc = rec.get("proc") if isinstance(rec, dict) else rec
                if fd is not None:
                    os.close(fd)
                if proc:
                    proc.terminate()
            except Exception:
                pass
        _terminal_procs.clear()
    elif t == "ping":
        send(ws, "pong", {})


def _terminal_start(p):
    """Start an interactive shell session on Colab for a terminal channel.

    Uses a PTY so bash behaves as if attached to a real terminal (prompts,
    line editing, job control).  Output is read from the master fd and
    forwarded to the browser.
    """
    channel_id = p.get("channelId", "default")
    cwd = p.get("cwd", "/root")
    import subprocess as _sp
    import pty
    import select
    import fcntl
    try:
        master_fd, slave_fd = pty.openpty()
        proc = _sp.Popen(
            [os.environ.get("SHELL", "/bin/bash"), "--login"],
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            cwd=cwd,
            env=dict(os.environ, TERM="xterm-256color", SHELL="/bin/bash"),
            close_fds=True,
        )
        os.close(slave_fd)
        # Set master_fd non-blocking so reads don't hang the thread.
        flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
        fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
        _terminal_procs[channel_id] = {"proc": proc, "fd": master_fd}

        def _read_pty():
            """Read from the PTY master and forward to the browser."""
            try:
                while proc.poll() is None:
                    try:
                        r, _, _ = select.select([master_fd], [], [], 0.1)
                        if r:
                            data = os.read(master_fd, 8192)
                            if data:
                                agent_send("terminal.output", {
                                    "channelId": channel_id,
                                    "stdout": data.decode(errors="replace"),
                                })
                            else:
                                break
                    except (OSError, ValueError):
                        break
            except Exception:
                pass

        threading.Thread(target=_read_pty, daemon=True).start()
        agent_send("terminal.started", {"channelId": channel_id, "ok": True})
    except Exception as e:
        agent_send("terminal.started", {"channelId": channel_id, "ok": False, "error": str(e)})


def _terminal_input(p):
    """Write input to a running terminal channel on Colab."""
    channel_id = p.get("channelId", "default")
    data = p.get("data", "")
    rec = _terminal_procs.get(channel_id)
    if not rec:
        return
    proc = rec.get("proc") if isinstance(rec, dict) else rec
    fd = rec.get("fd") if isinstance(rec, dict) else None
    if proc and proc.poll() is None:
        try:
            if fd is not None:
                os.write(fd, data.encode())
            elif proc.stdin:
                proc.stdin.write(data.encode())
                proc.stdin.flush()
        except Exception:
            pass


def _terminal_stop(p):
    """Stop a running terminal channel on Colab."""
    channel_id = p.get("channelId", "default")
    rec = _terminal_procs.pop(channel_id, None)
    if not rec:
        return
    proc = rec.get("proc") if isinstance(rec, dict) else rec
    fd = rec.get("fd") if isinstance(rec, dict) else None
    if fd is not None:
        try:
            os.close(fd)
        except Exception:
            pass
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


def _clipboard_get(p):
    """Get clipboard content from X11 display on Colab."""
    import subprocess
    rid = p.get("requestId", "")
    try:
        display = os.environ.get("DISPLAY", ":1")
        # Try xclip first
        result = subprocess.run(
            ["xclip", "-selection", "clipboard", "-o"],
            capture_output=True, text=True, timeout=5,
            env={**os.environ, "DISPLAY": display},
        )
        if result.returncode == 0:
            agent_send("clipboard.result", {"requestId": rid, "ok": True, "text": result.stdout})
        else:
            # xclip might fail if no selection; return empty
            agent_send("clipboard.result", {"requestId": rid, "ok": True, "text": ""})
    except FileNotFoundError:
        # xclip not installed, try xsel
        try:
            result = subprocess.run(
                ["xsel", "--clipboard", "--output"],
                capture_output=True, text=True, timeout=5,
                env={**os.environ, "DISPLAY": display},
            )
            agent_send("clipboard.result", {"requestId": rid, "ok": True, "text": result.stdout})
        except Exception as e:
            agent_send("clipboard.result", {"requestId": rid, "ok": False, "error": str(e)})
    except Exception as e:
        agent_send("clipboard.result", {"requestId": rid, "ok": False, "error": str(e)})


def _clipboard_set(p):
    """Set clipboard content on X11 display on Colab."""
    import subprocess
    rid = p.get("requestId", "")
    text = p.get("text", "")
    try:
        display = os.environ.get("DISPLAY", ":1")
        # Try xclip first
        result = subprocess.run(
            ["xclip", "-selection", "clipboard"],
            input=text, capture_output=True, text=True, timeout=5,
            env={**os.environ, "DISPLAY": display},
        )
        if result.returncode == 0:
            agent_send("clipboard.result", {"requestId": rid, "ok": True})
        else:
            agent_send("clipboard.result", {"requestId": rid, "ok": False, "error": result.stderr})
    except FileNotFoundError:
        # xclip not installed, try xsel
        try:
            result = subprocess.run(
                ["xsel", "--clipboard", "--input"],
                input=text, capture_output=True, text=True, timeout=5,
                env={**os.environ, "DISPLAY": display},
            )
            agent_send("clipboard.result", {"requestId": rid, "ok": True})
        except Exception as e:
            agent_send("clipboard.result", {"requestId": rid, "ok": False, "error": str(e)})
    except Exception as e:
        agent_send("clipboard.result", {"requestId": rid, "ok": False, "error": str(e)})


def _provider_login(ws, p):
    """Handle provider login (steamcmd, legendary, etc)."""
    import subprocess
    provider = p.get("provider", "steam")
    username = p.get("username", "")
    password = p.get("password", "")

    def _do_login():
        try:
            if provider == "steam":
                subprocess.run(["which", "steamcmd"], capture_output=True)
                result = subprocess.run(
                    ["steamcmd", "+login", username, password, "+quit"],
                    capture_output=True, text=True, timeout=120,
                )
                ok = "Steam account successfully logged in" in result.stdout or result.returncode == 0
                send(ws, "provider.login.result", {"provider": provider, "ok": ok, "username": username if ok else None, "error": None if ok else result.stdout[-500:]})
            elif provider == "epic":
                subprocess.run(["pip", "install", "legendary-gl"], capture_output=True)
                result = subprocess.run(
                    ["legendary", "auth", "--code", username],
                    capture_output=True, text=True, timeout=60,
                )
                ok = result.returncode == 0
                send(ws, "provider.login.result", {"provider": provider, "ok": ok, "username": username if ok else None})
            elif provider == "gog":
                subprocess.run(["pip", "install", "lgogdownloader"], capture_output=True)
                result = subprocess.run(
                    ["lgogdownloader", "--login"],
                    input=f"{username}\n{password}\n", capture_output=True, text=True, timeout=60,
                )
                ok = result.returncode == 0
                send(ws, "provider.login.result", {"provider": provider, "ok": ok, "username": username if ok else None})
            else:
                send(ws, "provider.login.result", {"provider": provider, "ok": False, "error": f"Provider {provider} not yet supported. Use the desktop client."})
        except Exception as ex:
            send(ws, "provider.login.result", {"provider": provider, "ok": False, "error": str(ex)})
    threading.Thread(target=_do_login, daemon=True).start()


def _provider_sync(ws, p):
    """Sync game library from a connected provider."""
    import subprocess
    provider = p.get("provider", "steam")

    def _do_sync():
        try:
            games = []
            if provider == "steam":
                result = subprocess.run(
                    ["steamcmd", "+login", "anonymous", "+apps_list", "+quit"],
                    capture_output=True, text=True, timeout=60,
                )
                for line in result.stdout.split("\n"):
                    line = line.strip()
                    if line and line[0].isdigit() and "\t" in line:
                        parts = line.split("\t", 1)
                        if len(parts) == 2:
                            games.append({"appId": parts[0], "name": parts[1]})
            elif provider == "epic":
                result = subprocess.run(
                    ["legendary", "list-games", "--csv"],
                    capture_output=True, text=True, timeout=60,
                )
                for line in result.stdout.strip().split("\n")[1:]:
                    parts = line.split(",")
                    if len(parts) >= 2:
                        games.append({"appId": parts[0], "name": parts[1]})
            send(ws, "provider.library", {"provider": provider, "games": games, "count": len(games)})
        except Exception as ex:
            send(ws, "provider.library", {"provider": provider, "games": [], "count": 0, "error": str(ex)})
    threading.Thread(target=_do_sync, daemon=True).start()


def _provider_logout(ws, p):
    """Logout from a provider."""
    provider = p.get("provider", "steam")
    send(ws, "provider.logout.result", {"provider": provider, "ok": True})


def _game_install(ws, p):
    """Install a game via the appropriate package manager."""
    import subprocess
    import re
    game_id = p.get("id", "")
    install_method = p.get("installMethod", "steamcmd")
    app_id = p.get("appId") or p.get("steamAppId", "")
    install_dir = p.get("installDir", "/root/games")

    def _send_progress(state, percent, downloaded=0, total=0, speed=0, eta=0):
        send(ws, "game.install.progress", {
            "gameId": game_id, "state": state,
            "percent": round(percent, 1), "downloadedBytes": downloaded,
            "totalBytes": total, "speedBytesPerSec": speed, "etaSeconds": eta,
        })

    def _do_install():
        try:
            os.makedirs(install_dir, exist_ok=True)
            _send_progress("checking", 0)

            if install_method == "steamcmd" and app_id:
                _send_progress("downloading", 0)
                cmd = ["steamcmd", "+login", "anonymous",
                       f"+app_update {app_id} validate", "+quit"]
                proc = subprocess.Popen(
                    cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                )
                percent = 0
                total_bytes = 0
                speed_bps = 0
                for line in proc.stdout:
                    lo = line.lower().strip()
                    # Parse "Downloaded X bytes (Y%)" or similar
                    dl_match = re.search(r'downloaded\s+([\d,]+)\s+bytes?\s*\((\d+)%\)', lo)
                    if dl_match:
                        downloaded = int(dl_match.group(1).replace(',', ''))
                        percent = float(dl_match.group(2))
                        _send_progress("downloading", percent, downloaded, total_bytes, speed_bps)
                        continue
                    # Parse "Progress: X% (Y / Z) @ Z/s, ETA: ..."
                    prog_match = re.search(r'progress:\s*(\d+(?:\.\d+)?)%', lo)
                    if prog_match:
                        percent = float(prog_match.group(1))
                        _send_progress("downloading", percent, 0, total_bytes, speed_bps)
                        continue
                    # Parse speed like "12.34 MB/s"
                    spd_match = re.search(r'([\d.]+)\s*(kb|mb|gb)/s', lo)
                    if spd_match:
                        val = float(spd_match.group(1))
                        unit = spd_match.group(2)
                        speed_bps = int(val * (1024**2) if unit == "mb" else val * 1024 if unit == "kb" else val * (1024**3))
                        continue
                    # Parse total size like "123456789 bytes" or "500.0 MBytes"
                    size_match = re.search(r'([\d,]+)\s*bytes?\s+to\s+download', lo)
                    if size_match:
                        total_bytes = int(size_match.group(1).replace(',', ''))
                        continue
                    # Fallback: heuristic progress on key lines
                    if any(k in lo for k in ("beginning download", "updating", "installing", "validating")):
                        percent = min(percent + 2, 95)
                        _send_progress("downloading", percent, 0, total_bytes, speed_bps)

                proc.wait()
                ok = proc.returncode == 0

            elif install_method == "legendary" and app_id:
                _send_progress("downloading", 0)
                cmd = ["legendary", "install", app_id, "--no-https", "--no-skip-dlcs"]
                proc = subprocess.Popen(
                    cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                )
                percent = 0
                for line in proc.stdout:
                    lo = line.lower().strip()
                    # Legendary outputs: "[DLManager] Downloading: X% (Y/Z) @ Z/s, ETA: ..."
                    prog_match = re.search(r'(\d+(?:\.\d+)?)%', lo)
                    if prog_match:
                        percent = float(prog_match.group(1))
                        _send_progress("downloading", percent)
                        continue
                    if any(k in lo for k in ("downloading", "installing", "extracting")):
                        percent = min(percent + 1, 95)
                        _send_progress("downloading", percent)

                proc.wait()
                ok = proc.returncode == 0

            elif install_method == "lgogdownloader" and app_id:
                _send_progress("downloading", 0)
                cmd = ["lgogdownloader", "--download", f"--id={app_id}", "--directory", install_dir]
                proc = subprocess.Popen(
                    cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                )
                percent = 0
                for line in proc.stdout:
                    lo = line.lower().strip()
                    prog_match = re.search(r'(\d+(?:\.\d+)?)%', lo)
                    if prog_match:
                        percent = float(prog_match.group(1))
                        _send_progress("downloading", percent)
                        continue
                    if any(k in lo for k in ("downloading", "installing")):
                        percent = min(percent + 1, 95)
                        _send_progress("downloading", percent)

                proc.wait()
                ok = proc.returncode == 0

            else:
                send(ws, "game.install.done", {
                    "gameId": game_id, "success": False,
                    "error": f"Install method '{install_method}' not available. Connect your gaming account first.",
                })
                return

            if ok:
                _send_progress("ready", 100)
                send(ws, "game.install.done", {"gameId": game_id, "success": True})
            else:
                send(ws, "game.install.done", {
                    "gameId": game_id, "success": False,
                    "error": "Installation failed — check the terminal for details",
                })
        except Exception as ex:
            send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": str(ex)})

    threading.Thread(target=_do_install, daemon=True).start()


def _game_uninstall(ws, p):
    """Uninstall a game."""
    game_id = p.get("id", "")
    send(ws, "game.install.done", {"gameId": game_id, "success": True})


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
