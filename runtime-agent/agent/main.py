import os
import json
import time
import threading
import random
import signal

import websocket  # websocket-client

from system import detect_gpu, system_info, collect_stats
import streaming
import apps
import webrtc_stream

# ── Centralized backend URL (single source of truth) ──────────────────
BACKEND_WS = os.environ.get("LUNA_BACKEND_WS", "ws://localhost:3000/agent")
TOKEN = os.environ.get("RUNTIME_AUTH_SECRET", "")
RECONNECT_BASE = int(os.environ.get("LUNA_RECONNECT", "5"))
RECONNECT_MAX = 60
STATS_INTERVAL = 2
PING_INTERVAL = 15
PING_TIMEOUT = 30

_running = True
_session_active = False
_ws = None
_ws_gen = 0
_stats_stop = None
_terminal_procs = {}
_agent_pids = []
_install_proc = None  # Currently running install subprocess (for cancellation)
_install_cancel = threading.Event()
_lock = threading.Lock()  # Protects _terminal_procs, _agent_pids
_send_lock = threading.Lock()  # Serializes websocket sends across threads
_steam_guard = {}  # requestId -> {"event": Event, "code": str}


def url() -> str:
    sep = "?" if "?" not in BACKEND_WS else "&"
    return f"{BACKEND_WS}{sep}token={TOKEN}"


def send(ws, type_: str, payload=None):
    try:
        with _send_lock:
            ws.send(json.dumps({"type": type_, "payload": payload}))
    except websocket.WebSocketConnectionClosedException:
        print(f"[agent] send failed: connection closed (type={type_})")
    except Exception as e:
        print(f"[agent] send error: {e} (type={type_})")


def agent_send(type_: str, payload=None):
    """Send to the active backend websocket (set by on_open)."""
    if _ws is not None:
        send(_ws, type_, payload)


_GUARD_SEQ = [0]


def _is_steam_guard_prompt(lo: str) -> bool:
    """steamcmd prints the guard prompt split across lines, e.g.
    '...enter the Steam Guard' / ' code from that message.' — so match the
    stable phrases rather than the contiguous 'steam guard code'."""
    return "steam guard" in lo and (
        "not been authenticated" in lo
        or "enter the steam guard" in lo
        or "guard code" in lo
    )


def _request_steam_guard(request_prefix: str, timeout: int = 180) -> str:
    """Ask the frontend for a Steam Guard code and block until it arrives."""
    _GUARD_SEQ[0] += 1
    rid = f"{request_prefix}-{_GUARD_SEQ[0]}"
    ev = threading.Event()
    _steam_guard[rid] = {"event": ev, "code": ""}
    agent_send("steam.guard", {"requestId": rid})
    ev.wait(timeout=timeout)
    rec = _steam_guard.pop(rid, {"code": ""})
    return (rec.get("code") or "").strip()


def _start_stats(ws, gen):
    """Start a new stats loop, stopping any previous one."""
    global _stats_stop
    if _stats_stop:
        _stats_stop.set()
    stop_event = threading.Event()
    _stats_stop = stop_event
    def _loop():
        while _running and _ws_gen == gen and not stop_event.is_set():
            try:
                send(ws, "stats", collect_stats())
                send(ws, "system_info", system_info())
            except Exception as e:
                print(f"[agent] stats error: {e}")
            for _ in range(STATS_INTERVAL * 5):
                if stop_event.is_set() or _ws_gen != gen:
                    return
                time.sleep(0.2)
    threading.Thread(target=_loop, daemon=True).start()


# ── Keepalive / watchdog (detects dead sockets proactively) ──────────
_last_pong = {"t": 0.0}

def _force_close(ws):
    """Force the underlying socket closed so run_forever exits and the
    agent's reconnect loop kicks in."""
    try:
        ws.close()
    except Exception:
        pass
    try:
        if getattr(ws, "sock", None):
            ws.sock.close()
    except Exception:
        pass

