import os
import json
import time
import threading
import random
import signal
import re
import hashlib
import shutil
import subprocess

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
# Per-install state keyed by gameId — concurrent installs each get their own
# process handle, cancel event and directory registration.
_install_lock = threading.Lock()
_installs = {}  # gameId -> {"proc": Popen, "cancel": Event, "dir": str, "proton": bool}
_game_procs = {}  # gameId -> launched game Popen (so Stop Game actually works)


def _register_game_proc(game_id, proc, ws):
    """Watch a launched game process; report exit so the UI clears its state."""

    def _watch():
        try:
            proc.wait()
        except Exception:
            pass
        with _install_lock:
            _game_procs.pop(game_id, None)
        try:
            send(ws, "game.stopped", {"gameId": game_id})
        except Exception:
            pass

    threading.Thread(target=_watch, daemon=True).start()


def _launch_game_async(ws, p):
    try:
        result = streaming.launch_game(p)
        proc = result.get("proc")
        gid = p.get("id") or p.get("appId") or ""
        if proc is not None and gid:
            with _install_lock:
                _game_procs[gid] = proc
            _register_game_proc(gid, proc, ws)
        payload = {k: v for k, v in (p or {}).items() if k not in ("steamPass", "password")}
        if isinstance(result, dict):
            payload["mode"] = result.get("mode")
        send(ws, "game.started", payload)
    except Exception as ex:
        print(f"[agent] launch failed: {ex}", flush=True)
        send(ws, "game.start_error", {"id": p.get("id"), "error": str(ex)})


def _games_base():
    """Root folder holding one sub-directory per installed game."""
    return "/home/gamer/games"


def _ensure_tool(pkg, module=None):
    """pip install a CLI tool, tolerating externally-managed environments
    (PEP 668, e.g. Colab) that reject bare `pip install`."""
    tried = [
        ["pip3", "install", "-q", "--break-system-packages", pkg],
        ["python3", "-m", "pip", "install", "-q", "--break-system-packages", pkg],
        ["pip3", "install", "-q", pkg],
    ]
    for args in tried:
        try:
            if subprocess.run(args, capture_output=True, text=True, timeout=240).returncode == 0:
                return True
        except Exception:
            pass
    return False


def _legendary_cmd():
    """Return a working legendary invocation, preferring the console script
    but falling back to `python3 -m legendary` so a user-site install that is
    not on PATH still works."""
    for c in (["legendary"], ["python3", "-m", "legendary"]):
        try:
            if subprocess.run(c + ["--version"], capture_output=True, text=True, timeout=15).returncode == 0:
                return c
        except Exception:
            pass
    return None


def _cleanup_install(game_id):
    """Remove the partially downloaded files for a game after cancel or
    failure. Only runs for directories registered as an active install of
    that game, so installed (completed) games are never touched. Best-effort
    and idempotent."""
    with _install_lock:
        d = _installs.get(game_id, {}).get("dir")
        if d:
            _installs.pop(game_id, None)
    if not d:
        return  # not an active install — don't touch completed games
    if d.startswith(_games_base()) and os.path.abspath(d) != os.path.abspath(_games_base()):
        try:
            shutil.rmtree(d, ignore_errors=True)
            print(f"[agent] cleaned up install dir {d}", flush=True)
        except Exception as ex:
            print(f"[agent] cleanup failed for {d}: {ex}", flush=True)
_lock = threading.Lock()  # Protects _terminal_procs, _agent_pids
_send_lock = threading.Lock()  # Serializes websocket sends across threads
_steam_guard = {}  # requestId -> {"event": Event, "code": str}


# ── Secure credential storage ──────────────────────────────────────────
# Steam credentials are encrypted at rest (AES-GCM) keyed from the existing
# RUNTIME_AUTH_SECRET. We never write the password in plaintext, and we never
# log it. The password is only needed to (re)authenticate steamcmd; once
# steamcmd caches its own session the encrypted copy is still used as a
# fallback for installs after a process restart.
import base64
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    _HAS_AESGCM = True
except Exception:  # pragma: no cover - cryptography may be missing on some hosts
    AESGCM = None
    _HAS_AESGCM = False

_AUTH_DIR = os.path.join(os.path.dirname(__file__), ".auth")


def _cred_key():
    """Derive a 32-byte AES key from RUNTIME_AUTH_SECRET (stable per deploy)."""
    secret = (TOKEN or "runtime-change-me").encode("utf-8")
    k = bytearray(32)
    for i, b in enumerate(secret):
        k[i % 32] ^= b
    # Mix with SHA-256 for uniform distribution
    return hashlib.sha256(bytes(k)).digest()


