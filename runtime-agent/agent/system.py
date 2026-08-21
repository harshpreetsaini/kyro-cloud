import subprocess
import os


def _run(cmd: str):
    try:
        return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
    except Exception:
        return None


def _cpu_model() -> str | None:
    try:
        import platform
        m = platform.processor()
        if m:
            return m
    except Exception:
        pass
    r = _run("grep -m1 'model name' /proc/cpuinfo")
    if r and r.returncode == 0 and r.stdout.strip():
        return r.stdout.strip().split(":", 1)[1].strip()
    return None


def detect_gpu() -> dict:
    r = _run(
        "nvidia-smi --query-gpu=name,memory.total,memory.used,driver_version,temperature.gpu,utilization.gpu,utilization.memory "
        "--format=csv,noheader,nounits"
    )
    if r and r.returncode == 0 and r.stdout.strip():
        p = [x.strip() for x in r.stdout.strip().split(",")]
        try:
            total = int(float(p[1]))
            used = int(float(p[2])) if p[2] else None
            return {
                "name": p[0],
                "vramMb": total,
                "usedMb": used,
                "freeMb": (total - used) if used is not None else None,
                "driver": p[3],
                "temperatureC": float(p[4]) if p[4] else None,
                "utilizationPct": float(p[5]) if p[5] else None,
                "memoryUtilPct": float(p[6]) if p[6] else None,
                "available": True,
            }
        except Exception:
            return {"available": True, "name": p[0]}
    return {"available": False}


def _net_rates():
    try:
        import time
        import psutil

        cur = psutil.net_io_counters()
        now = time.time()
        prev = getattr(_net_rates, "_prev", None)
        if prev is not None and (now - prev[0]) > 0:
            dt = now - prev[0]
            up = max(0.0, (cur.bytes_sent - prev[1]) / dt)
            down = max(0.0, (cur.bytes_recv - prev[2]) / dt)
        else:
            up = down = 0.0
        _net_rates._prev = (now, cur.bytes_sent, cur.bytes_recv)

        total_bps = up + down
        # Quality reflects connection health, not raw idle throughput.
        # The control WebSocket always has some tiny traffic — that is healthy,
        # not "poor". Only sustained low/zero throughput with a dead link is bad.
        if total_bps == 0:
            # No traffic at all this interval but the agent is connected & reporting
            quality = "good"
        elif total_bps < 200_000:
            # Control-channel only (keepalives, status) — connection is healthy
            quality = "good"
        elif total_bps < 1_000_000:
            quality = "fair"
        elif total_bps < 5_000_000:
            quality = "good"
        else:
            quality = "excellent"

        return {
            "upBps": round(up, 1),
            "downBps": round(down, 1),
            "state": "up" if (up or down) else "idle",
            "quality": quality,
        }
    except Exception:
        return {"upBps": None, "downBps": None, "state": None, "quality": "unknown"}


def system_info() -> dict:
    gpu = detect_gpu()
    info = {
        "gpu": gpu,
        "cpu": {"model": _cpu_model(), "cores": os.cpu_count()},
        "ram": {"totalMb": None, "usedMb": None},
        "storage": {"totalMb": None, "usedMb": None, "mounted": False},
        "network": {"pingMs": None, "bitrateMbps": None, "quality": "unknown", "upBps": None, "downBps": None, "state": None},
        "os": "Linux",
        "hostname": os.uname().nodename,
    }
    try:
        import psutil

        vm = psutil.virtual_memory()
        info["ram"] = {"totalMb": vm.total // (1024 * 1024), "usedMb": vm.used // (1024 * 1024)}
        du = psutil.disk_usage("/")
        info["storage"] = {
            "totalMb": du.total // (1024 * 1024),
            "usedMb": du.used // (1024 * 1024),
            "mounted": True,
        }
        nr = _net_rates()
        info["network"]["upBps"] = nr["upBps"]
        info["network"]["downBps"] = nr["downBps"]
        info["network"]["state"] = nr["state"]
        info["network"]["quality"] = nr["quality"]
    except Exception:
        pass
    return info


def collect_stats() -> dict:
    stats: dict = {}
    try:
        import psutil
        import time

        stats["cpuPct"] = psutil.cpu_percent(interval=0)
        vm = psutil.virtual_memory()
        stats["ramUsedMb"] = vm.used // (1024 * 1024)
        stats["ramTotalMb"] = vm.total // (1024 * 1024)
        gpu = detect_gpu()
        if gpu.get("available"):
            stats["gpuPct"] = gpu.get("utilizationPct")
            stats["gpuTempC"] = gpu.get("temperatureC")
            if gpu.get("vramMb") is not None:
                stats["vramUsedMb"] = gpu.get("usedMb")
                stats["vramTotalMb"] = gpu.get("vramMb")
        nr = _net_rates()
        stats["netUpBps"] = nr["upBps"]
        stats["netDownBps"] = nr["downBps"]
        stats["netState"] = nr["state"]
        stats["quality"] = nr["quality"]

        # During streaming the video is the agent's UPLOAD (agent -> backend).
        # Use the larger of up/down so the stream bitrate is reported correctly.
        stream_bps = max(nr["upBps"] or 0, nr["downBps"] or 0)
        if stream_bps > 0:
            stats["bitrateMbps"] = round(stream_bps * 8 / 1_000_000, 2)
        else:
            stats["bitrateMbps"] = None

        streaming_active = False
        fps = None

        # Check GStreamer FPS
        try:
            import streaming
            gst_fps = getattr(streaming, '_gstreamer_fps', 0)
            if gst_fps > 0:
                fps = round(gst_fps, 1)
                streaming_active = True
        except Exception:
            pass

        # Check if x11vnc is running (VNC streaming)
        if not streaming_active:
            try:
                r = subprocess.run(["pgrep", "-f", "x11vnc"], capture_output=True, timeout=5)
                if r.returncode == 0:
                    streaming_active = True
            except Exception:
                pass

        # Check if selkies is running
        if not streaming_active:
            try:
                r = subprocess.run(["pgrep", "-f", "selkies"], capture_output=True, timeout=5)
                if r.returncode == 0:
                    streaming_active = True
            except Exception:
                pass

        stats["streaming"] = streaming_active
        if fps is not None:
            stats["fps"] = fps
        else:
            stats["fps"] = None

        # Disk info
        try:
            du = psutil.disk_usage("/")
            stats["storageTotalMb"] = du.total // (1024 * 1024)
            stats["storageUsedMb"] = du.used // (1024 * 1024)
        except Exception:
            pass

    except Exception:
        pass
    return stats