def _keepalive_loop(ws, gen):
    """Send application-level pings; if no pong arrives within PING_TIMEOUT,
    force the socket closed so run_forever exits and the agent reconnects."""
    global _last_pong
    _last_pong["t"] = time.time()
    while _running and _ws_gen == gen:
        time.sleep(PING_INTERVAL)
        if _ws_gen != gen:
            return
        try:
            send(ws, "ping", {"ts": int(time.time() * 1000)})
        except Exception:
            print("[agent] keepalive send failed — connection may be dead")
            _force_close(ws)
            return
        if time.time() - _last_pong["t"] > PING_TIMEOUT:
            print("[agent] no pong within timeout — forcing reconnect")
            _force_close(ws)
            return


# ── Cleanup ────────────────────────────────────────────────────────────
def _cleanup_stale():
    """Kill leftover processes from a previous agent run. Only kills our own PIDs."""
    import subprocess as _sp
    for pat in ("x11vnc", "gst-launch-1.0", "selkies-gstreamer"):
        try:
            _sp.run(["pkill", "-f", pat], timeout=5, capture_output=True)
        except Exception:
            pass
    # Kill only processes we tracked
    for pid in _agent_pids:
        try:
            os.kill(pid, 9)
        except (ProcessLookupError, PermissionError):
            pass
    _agent_pids.clear()


# ── WebSocket handlers ─────────────────────────────────────────────────
def on_open(ws):
    global _ws, _ws_gen, _session_active
    _ws = ws
    _ws_gen += 1
    _session_active = False
    gen = _ws_gen
    print(f"[agent] connected (gen={gen})", flush=True)
    _last_pong["t"] = time.time()
    if not TOKEN or TOKEN == "runtime-change-me":
        print("[agent] WARNING: RUNTIME_AUTH_SECRET is not set! Agent will fail to authenticate.")
    _cleanup_stale()
    send(ws, "ready", {"gpu": detect_gpu(), "hostname": os.uname().nodename})
    send(ws, "app.list", apps.detect_apps())
    _start_stats(ws, gen)
    threading.Thread(target=_keepalive_loop, args=(ws, gen), daemon=True).start()


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
                send(ws, "desktop_ready", {"ok": ok, **({} if ok else {"error": "Could not start Xvfb / window manager."})})
            except Exception as ex:
                send(ws, "desktop_ready", {"ok": False, "error": f"desktop start crashed: {ex}"})
        threading.Thread(target=_do_prepare, daemon=True).start()
    elif t == "start_stream":
        _session_active = True
        try:
            result = streaming.start_stream(p)
        except Exception as ex:
            result = {"ok": False, "error": f"start_stream crashed: {ex}"}
        send(ws, "stream_ready" if not result.get("error") else "error", result)
    elif t == "start_vnc":
        _session_active = True
        try:
            result = streaming.start_vnc(p)
        except Exception as ex:
            result = {"ok": False, "error": f"start_vnc crashed: {ex}"}
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
        # Run in a background thread so the WS loop stays responsive
        # (e.g. to receive the Steam Guard code mid-login).
        threading.Thread(target=_game_install, args=(ws, p), daemon=True).start()
    elif t == "game.uninstall":
        _game_uninstall(ws, p)
    elif t == "game.install.cancel":
        _game_install_cancel(ws, p)
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
    elif t == "pong":
        _last_pong["t"] = time.time()
    elif t == "ping":
        send(ws, "pong", {})
    elif t == "steam.guard.code":
        rid = p.get("requestId")
        rec = _steam_guard.get(rid)
        if rec:
            rec["code"] = p.get("code", "")
            rec["event"].set()


