import os
import shutil
import subprocess
import threading
import time

DISPLAY = os.environ.get("LUNA_DISPLAY", ":1")

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
        "executable": None,
        "args": [],
        "check": None,
        "category": "game-store",
        "supported": False,
        "note": "Epic Games Launcher has no native Linux client; requires Wine/Proton which is not provisioned in this runtime.",
    },
    {
        "id": "terminal",
        "name": "Terminal",
        "executable": "xterm",
        "args": [],
        "check": ["which", "xterm"],
        "category": "system",
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
        proc = subprocess.Popen(
            [exe, *entry.get("args", [])],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except Exception as ex:
        return {"ok": False, "error": f"Failed to start {entry['name']}: {ex}", "state": "FAILED"}

    _PROCS[app_id] = {"proc": proc, "state": "RUNNING", "startedAt": time.time()}
    send("app.state", {"id": app_id, "state": "RUNNING", "pid": proc.pid})
    threading.Thread(target=_poll_exit, args=(app_id, proc, send), daemon=True).start()
    return {"ok": True, "state": "RUNNING", "pid": proc.pid}


def stop_app(app_id, send):
    rec = _PROCS.get(app_id)
    if not rec or not rec.get("proc"):
        return {"ok": True, "state": "STOPPED"}
    try:
        rec["proc"].terminate()
        send("app.state", {"id": app_id, "state": "STOPPING"})
    except Exception as ex:
        return {"ok": False, "error": str(ex)}
    return {"ok": True, "state": "STOPPING"}


def stop_all():
    for app_id, rec in list(_PROCS.items()):
        proc = rec.get("proc")
        if proc and proc.poll() is None:
            try:
                proc.terminate()
            except Exception:
                pass
    _PROCS.clear()