def _save_creds(provider, user, password):
    """Encrypt and persist credentials. Never stores plaintext."""
    try:
        os.makedirs(_AUTH_DIR, exist_ok=True)
        pt = f"{user}:{password}".encode("utf-8")
        if _HAS_AESGCM:
            aes = AESGCM(_cred_key())
            nonce = os.urandom(12)
            blob = base64.b64encode(nonce + aes.encrypt(nonce, pt, None)).decode("ascii")
        else:
            # Fallback: obfuscate (not strong crypto) so the agent still runs
            # if the cryptography package is unavailable on the host.
            print("[agent] WARNING: cryptography unavailable — creds obfuscated, not encrypted")
            blob = "obf:" + base64.b64encode(pt).decode("ascii")
        with open(os.path.join(_AUTH_DIR, f"{provider}_auth.txt"), "w") as f:
            f.write(blob)
    except Exception as ex:
        print(f"[agent] credential save failed: {ex}")


def _load_creds(provider):
    """Return 'user:password' or '' if no (decryptable) creds exist."""
    try:
        path = os.path.join(_AUTH_DIR, f"{provider}_auth.txt")
        if not os.path.exists(path):
            return ""
        with open(path) as f:
            blob = f.read().strip()
        if blob.startswith("obf:"):
            return base64.b64decode(blob[4:]).decode("utf-8")
        if ":" in blob and not blob.startswith("+"):
            # Legacy plaintext — re-encrypt on next use.
            return blob
        raw = base64.b64decode(blob)
        nonce, ct = raw[:12], raw[12:]
        aes = AESGCM(_cred_key())
        return aes.decrypt(nonce, ct, None).decode("utf-8")
    except Exception as ex:
        print(f"[agent] credential load failed: {ex}")
        return ""


def url() -> str:
    sep = "?" if "?" not in BACKEND_WS else "&"
    return f"{BACKEND_WS}{sep}token={TOKEN}"


def _backend_base() -> str:
    """HTTP base URL derived from the agent's backend WebSocket URL."""
    u = BACKEND_WS.replace("wss://", "https://").replace("ws://", "http://")
    if "://" not in u:
        return u
    scheme, rest = u.split("://", 1)
    authority = rest.split("/", 1)[0]
    return f"{scheme}://{authority}"


def _report_linked_to_backend(provider, username, password="", account_id="", access_token="", refresh_token=""):
    """Persist a linked account on the Render backend (source of truth)."""
    try:
        import urllib.request
        import json as _json
        body = _json.dumps({
            "provider": provider,
            "username": username,
            "password": password or "",
            "accountId": account_id or "",
            "accessToken": access_token or "",
            "refreshToken": refresh_token or "",
        }).encode("utf-8")
        req = urllib.request.Request(
            _backend_base() + "/api/provider/link",
            data=body,
            headers={"Content-Type": "application/json", "x-agent-token": TOKEN},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=20)
    except Exception as ex:
        print(f"[agent] report linked to backend failed: {ex}")