# ── Terminal / Files / Clipboard (unchanged) ───────────────────────────
def _terminal_start(p):
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
            stdin=slave_fd, stdout=slave_fd, stderr=slave_fd,
            cwd=cwd,
            env=dict(os.environ, TERM="xterm-256color", SHELL="/bin/bash"),
            close_fds=True,
        )
        _agent_pids.append(proc.pid)
        os.close(slave_fd)
        flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
        fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
        _terminal_procs[channel_id] = {"proc": proc, "fd": master_fd}
        def _read_pty():
            try:
                while proc.poll() is None:
                    try:
                        r, _, _ = select.select([master_fd], [], [], 0.1)
                        if r:
                            data = os.read(master_fd, 8192)
                            if data:
                                agent_send("terminal.output", {"channelId": channel_id, "stdout": data.decode(errors="replace")})
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
    import pathlib
    rid = p.get("requestId", "")
    try:
        items = []
        for entry in sorted(pathlib.Path(p.get("path", "/")).iterdir()):
            stat = entry.stat(follow_symlinks=False)
            items.append({"name": entry.name, "path": str(entry), "type": "directory" if entry.is_dir() else "file", "sizeBytes": stat.st_size if entry.is_file() else None, "modified": stat.st_mtime})
        agent_send("files.result", {"requestId": rid, "ok": True, "items": items})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


ALLOWED_PATHS = ["/root", "/tmp", "/home", "/opt", "/var/tmp"]

def _safe_path(p: str) -> str | None:
    """Validate a path is within allowed directories. Returns resolved path or None."""
    import pathlib
    resolved = str(pathlib.Path(p).resolve())
    if any(resolved.startswith(r) for r in ALLOWED_PATHS):
        return resolved
    return None


def _files_read(p):
    rid = p.get("requestId", "")
    path = _safe_path(p.get("path", ""))
    if not path:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": "Path not allowed"})
        return
    try:
        if os.path.getsize(path) > 10 * 1024 * 1024:
            agent_send("files.result", {"requestId": rid, "ok": False, "error": "File too large (>10MB)"})
            return
        with open(path, "rb") as f:
            data = f.read()
        agent_send("files.result", {"requestId": rid, "ok": True, "data": list(data)})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


def _files_write(p):
    rid = p.get("requestId", "")
    path = _safe_path(p.get("path", ""))
    if not path:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": "Path not allowed"})
        return
    try:
        with open(path, "wb") as f:
            f.write(bytes(p.get("content", [])))
        agent_send("files.result", {"requestId": rid, "ok": True})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


def _files_mkdir(p):
    import pathlib
    rid = p.get("requestId", "")
    path = _safe_path(p.get("path", "/"))
    if not path:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": "Path not allowed"})
        return
    try:
        pathlib.Path(path).mkdir(parents=True, exist_ok=True)
        agent_send("files.result", {"requestId": rid, "ok": True})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


def _files_rename(p):
    rid = p.get("requestId", "")
    src = _safe_path(p.get("path", ""))
    if not src:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": "Path not allowed"})
        return
    try:
        import pathlib
        s = pathlib.Path(src)
        s.rename(s.parent / p.get("newName", ""))
        agent_send("files.result", {"requestId": rid, "ok": True})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


def _files_delete(p):
    import pathlib, shutil
    rid = p.get("requestId", "")
    path = _safe_path(p.get("path", ""))
    if not path:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": "Path not allowed"})
        return
    if path in ("/", "/root", "/home", "/etc", "/usr", "/var"):
        agent_send("files.result", {"requestId": rid, "ok": False, "error": "Cannot delete system directory"})
        return
    target = pathlib.Path(path)
    try:
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()
        agent_send("files.result", {"requestId": rid, "ok": True})
    except Exception as e:
        agent_send("files.result", {"requestId": rid, "ok": False, "error": str(e)})


def _clipboard_get(p):
    import subprocess
    rid = p.get("requestId", "")
    display = os.environ.get("DISPLAY", ":1")
    for cmd in (["xclip", "-selection", "clipboard", "-o"], ["xsel", "--clipboard", "--output"]):
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5, env={**os.environ, "DISPLAY": display})
            if result.returncode == 0:
                agent_send("clipboard.result", {"requestId": rid, "ok": True, "text": result.stdout})
                return
        except FileNotFoundError:
            continue
        except Exception:
            break
    agent_send("clipboard.result", {"requestId": rid, "ok": True, "text": ""})


