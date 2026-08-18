import os
import shutil
import signal
import subprocess
import threading
import time

DISPLAY = os.environ.get("LUNA_DISPLAY", ":1")


def _gamer_available():
    """Run GUI apps as the non-root 'gamer' user when available — Steam refuses
    to run as root, and other desktop apps are happier off-root."""
    try:
        return (shutil.which("runuser") is not None
                and subprocess.run(["id", "gamer"], capture_output=True).returncode == 0)
    except Exception:
        return False


def _build_launch_cmd(exe, args):
    if _gamer_available():
        return ["runuser", "-u", "gamer", "--", "env", "DISPLAY=" + DISPLAY, exe, *args]
    return [exe, *args]

APP_REGISTRY = [
    {
        "id": "firefox",
        "name": "Firefox",
        "executable": "firefox",
        "args": ["--new-instance", "--no-remote"],
        "check": ["firefox", "--version"],
        "category": "browser",
    },
    {
        "id": "steam",
        "name": "Steam",
        "executable": "steam",
        "args": [],
        "check": ["which", "steam"],
        "category": "game-store",
    },
    {
        "id": "epic",
        "name": "Epic Games",
        "executable": "heroic",
        "args": [],
        "check": ["which", "heroic"],
        "category": "game-store",
        "supported": True,
        "note": "Epic Games / GOG via the Heroic Games Launcher (native Linux client).",
    },
    {
        "id": "lutris",
        "name": "Lutris",
        "executable": "lutris",
        "args": [],
        "check": ["which", "lutris"],
        "category": "game-store",
        "supported": True,
        "note": "Game launcher for Epic, GOG, Battle.net and more.",
    },
    {
        "id": "terminal",
        "name": "Terminal",
        "executable": "xterm",
        "args": [],
        "check": ["which", "xterm"],
        "category": "system",
        "fallback": "xfce4-terminal",
    },
    {
        "id": "files",
        "name": "File Manager",
        "executable": "pcmanfm",
        "args": [],
        "check": ["which", "pcmanfm"],
        "category": "system",
        "fallback": "thunar",
    },
    {
        "id": "settings",
        "name": "System Settings",
        "executable": "xfce4-settings-manager",
        "args": [],
        "check": ["which", "xfce4-settings-manager"],
        "category": "system",
        "fallback": "gnome-control-center",
    },
]

_PROCS = {}


def _resolve_exec(entry):
    exe = entry.get("executable")
    if exe and shutil.which(exe):
        return exe
    fb = entry.get("fallback")
    if fb and shutil.which(fb):
        return fb
    return None


def detect_apps():
    out = []
    for e in APP_REGISTRY:
        state = "UNSUPPORTED" if e.get("supported") is False else "NOT_INSTALLED"
        installed_exe = None
        if e.get("supported") is not False:
            installed_exe = _resolve_exec(e)
            if installed_exe:
                state = "INSTALLED"
        out.append(
            {
                "id": e["id"],
                "name": e["name"],
                "category": e.get("category"),
                "state": _PROCS.get(e["id"], {}).get("state", state),
                "installed": installed_exe is not None,
                "executable": installed_exe,
                "supported": e.get("supported", True),
                "note": e.get("note"),
            }
        )
    return out


def _poll_exit(app_id, proc, send):
    proc.wait()
    code = proc.returncode
    _PROCS.pop(app_id, None)
    new_state = "STOPPED" if code == 0 else "FAILED"
    _PROCS[app_id] = {"state": new_state, "exitCode": code}
    send("app.state", {"id": app_id, "state": new_state, "exitCode": code})


def launch_app(app_id, send):
    if app_id in _PROCS and _PROCS[app_id].get("proc") and _PROCS[app_id]["proc"].poll() is None:
        return {"ok": True, "state": "RUNNING"}

    entry = next((e for e in APP_REGISTRY if e["id"] == app_id), None)
    if entry is None:
        return {"ok": False, "error": f"Unknown application: {app_id}"}
    if entry.get("supported") is False:
        return {"ok": False, "error": "UNSUPPORTED", "state": "UNSUPPORTED"}

    exe = _resolve_exec(entry)
    if not exe:
        return {"ok": False, "error": "NOT_INSTALLED", "state": "NOT_INSTALLED"}

    try:
        env = dict(os.environ)
        env["DISPLAY"] = DISPLAY
        if "DBUS_SESSION_BUS_ADDRESS" not in env:
            env["DBUS_SESSION_BUS_ADDRESS"] = f"unix:path=/tmp/dbus-{app_id}"
        cmd = _build_launch_cmd(exe, entry.get("args", []))
        proc = subprocess.Popen(
            cmd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )
    except Exception as ex:
        return {"ok": False, "error": f"Failed to start {entry['name']}: {ex}", "state": "FAILED"}

    _PROCS[app_id] = {"proc": proc, "state": "RUNNING", "startedAt": time.time()}
    send("app.state", {"id": app_id, "state": "RUNNING", "pid": proc.pid})
    threading.Thread(target=_poll_exit, args=(app_id, proc, send), daemon=True).start()
    return {"ok": True, "state": "RUNNING", "pid": proc.pid}


def _kill(proc):
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    except Exception:
        try:
            proc.terminate()
        except Exception:
            pass


def stop_app(app_id, send):
    rec = _PROCS.get(app_id)
    if not rec or not rec.get("proc"):
        return {"ok": True, "state": "STOPPED"}
    try:
        _kill(rec["proc"])
        send("app.state", {"id": app_id, "state": "STOPPING"})
    except Exception as ex:
        return {"ok": False, "error": str(ex)}
    return {"ok": True, "state": "STOPPING"}


def stop_all():
    for app_id, rec in list(_PROCS.items()):
        proc = rec.get("proc")
        if proc and proc.poll() is None:
            _kill(proc)
    _PROCS.clear()