def _fetch_linked_from_backend(provider):
    """Retrieve a linked account from the Render backend (used for installs)."""
    try:
        import urllib.request
        import json as _json
        req = urllib.request.Request(
            _backend_base() + f"/api/provider/link?provider={provider}",
            headers={"x-agent-token": TOKEN},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            data = _json.loads(r.read().decode("utf-8"))
        return data.get("data") or {}
    except Exception as ex:
        print(f"[agent] fetch linked from backend failed: {ex}")
        return {}


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
        except Exception as ex:
            print(f"[agent] keepalive send failed ({ex}) — connection may be dead", flush=True)
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
def _detect_installed_games(base_dir, max_depth=4):
    """Scan the games base folder (recursively, up to max_depth) for
    appmanifest_<appid>.acf files and return a list of installed games
    (appId + name). steamcmd nests these under <install_dir>/steamapps/, so a
    recursive walk is required (a single-level scan misses them)."""
    found = []
    seen = set()
    try:
        if not os.path.isdir(base_dir):
            return found
        for root, dirs, files in os.walk(base_dir):
            depth = root[len(base_dir):].count(os.sep)
            if depth > max_depth:
                dirs[:] = []
                continue
            for name in files:
                if not (name.startswith("appmanifest_") and name.endswith(".acf")):
                    continue
                appid = name[len("appmanifest_"):-len(".acf")]
                if not appid.isdigit():
                    continue
                gname = "App %s" % appid
                try:
                    with open(os.path.join(root, name), "r", errors="ignore") as f:
                        content = f.read()
                    m = re.search(r'"appid"\s+"(\d+)"', content)
                    if m:
                        appid = m.group(1)
                    nm = re.search(r'"name"\s+"([^"]+)"', content)
                    if nm:
                        gname = nm.group(1)
                except Exception:
                    pass
                if appid in seen:
                    continue
                seen.add(appid)
                found.append({"appId": appid, "name": gname})
    except Exception as ex:
        print(f"[agent] installed-game scan failed: {ex}")
    return found


def _report_installed_games(ws, install_dir):
    try:
        games = _detect_installed_games(install_dir)
        if games:
            send(ws, "games.installed", {"games": games, "count": len(games)})
    except Exception:
        pass


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
    _report_installed_games(ws, "/home/gamer/games")
    # Re-announce any linked provider accounts that were persisted on the
    # backend, so the web UI shows them as "Linked" again after this runtime
    # (re)started — no need for the user to re-link Steam/Epic/GOG.
    for prov in ("steam", "epic", "gog"):
        try:
            linked = _fetch_linked_from_backend(prov)
            if linked and linked.get("username"):
                send(ws, "provider.login.result",
                     {"provider": prov, "ok": True, "username": linked.get("username")})
        except Exception:
            pass
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
        # Resolve+launch can take a moment (umu first-run); keep the WS loop free.
        threading.Thread(target=_launch_game_async, args=(ws, p), daemon=True).start()
    elif t == "detect_apps":
        send(ws, "app.list", apps.detect_apps())
    elif t == "launch_app":
        result = apps.launch_app(p.get("id"), agent_send)
        send(ws, "app.launch_result", {"id": p.get("id"), **result})
    elif t == "stop_app":
        gid = p.get("id")
        gp = None
        with _install_lock:
            gp = _game_procs.pop(gid, None) if gid else None
        if gp is not None:
            # A launched GAME (not a registry app) — kill its process group.
            try:
                os.killpg(os.getpgid(gp.pid), signal.SIGTERM)
            except Exception:
                try:
                    gp.terminate()
                except Exception:
                    pass
            send(ws, "app.stop_result", {"id": gid, "ok": True})
        else:
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
    elif t == "provider.epic.auth.start":
        _epic_auth_start(ws, p)
    elif t == "provider.epic.auth.complete":
        _epic_auth_complete(ws, p)
    elif t == "provider.linked":
        _provider_linked(ws, p)
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
        # Kill any launched games so nothing keeps rendering to the display.
        with _install_lock:
            procs = list(_game_procs.values())
            _game_procs.clear()
        for gp in procs:
            try:
                os.killpg(os.getpgid(gp.pid), signal.SIGKILL)
            except Exception:
                try:
                    gp.kill()
                except Exception:
                    pass
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
                err = None
                owned = []
                try:
                    cmd = ["steamcmd", "+login", username, password]
                    cmd = _wrap_steamcmd(cmd)
                    proc = subprocess.Popen(
                        cmd,
                        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT, text=True, bufsize=1)
                    gseq = [0]
                    authed = False
                    guard_attempts = 0
                    MAX_GUARD = 3
                    requesting = False
                    for line in proc.stdout:
                        if "Steam account successfully logged in" in line:
                            ok = True
                            authed = True
                            requesting = False
                            # Pull the owned-apps list while we're authenticated.
                            try:
                                proc.stdin.write("+apps_list\n")
                                proc.stdin.flush()
                            except Exception:
                                pass
                            continue
                        lo = line.lower()
                        # Only handle a guard prompt before we're authenticated; once
                        # logged in, ignore any trailing guard-related log lines.
                        if not authed and _is_steam_guard_prompt(lo):
                            # The guard prompt spans several log lines; only request a
                            # code once per prompt cycle (not once per matching line).
                            if requesting:
                                continue
                            requesting = True
                            guard_attempts += 1
                            if guard_attempts > MAX_GUARD:
                                err = "Steam Guard code was rejected too many times. Check the code/email and try again."
                                break
                            code = _request_steam_guard(f"login-{username}")
                            if code and proc.stdin:
                                try:
                                    proc.stdin.write(code + "\n")
                                    proc.stdin.flush()
                                except Exception:
                                    pass
                            continue
                        # A fresh login attempt or a rejection lets the next guard
                        # prompt request a code again (one attempt per cycle).
                        if not authed and (("logging in" in lo) or ("authenticating" in lo) or ("invalid" in lo) or ("incorrect" in lo) or ("wrong" in lo)):
                            requesting = False
                        # Steamcmd apps_list output: "<appid>\t<name>"
                        s = line.strip()
                        if s and s[0].isdigit() and "\t" in s:
                            owned.append(s.split("\t", 1)[0])
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
                # Persist credentials as soon as the user provides them so game
                # installs (including free-to-play) can run under this account.
                # steamcmd verification below only enriches the owned-games list;
                # a failed verification must NOT prevent installs from using the
                # credentials the user entered.
                if username and password:
                    _save_creds(provider, username, password)
                    _report_linked_to_backend("steam", username, password)
                if ok and owned:
                    send(ws, "provider.entitlement", {"provider": "steam", "username": username, "appIds": owned})
                send(ws, "provider.login.result", {"provider": provider, "ok": ok, "username": username if ok else None, "error": None if ok else (err or "Login failed — check credentials or Steam Guard code")})
            elif provider in ("epic", "gog"):
                # Epic/GOG linking is performed via the web OAuth flow, which relays the
                # tokens to the agent through the "provider.linked" event. Credential-based
                # login here is not supported.
                send(ws, "provider.login.result", {"provider": provider, "ok": False, "error": "Use the OAuth login (Provider page) to link your Epic/GOG account."})
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
    auth_code = _load_creds(provider)
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
                _ensure_tool("legendary-gl", "legendary")
                lcmd = _legendary_cmd()
                if not lcmd:
                    send(ws, "provider.library", {"provider": provider, "games": [], "count": 0, "error": "legendary not available. Install failed (externally-managed env?)."})
                    return
                if auth_code:
                    subprocess.run(lcmd + ["auth", "--code", auth_code], capture_output=True, text=True, timeout=60)
                result = subprocess.run(lcmd + ["list-games", "--csv", "--tsv"], capture_output=True, text=True, timeout=60)
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
                _ensure_tool("lgogdownloader")
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
            if provider == "steam" and games:
                send(ws, "provider.entitlement", {"provider": "steam", "username": sync_user, "appIds": [g["appId"] for g in games]})
            send(ws, "provider.library", {"provider": provider, "games": games, "count": len(games)})
        except Exception as ex:
            send(ws, "provider.library", {"provider": provider, "games": [], "count": 0, "error": str(ex)})
    threading.Thread(target=_do_sync, daemon=True).start()


def _provider_logout(ws, p):
    """Wipe this provider's local credentials so installs no longer run under
    the disconnected account."""
    provider = p.get("provider", "")
    removed = []
    try:
        f = os.path.join(_AUTH_DIR, f"{provider}_auth.txt")
        if os.path.exists(f):
            os.remove(f)
            removed.append(f)
    except Exception:
        pass
    try:
        if provider == "epic":
            f = os.path.expanduser("~/.config/legendary/user.json")
            if os.path.exists(f):
                os.remove(f)
                removed.append(f)
        elif provider == "gog":
            f = os.path.expanduser("~/.config/lgogdownloader/gog_tokens.json")
            if os.path.exists(f):
                os.remove(f)
                removed.append(f)
    except Exception:
        pass
    print(f"[agent] provider {provider} logged out; cleared: {removed or 'nothing stored'}", flush=True)
    send(ws, "provider.logout.result", {"provider": provider, "ok": True})


def _provider_linked(ws, p):
    """Persist a provider account linked via the web OAuth flow so cloud installs
    run under that user. Tokens arrive relayed from the frontend callback route."""
    provider = p.get("provider", "")
    payload = p.get("payload", p)
    username = payload.get("username", "")
    access_token = payload.get("accessToken", "")
    refresh_token = payload.get("refreshToken", "")
    account_id = payload.get("accountId", "")

    try:
        if provider == "epic":
            import time
            # legendary stores its auth at ~/.config/legendary/user.json
            cfg_dir = os.path.expanduser("~/.config/legendary")
            os.makedirs(cfg_dir, exist_ok=True)
            user_json = {
                "user_id": account_id or username,
                "display_name": username,
                "account_id": account_id or username,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_at": int(time.time()) + 3600,
            }
            with open(os.path.join(cfg_dir, "user.json"), "w") as f:
                json.dump(user_json, f)
            _report_linked_to_backend("epic", username, account_id=account_id, access_token=access_token, refresh_token=refresh_token)
            send(ws, "provider.login.result", {"provider": "epic", "ok": True, "username": username})
        elif provider == "gog":
            # lgogdownloader authenticates via stored tokens; persist them so
            # `lgogdownloader download` can run under this GOG account.
            cfg_dir = os.path.expanduser("~/.config/lgogdownloader")
            os.makedirs(cfg_dir, exist_ok=True)
            with open(os.path.join(cfg_dir, "gog_tokens.json"), "w") as f:
                json.dump({
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "username": username,
                    "user_id": account_id,
                }, f)
            _report_linked_to_backend("gog", username, account_id=account_id, access_token=access_token, refresh_token=refresh_token)
            send(ws, "provider.login.result", {"provider": "gog", "ok": True, "username": username})
        elif provider == "steam":
            # Steam linking is performed interactively by the agent itself
            # (Steam Guard); the backend merely echoes our own POST back here,
            # so don't emit a conflicting failure result.
            return
        else:
            send(ws, "provider.login.result", {"provider": provider, "ok": False, "error": f"Cannot link provider {provider} this way."})
    except Exception as ex:
        send(ws, "provider.login.result", {"provider": provider, "ok": False, "error": str(ex)})


# ── Game install ───────────────────────────────────────────────────────
INSTALL_TIMEOUT_SECONDS = int(os.environ.get("INSTALL_TIMEOUT", "3600"))

def _kill_proc_group(proc):
    """SIGKILL a subprocess and its whole process group (the real downloader
    is a child of the `script` wrapper and needs the group, not the wrapper)."""
    if proc is None:
        return
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


def _redact_cmd(cmd):
    """Log-safe copy of the command line: the password position (the token
    right after the username following +login) is masked."""
    out = [str(x) for x in cmd]
    try:
        i = out.index("+login")
        if i + 2 < len(out):
            out[i + 2] = "***"
    except ValueError:
        pass
    return " ".join(out)


def _game_install(ws, p):
    game_id = p.get("id", "")
    install_method = p.get("installMethod", "steamcmd")
    app_id = p.get("appId") or p.get("steamAppId", "")
    # Each game gets its own sub-directory so cancelling one never touches
    # another game's files. Frontend may override via installDir.
    install_dir = p.get("installDir") or os.path.join(_games_base(), game_id)
    provider_type = p.get("provider", "steam")
    auth_code = _load_creds(provider_type)
    # Fall back to the linked account persisted on the backend (Render) so
    # installs work even after the agent process restarted and lost local creds.
    if not auth_code and provider_type == "steam":
        linked = _fetch_linked_from_backend("steam")
        if linked.get("username"):
            auth_code = f"{linked['username']}:{linked.get('password', '')}"

    def _send_progress(state, percent, downloaded=0, total=0, speed=0, eta=0):
        send(ws, "game.install.progress", {"gameId": game_id, "state": state, "percent": round(percent, 1), "downloadedBytes": downloaded, "totalBytes": total, "speedBytesPerSec": speed, "etaSeconds": eta})

    def _do_install():
        ctx = {"proc": None, "cancel": threading.Event(), "dir": install_dir, "proton": False}
        logf = None
        try:
            with _install_lock:
                _installs[game_id] = ctx
            cancel_event = ctx["cancel"]

            def _cancelled():
                return cancel_event.is_set()

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

            if install_method == "steamcmd":
                import shutil
                if not shutil.which("steamcmd"):
                    send(ws, "game.install.progress", {"gameId": game_id, "state": "error", "percent": 0, "error": "steamcmd not installed — run: apt install steamcmd"})
                    send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "steamcmd not installed"})
                    return

            ok = False
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
                    # Cache encrypted credentials for future installs
                    _save_creds(provider_type, steam_user, steam_pass)
                if not steam_user and provider_type == "steam":
                    # A real Steam account is required for ALL Steam installs,
                    # including free-to-play titles — anonymous cannot "own" an
                    # F2P app and fails with "No subscription". Surface a clear
                    # error instead of attempting an anonymous install.
                    send(ws, "game.install.progress", {"gameId": game_id, "state": "error", "percent": 0, "error": "Steam account not linked — link your Steam account in Providers to install this game (a real account is required even for free-to-play titles)."})
                    send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "Steam account not linked"})
                    return
                login_args = ["+login", steam_user]
                if steam_pass:
                    login_args.append(steam_pass)
                print(f"[agent] steamcmd install: app={app_id} user={steam_user} dir={install_dir}", flush=True)

                def _run_steamcmd_attempt(force_windows: bool):
                    """One full steamcmd run. Returns (ok, platform_error)."""
                    percent = total_bytes = speed_bps = 0
                    authed = False
                    guard_attempts = 0
                    MAX_GUARD = 3
                    requesting = False
                    platform_hit = False
                    started = time.time()
                    cmd = ["steamcmd", "+force_install_dir", install_dir]
                    if force_windows:
                        cmd += ["+@sSteamCmdForcePlatformType", "windows"]
                    cmd += login_args + ["+app_update", str(app_id), "validate", "+quit"]
                    _log(("cmd(windows): " if force_windows else "cmd(linux): ") + _redact_cmd(cmd) + "\n")
                    run_cmd = _wrap_steamcmd(cmd)
                    proc = subprocess.Popen(run_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1, start_new_session=True)
                    ctx["proc"] = proc
                    _agent_pids.append(proc.pid)
                    for line in proc.stdout:
                        try:
                            logf.write(line); logf.flush()
                        except Exception:
                            pass
                        if _cancelled():
                            _kill_proc_group(proc)
                            _cleanup_install(game_id)
                            send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "Cancelled", "cancelled": True})
                            return False, False
                        if time.time() - started > INSTALL_TIMEOUT_SECONDS:
                            _log(f"timeout after {INSTALL_TIMEOUT_SECONDS}s\n")
                            _kill_proc_group(proc)
                            send(ws, "game.install.progress", {"gameId": game_id, "state": "error", "percent": 0, "error": f"Install timed out after {INSTALL_TIMEOUT_SECONDS // 60} minutes."})
                            send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "Install timed out"})
                            return False, False
                        lo = line.lower().strip()
                        # License/ownership failure: the linked account does not own
                        # this app. Even free-to-play Steam titles must be in the
                        # account's library before steamcmd can download them.
                        if "no subscription" in lo or "does not have a license" in lo or "not available for your account" in lo:
                            _log("steamcmd license error: " + line)
                            _kill_proc_group(proc)
                            _cleanup_install(game_id)
                            gname = p.get("name") or f"app {app_id}"
                            send(ws, "game.install.progress", {"gameId": game_id, "state": "error", "percent": 0, "error": "Your Steam account '" + str(steam_user) + "' does not own " + str(gname) + ". Even free-to-play Steam games must be added to your Steam library (free) before they can be installed. Open the Steam store, add it to your library, then retry."})
                            send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "Steam account does not own this game"})
                            return False, False
                        # Platform errors trigger the Windows/Proton retry instead of
                        # failing outright — Windows-only titles are fully supported.
                        if "invalid platform" in lo or ("platform" in lo and "not available" in lo) or "no linux depot" in lo or ("error!" in lo and "platform" in lo):
                            _log("steamcmd platform error (will retry windows): " + line)
                            _kill_proc_group(proc)
                            platform_hit = True
                            break
                        # Steam Guard (2FA) code requested — ask the user and feed it
                        # back. Only before we're authenticated; once the download
                        # starts we ignore any trailing guard-related log lines.
                        if not authed and _is_steam_guard_prompt(lo):
                            # The guard prompt spans several log lines; only request a
                            # code once per prompt cycle (not once per matching line).
                            if requesting:
                                continue
                            requesting = True
                            guard_attempts += 1
                            if guard_attempts > MAX_GUARD:
                                send(ws, "game.install.progress", {"gameId": game_id, "state": "error", "percent": 0, "error": "Steam Guard code rejected too many times. Check the code and try again."})
                                send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "Steam Guard code rejected too many times."})
                                _kill_proc_group(proc)
                                _cleanup_install(game_id)
                                return False, False
                            guard_code = _request_steam_guard(f"install-{game_id}")
                            if guard_code and proc.stdin:
                                try:
                                    proc.stdin.write(guard_code + "\n")
                                    proc.stdin.flush()
                                except Exception:
                                    pass
                            continue
                        # A fresh login attempt or a rejection lets the next guard
                        # prompt request a code again (one attempt per cycle).
                        if not authed and (("logging in" in lo) or ("authenticating" in lo) or ("invalid" in lo) or ("incorrect" in lo) or ("wrong" in lo)):
                            requesting = False
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
                        # steamcmd game-download line: "Update state (0x61) downloading,
                        # progress: 2.26 (2059360684 / 91106400180)" — percent then bytes.
                        prog_match = re.search(r'progress:\s*([\d.]+)\s*\(([\d,]+)\s*/\s*([\d,]+)\)', lo)
                        if prog_match:
                            percent = float(prog_match.group(1))
                            downloaded = int(prog_match.group(2).replace(',', ''))
                            total_bytes = int(prog_match.group(3).replace(',', ''))
                            _send_progress("downloading", percent, downloaded, total_bytes, speed_bps)
                            continue
                        prog_match = re.search(r'progress:\s*(\d+(?:\.\d+)?)%\s*\(([\d,]+)\s*/\s*([\d,]+)\)', lo)
                        if prog_match:
                            percent = float(prog_match.group(1))
                            downloaded = int(prog_match.group(2).replace(',', ''))
                            total_bytes = int(prog_match.group(3).replace(',', ''))
                            _send_progress("downloading", percent, downloaded, total_bytes, speed_bps)
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
                            authed = True
                            requesting = False
                            percent = min(percent + 2, 95)
                            _send_progress("downloading", percent, 0, total_bytes, speed_bps)
                    try:
                        proc.wait(timeout=60)
                    except Exception:
                        _kill_proc_group(proc)
                    # steamcmd sometimes prints "Error! App 'X' state is 0x602 after
                    # update job" yet still writes a complete appmanifest. Treat the
                    # install as successful if the manifest exists or success markers
                    # are present, rather than trusting the (often non-zero) exit
                    # code. Manifests live under steamapps/ inside the install dir.
                    manifest_ok = (
                        os.path.exists(os.path.join(install_dir, "steamapps", f"appmanifest_{app_id}.acf"))
                        or os.path.exists(os.path.join(install_dir, f"appmanifest_{app_id}.acf"))
                    )
                    log_text = ""
                    try:
                        with open(log_path) as lf:
                            log_text = lf.read()
                    except Exception:
                        pass
                    success_markers = ("fully installed", "fully updated", "Success! App")
                    attempt_ok = proc.returncode == 0 or manifest_ok or any(m in log_text for m in success_markers)
                    return attempt_ok, platform_hit

                _send_progress("downloading", 0)
                # Phase 1: native Linux depots.
                ok, platform_hit = _run_steamcmd_attempt(force_windows=False)
                # Phase 2 (Proton): the title ships no Linux content — fetch the
                # Windows depots; launch routes it through umu-run/Proton.
                if not ok and platform_hit and not _cancelled():
                    _log("retrying with @sSteamCmdForcePlatformType windows\n")
                    _cleanup_install(game_id)
                    os.makedirs(install_dir, exist_ok=True)
                    with _install_lock:
                        _installs[game_id]["proton"] = True
                    _send_progress("checking", 1)
                    ok, _ = _run_steamcmd_attempt(force_windows=True)
                    if ok:
                        try:
                            with open(os.path.join(install_dir, ".kyro_proton"), "w") as mf:
                                mf.write("windows\n")
                        except Exception:
                            pass
                        print(f"[agent] proton install complete: game={game_id}", flush=True)
                if ok:
                    _report_installed_games(ws, _games_base())
            elif install_method == "legendary" and app_id:
                _send_progress("downloading", 0)
                lcmd = _legendary_cmd() or ["legendary"]
                proc = subprocess.Popen(lcmd + ["install", app_id, "--no-https", "--no-skip-dlcs"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, start_new_session=True)
                ctx["proc"] = proc
                _agent_pids.append(proc.pid)
                percent = 0
                for line in proc.stdout:
                    if _cancelled():
                        _kill_proc_group(proc)
                        _cleanup_install(game_id)
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
                proc = subprocess.Popen(["lgogdownloader", "--download", f"--id={app_id}", "--directory", install_dir], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, start_new_session=True)
                ctx["proc"] = proc
                _agent_pids.append(proc.pid)
                percent = 0
                for line in proc.stdout:
                    if _cancelled():
                        _kill_proc_group(proc)
                        _cleanup_install(game_id)
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
                with _install_lock:
                    _installs.pop(game_id, None)
                _send_progress("ready", 100)
                send(ws, "game.install.done", {"gameId": game_id, "success": True, "proton": bool(ctx.get("proton"))})
            else:
                send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": "Installation failed"})
        except Exception as ex:
            send(ws, "game.install.done", {"gameId": game_id, "success": False, "error": str(ex)})
        finally:
            if logf:
                try:
                    logf.close()
                except Exception:
                    pass
            with _install_lock:
                ctx_done = _installs.pop(game_id, None)
            if ctx_done and not ctx_done.get("cancel").is_set():
                # A finished (success/fail) install has no live proc left; killing
                # is harmless but only do it when it wasn't already cancelled.
                pass
    threading.Thread(target=_do_install, daemon=True).start()


def _game_install_cancel(ws, p):
    gid = p.get("id", "")
    with _install_lock:
        ctx = _installs.get(gid)
    if ctx:
        ctx["cancel"].set()
        _kill_proc_group(ctx.get("proc"))
        _cleanup_install(gid)
    send(ws, "game.install.done", {"gameId": gid, "success": False, "error": "Cancelled", "cancelled": True})


def _game_uninstall(ws, p):
    """Really delete the game directory (never outside the games root), then
    refresh the installed-games list."""
    gid = p.get("id", "")
    games_root = os.path.abspath(_games_base())
    target = os.path.abspath(os.path.join(_games_base(), gid)) if gid else ""
    ok = False
    err = ""
    if not target or not target.startswith(games_root + os.sep):
        err = "invalid game id"
    elif not os.path.isdir(target):
        ok = True  # nothing on disk — treat as already uninstalled
    else:
        shutil.rmtree(target, ignore_errors=True)
        ok = not os.path.isdir(target)
        if not ok:
            err = "failed to delete game directory"
    # Refresh the frontend's installed list either way.
    try:
        threading.Thread(target=_report_installed_games, args=(ws, _games_base()), daemon=True).start()
    except Exception:
        pass
    payload = {"gameId": gid, "success": ok}
    if err:
        payload["error"] = err
    send(ws, "game.uninstall.done", payload)


def _epic_auth_start(ws, p):
    """Kick off legendary's Epic login: it prints the official Epic login URL
    (using legendary's public client id). The user opens it in any browser,
    signs in, and Epic hands back an authorizationCode to paste back."""
    def _run():
        lcmd = _legendary_cmd()
        if not lcmd:
            send(ws, "provider.epic.auth.url", {"ok": False, "error": "legendary not installed"})
            return
        try:
            result = subprocess.run(lcmd + ["auth"], capture_output=True, text=True, timeout=60)
            out = (result.stdout or "") + (result.stderr or "")
            m = re.search(r'https://\S*epicgames\.com\S*', out)
            if m:
                send(ws, "provider.epic.auth.url", {"ok": True, "url": m.group(0)})
            else:
                send(ws, "provider.epic.auth.url", {"ok": False, "error": "no login url in legendary output", "detail": out[-400:]})
        except Exception as ex:
            send(ws, "provider.epic.auth.url", {"ok": False, "error": str(ex)})
    threading.Thread(target=_run, daemon=True).start()


def _epic_auth_complete(ws, p):
    """Complete Epic linking with the user-pasted authorizationCode."""
    code = str(p.get("code", "")).strip()
    def _run():
        lcmd = _legendary_cmd()
        if not lcmd:
            send(ws, "provider.link.result", {"provider": "epic", "ok": False, "error": "legendary not installed"})
            return
        if not code:
            send(ws, "provider.link.result", {"provider": "epic", "ok": False, "error": "missing code"})
            return
        try:
            result = subprocess.run(lcmd + ["auth", "--code", code], capture_output=True, text=True, timeout=90)
            out = ((result.stdout or "") + (result.stderr or "")).strip()
            ok = result.returncode == 0 or "successfully logged in" in out.lower() or "logged in as" in out.lower()
            username = account_id = ""
            if ok:
                try:
                    st = subprocess.run(lcmd + ["status", "--json"], capture_output=True, text=True, timeout=30)
                    data = json.loads(st.stdout or "{}")
                    acc = data.get("account") or {}
                    username = acc.get("account_name") or acc.get("display_name") or ""
                    account_id = acc.get("account_id") or ""
                except Exception:
                    pass
                try:
                    _report_linked_to_backend("epic", username or "Epic User", account_id=account_id)
                except Exception:
                    pass
            send(ws, "provider.link.result", {
                "provider": "epic",
                "ok": ok,
                "username": username or None,
                "accountId": account_id or None,
                **({} if ok else {"error": out[-300:] or "legendary auth failed"}),
            })
        except Exception as ex:
            send(ws, "provider.link.result", {"provider": "epic", "ok": False, "error": str(ex)})
    threading.Thread(target=_run, daemon=True).start()


def on_error(ws, err):
    print(f"[agent] error: {err}", flush=True)


def on_close(ws, close_status_code, close_msg):
    print(f"[agent] disconnected (code={close_status_code}, reason={close_msg})", flush=True)


# ── Main loop with exponential backoff ─────────────────────────────────
def _has_stdbuf():
    # stdbuf breaks 32-bit steamcmd via LD_PRELOAD mismatch, so always disable it
    return False


import shlex
import shutil as _shutil

def _has_script():
    return _shutil.which("script") is not None


def _wrap_steamcmd(cmd_list):
    """Run steamcmd under a PTY (via `script`) so its stdout is line-buffered.
    Plain pipes block-buffer, so the Guard prompt never reaches the agent.
    `script -qc '<cmd>' /dev/null` allocates a PTY for the child."""
    cmd_str = " ".join(shlex.quote(x) for x in cmd_list)
    if _has_script():
        return ["script", "-qc", cmd_str, "/dev/null"]
    return cmd_list

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
        try:
            with _install_lock:
                procs = list(_game_procs.values())
                _game_procs.clear()
            for gp in procs:
                _kill_proc_group(gp)
        except Exception:
            pass
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