def _clipboard_set(p):
    import subprocess
    rid = p.get("requestId", "")
    text = p.get("text", "")
    display = os.environ.get("DISPLAY", ":1")
    for cmd in (["xclip", "-selection", "clipboard"], ["xsel", "--clipboard", "--input"]):
        try:
            result = subprocess.run(cmd, input=text, capture_output=True, text=True, timeout=5, env={**os.environ, "DISPLAY": display})
            if result.returncode == 0:
                agent_send("clipboard.result", {"requestId": rid, "ok": True})
                return
        except FileNotFoundError:
            continue
        except Exception:
            break
    agent_send("clipboard.result", {"requestId": rid, "ok": False, "error": "no clipboard tool available"})


# ── Provider handlers ──────────────────────────────────────────────────
def _provider_login(ws, p):
    import subprocess
    provider = p.get("provider", "steam")
    username = p.get("username", "")
    password = p.get("password", "")
    def _do_login():
        try:
            if provider == "steam":
                import subprocess
                ok = False
                err = None
                try:
                    proc = subprocess.Popen(
                        ["stdbuf", "-oL", "-eL", "steamcmd", "+login", username, password],
                        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT, text=True, bufsize=1)
                    gseq = [0]
                    for line in proc.stdout:
                        if "Steam account successfully logged in" in line:
                            ok = True
                            break
                        lo = line.lower()
                        if _is_steam_guard_prompt(lo):
                            gseq[0] += 1
                            code = _request_steam_guard(f"login-{username}")
                            if code and proc.stdin:
                                try:
                                    proc.stdin.write(code + "\n")
                                    proc.stdin.flush()
                                except Exception:
                                    pass
                            continue
                    try:
                        if proc.stdin:
                            proc.stdin.write("+quit\n")
                            proc.stdin.flush()
                    except Exception:
                        pass
                    try:
                        proc.wait(timeout=30)
                    except Exception:
                        try:
                            proc.kill()
                        except Exception:
                            pass
                except Exception as ex:
                    err = str(ex)
                if ok:
                    # Persist credentials so game installs run under this account
                    try:
                        auth_dir = os.path.join(os.path.dirname(__file__), ".auth")
                        os.makedirs(auth_dir, exist_ok=True)
                        with open(os.path.join(auth_dir, "steam_auth.txt"), "w") as f:
                            f.write(f"{username}:{password}")
                    except Exception:
                        pass
                send(ws, "provider.login.result", {"provider": provider, "ok": ok, "username": username if ok else None, "error": None if ok else (err or "Login failed — check credentials or Steam Guard code")})
            elif provider == "epic":
                subprocess.run(["pip", "install", "-q", "legendary-gl"], capture_output=True, timeout=120)
                result = subprocess.run(["legendary", "auth", "--code", username], capture_output=True, text=True, timeout=60)
                send(ws, "provider.login.result", {"provider": provider, "ok": result.returncode == 0, "username": username if result.returncode == 0 else None})
            elif provider == "gog":
                subprocess.run(["pip", "install", "-q", "lgogdownloader"], capture_output=True, timeout=120)
                result = subprocess.run(["lgogdownloader", "--login"], input=f"{username}\n{password}\n", capture_output=True, text=True, timeout=60)
                send(ws, "provider.login.result", {"provider": provider, "ok": result.returncode == 0, "username": username if result.returncode == 0 else None})
            else:
                send(ws, "provider.login.result", {"provider": provider, "ok": False, "error": f"Provider {provider} not supported."})
        except Exception as ex:
            send(ws, "provider.login.result", {"provider": provider, "ok": False, "error": str(ex)})
    threading.Thread(target=_do_login, daemon=True).start()


def _provider_sync(ws, p):
    import subprocess
    provider = p.get("provider", "steam")
    steam_id = p.get("steamId")
    access_token = p.get("accessToken")
    username = p.get("username")
    auth_code = ""
    auth_file = os.path.join(os.path.dirname(__file__), ".auth", f"{provider}_auth.txt")
    if os.path.exists(auth_file):
        try:
            with open(auth_file) as f:
                auth_code = f.read().strip()
        except Exception:
            pass
    def _do_sync():
        try:
            games = []
            if provider == "steam":
                sync_user = auth_code
                if ":" in auth_code:
                    sync_user = auth_code.split(":", 1)[0]
                login_user = steam_id or sync_user or "anonymous"
                result = subprocess.run(["steamcmd", "+login", login_user, "+apps_list", "+quit"], capture_output=True, text=True, timeout=120)
                for line in result.stdout.split("\n"):
                    line = line.strip()
                    if line and line[0].isdigit() and "\t" in line:
                        parts = line.split("\t", 1)
                        if len(parts) == 2:
                            games.append({"appId": parts[0], "name": parts[1]})
                if (steam_id or auth_code) and not games:
                    sid = steam_id or auth_code
                    try:
                        import urllib.request
                        api_key = os.environ.get("STEAM_API_KEY", "")
                        if api_key:
                            url = f"https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key={api_key}&steamid={sid}&include_appinfo=1&format=json"
                        else:
                            url = f"https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?steamid={sid}&include_appinfo=1&format=json"
                        with urllib.request.urlopen(url, timeout=15) as resp:
                            data = json.loads(resp.read())
                            for g in data.get("response", {}).get("games", []):
                                games.append({"appId": str(g.get("appid", "")), "name": g.get("name", "")})
                    except Exception:
                        pass
                if not games:
                    result = subprocess.run(["steamcmd", "+login", "anonymous", "+apps_list", "+quit"], capture_output=True, text=True, timeout=120)
                    for line in result.stdout.split("\n"):
                        line = line.strip()
                        if line and line[0].isdigit() and "\t" in line:
                            parts = line.split("\t", 1)
                            if len(parts) == 2:
                                games.append({"appId": parts[0], "name": parts[1]})
            elif provider == "epic":
                subprocess.run(["pip3", "install", "-q", "legendary-gl"], capture_output=True, timeout=120)
                if auth_code:
                    subprocess.run(["legendary", "auth", "--code", auth_code], capture_output=True, text=True, timeout=60)
                result = subprocess.run(["legendary", "list-games", "--csv", "--tsv"], capture_output=True, text=True, timeout=60)
                for line in result.stdout.strip().split("\n"):
                    if line.startswith("App name") or not line.strip():
                        continue
                    parts = line.split("\t" if "\t" in line else ",")
                    if len(parts) >= 2:
                        app_id = parts[0].strip().strip('"')
                        name = parts[1].strip().strip('"')
                        if app_id and name:
                            games.append({"appId": app_id, "name": name})
                if not games and result.returncode != 0:
                    send(ws, "provider.library", {"provider": provider, "games": [], "count": 0, "error": "legendary not available. Run 'legendary auth' on Colab."})
                    return
            elif provider == "gog":
                subprocess.run(["pip3", "install", "-q", "lgogdownloader"], capture_output=True, timeout=120)
                result = subprocess.run(["lgogdownloader", "--list", "--csv"], capture_output=True, text=True, timeout=60)
                for line in result.stdout.strip().split("\n"):
                    parts = line.split(";")
                    if len(parts) >= 2:
                        app_id = parts[0].strip()
                        name = parts[1].strip()
                        if app_id and name and app_id.isdigit():
                            games.append({"appId": app_id, "name": name})
                if not games and result.returncode != 0:
                    send(ws, "provider.library", {"provider": provider, "games": [], "count": 0, "error": "lgogdownloader not available. Run 'lgogdownloader --login' on Colab."})
                    return
            send(ws, "provider.library", {"provider": provider, "games": games, "count": len(games)})
        except Exception as ex:
            send(ws, "provider.library", {"provider": provider, "games": [], "count": 0, "error": str(ex)})
    threading.Thread(target=_do_sync, daemon=True).start()


def _provider_logout(ws, p):
    send(ws, "provider.logout.result", {"provider": p.get("provider", "steam"), "ok": True})


# ── Game install ───────────────────────────────────────────────────────
def _game_install(ws, p):
    import subprocess, re
    game_id = p.get("id", "")
    install_method = p.get("installMethod", "steamcmd")
    app_id = p.get("appId") or p.get("steamAppId", "")
    install_dir = p.get("installDir", "/home/gamer/games")
    provider_type = p.get("provider", "steam")
    auth_code = ""
    auth_file = os.path.join(os.path.dirname(__file__), ".auth", f"{provider_type}_auth.txt")
    if os.path.exists(auth_file):
        try:
            with open(auth_file) as f:
                auth_code = f.read().strip()
        except Exception:
            pass
    def _send_progress(state, percent, downloaded=0, total=0, speed=0, eta=0):
        send(ws, "game.install.progress", {"gameId": game_id, "state": state, "percent": round(percent, 1), "downloadedBytes": downloaded, "totalBytes": total, "speedBytesPerSec": speed, "etaSeconds": eta})
    def _do_install():
        global _install_proc, _install_cancel
        try:
            _install_cancel.clear()
            os.makedirs(install_dir, exist_ok=True)
            # Always-open install log so we can diagnose even if app_id is missing
            log_path = os.path.join("/tmp", f"install-{game_id}.log")
            try:
                logf = open(log_path, "w")
            except Exception:
                logf = None
            def _log(line):
                try:
                    if logf:
                        logf.write(line); logf.flush()
                except Exception:
                    pass
            _log(f"install start: method={install_method} app_id={app_id!r} provider={provider_type} install_dir={install_dir}\n")
            print(f"[agent] install start: game={game_id} method={install_method} app={app_id} dir={install_dir} log={log_path}", flush=True)
            _send_progress("checking", 0)

            # Check if the installer is available
            if install_method == "steamcmd":
                import shutil
                if not shutil.which("steamcmd"):
                    send(ws, "game.install.progress", {"gameId": game_id, "state": "error", "percent": 0, "error": "steamcmd not installed — run: apt install steamcmd"})
                    send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "steamcmd not installed"})
                    if logf: logf.close()
                    return

            if install_method == "steamcmd" and app_id:
                _send_progress("downloading", 0)
                # Prefer credentials sent with the install request; fall back to
                # the persisted .auth/steam_auth.txt ("username:password").
                steam_user = (p.get("steamUser") or "").strip()
                steam_pass = (p.get("steamPass") or "").strip()
                if not steam_user and auth_code:
                    if ":" in auth_code:
                        steam_user, steam_pass = auth_code.split(":", 1)
                    else:
                        steam_user = auth_code
                if steam_user:
                    # Cache for future installs too
                    try:
                        auth_dir = os.path.join(os.path.dirname(__file__), ".auth")
                        os.makedirs(auth_dir, exist_ok=True)
                        with open(os.path.join(auth_dir, "steam_auth.txt"), "w") as f:
                            f.write(f"{steam_user}:{steam_pass}")
                    except Exception:
                        pass
                login_user = steam_user if steam_user else "anonymous"
                login_args = ["+login", login_user]
                if steam_pass:
                    login_args.append(steam_pass)
                print(f"[agent] steamcmd install: app={app_id} user={login_user} dir={install_dir}", flush=True)
                # force_install_dir MUST come before +login, otherwise steamcmd
                # errors with "Please use force_install_dir before logon!"
                cmd = ["steamcmd", "+force_install_dir", install_dir] + login_args + \
                      ["+app_update", str(app_id), "validate", "+quit"]
                _log(f"cmd: {' '.join(cmd)}\n")
                proc = subprocess.Popen(["stdbuf", "-oL", "-eL"] + cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
                _install_proc = proc
                _agent_pids.append(proc.pid)
                percent = total_bytes = speed_bps = 0
                _guard_seq = [0]
                for line in proc.stdout:
                    try:
                        logf.write(line); logf.flush()
                    except Exception:
                        pass
                    if _install_cancel.is_set():
                        proc.terminate()
                        send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "Cancelled", "cancelled": True})
                        return
                    lo = line.lower().strip()
                    # Steam Guard (2FA) code requested — ask the user and feed it back
                    if _is_steam_guard_prompt(lo):
                        _guard_seq[0] += 1
                        code = _request_steam_guard(f"install-{game_id}")
                        if code and proc.stdin:
                            try:
                                proc.stdin.write(code + "\n")
                                proc.stdin.flush()
                            except Exception:
                                pass
                        continue
                    dl_match = re.search(r'downloaded\s+([\d,]+)\s+bytes?\s*\((\d+)%\)', lo)
                    if dl_match:
                        downloaded = int(dl_match.group(1).replace(',', ''))
                        percent = float(dl_match.group(2))
                        _send_progress("downloading", percent, downloaded, total_bytes, speed_bps)
                        continue
                    # steamcmd self-update progress: "[  7%] Downloading update (...)"
                    boot_match = re.search(r'\[\s*(\d+)%\]\s*downloading update', lo)
                    if boot_match:
                        percent = float(boot_match.group(1))
                        _send_progress("downloading", percent, 0, total_bytes, speed_bps)
                        continue
                    prog_match = re.search(r'progress:\s*(\d+(?:\.\d+)?)%', lo)
                    if prog_match:
                        percent = float(prog_match.group(1))
                        _send_progress("downloading", percent, 0, total_bytes, speed_bps)
                        continue
                    spd_match = re.search(r'([\d.]+)\s*(kb|mb|gb)/s', lo)
                    if spd_match:
                        val = float(spd_match.group(1))
                        unit = spd_match.group(2)
                        speed_bps = int(val * (1024**2) if unit == "mb" else val * 1024 if unit == "kb" else val * (1024**3))
                        continue
                    size_match = re.search(r'([\d,]+)\s*bytes?\s+to\s+download', lo)
                    if size_match:
                        total_bytes = int(size_match.group(1).replace(',', ''))
                        continue
                    if any(k in lo for k in ("beginning download", "updating", "installing", "validating")):
                        percent = min(percent + 2, 95)
                        _send_progress("downloading", percent, 0, total_bytes, speed_bps)
                proc.wait()
                try:
                    logf.close()
                except Exception:
                    pass
                ok = proc.returncode == 0
            elif install_method == "legendary" and app_id:
                _send_progress("downloading", 0)
                proc = subprocess.Popen(["legendary", "install", app_id, "--no-https", "--no-skip-dlcs"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
                _install_proc = proc
                _agent_pids.append(proc.pid)
                percent = 0
                for line in proc.stdout:
                    if _install_cancel.is_set():
                        proc.terminate()
                        send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "Cancelled", "cancelled": True})
                        return
                    lo = line.lower().strip()
                    prog_match = re.search(r'(\d+(?:\.\d+)?)%', lo)
                    if prog_match:
                        percent = float(prog_match.group(1))
                        _send_progress("downloading", percent)
                    elif any(k in lo for k in ("downloading", "installing", "extracting")):
                        percent = min(percent + 1, 95)
                        _send_progress("downloading", percent)
                proc.wait()
                ok = proc.returncode == 0
            elif install_method == "lgogdownloader" and app_id:
                _send_progress("downloading", 0)
                proc = subprocess.Popen(["lgogdownloader", "--download", f"--id={app_id}", "--directory", install_dir], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
                _install_proc = proc
                _agent_pids.append(proc.pid)
                percent = 0
                for line in proc.stdout:
                    if _install_cancel.is_set():
                        proc.terminate()
                        send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "Cancelled", "cancelled": True})
                        return
                    lo = line.lower().strip()
                    prog_match = re.search(r'(\d+(?:\.\d+)?)%', lo)
                    if prog_match:
                        percent = float(prog_match.group(1))
                        _send_progress("downloading", percent)
                    elif any(k in lo for k in ("downloading", "installing")):
                        percent = min(percent + 1, 95)
                        _send_progress("downloading", percent)
                proc.wait()
                ok = proc.returncode == 0
            else:
                send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": f"Install method '{install_method}' not available."})
                return
            if ok:
                _send_progress("ready", 100)
                send(ws, "game.install.done", {"gameId": game_id, "success": True})
            else:
                send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "Installation failed"})
        except Exception as ex:
            send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": str(ex)})
        finally:
            _install_proc = None
    threading.Thread(target=_do_install, daemon=True).start()


def _game_install_cancel(ws, p):
    global _install_proc, _install_cancel
    _install_cancel.set()
    if _install_proc:
        try:
            _install_proc.terminate()
        except Exception:
            pass
    send(ws, "game.install.done", {"gameId": p.get("id", ""), "success": False, "error": "Cancelled", "cancelled": True})


def _game_uninstall(ws, p):
    send(ws, "game.install.done", {"gameId": p.get("id", ""), "success": True})


def on_error(ws, err):
    print(f"[agent] error: {err}", flush=True)


def on_close(ws, close_status_code, close_msg):
    print(f"[agent] disconnected (code={close_status_code}, reason={close_msg})", flush=True)


# ── Main loop with exponential backoff ─────────────────────────────────
def _self_update_codebase():
    """Best-effort pull of the runtime-agent repo so the Colab agent auto-advances."""
    try:
        cwd = os.path.dirname(os.path.abspath(__file__))
        repo = os.path.abspath(os.path.join(cwd, ".."))
        if os.path.isdir(os.path.join(repo, ".git")):
            subprocess = __import__("subprocess")
            subprocess.run(["git", "fetch", "--quiet"], cwd=repo, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["git", "pull", "--quiet", "--ff-only"], cwd=repo, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"[agent] codebase self-updated", flush=True)
    except Exception as e:
        print(f"[agent] self-update skipped: {e}")

def main():
    global _running
    _self_update_codebase()

    def _handle_signal(signum, frame):
        print(f"[agent] received signal {signum}, shutting down...")
        _running = False
        if _stats_stop:
            _stats_stop.set()
        streaming.stop_all()
        apps.stop_all()
        os._exit(0)

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    print(f"[agent] starting — backend={BACKEND_WS} token={'set' if TOKEN and TOKEN != 'runtime-change-me' else 'MISSING'}", flush=True)
    attempt = 0
    while _running:
        _self_update_codebase()
        try:
            ws = websocket.WebSocketApp(
                url(),
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close,
            )
            # Enable TCP_NODELAY for zero-latency control messages
            try:
                ws.run_forever(
                    ping_interval=0,
                    suppress_origin=True,
                    socket_options=[(6, 1, 1)],  # (SOL_TCP, TCP_NODELAY, 1)
                )
            except TypeError:
                # Fallback for older websocket-client versions without socket_options
                ws.run_forever(
                    ping_interval=0,
                    suppress_origin=True,
                )
            attempt = 0  # reset on clean disconnect
        except Exception as e:
            print(f"[agent] connection failed: {e}", flush=True)
        # Exponential backoff with jitter
        delay = min(RECONNECT_BASE * (2 ** attempt), RECONNECT_MAX)
        jitter = random.uniform(0, delay * 0.3)
        sleep_time = delay + jitter
        print(f"[agent] reconnecting in {sleep_time:.1f}s (attempt {attempt + 1})")
        time.sleep(sleep_time)
        attempt = min(attempt + 1, 10)


if __name__ == "__main__":
    main()
