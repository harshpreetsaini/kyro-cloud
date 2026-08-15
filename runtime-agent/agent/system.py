import subprocess
import os


def _run(cmd: str):
    try:
        return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
    except Exception:
        return None


def detect_gpu() -> dict:
    r = _run(
        "nvidia-smi --query-gpu=name,memory.total,driver_version,temperature.gpu,utilization.gpu,utilization.memory "
        "--format=csv,noheader,nounits"
    )
    if r and r.returncode == 0 and r.stdout.strip():
        p = [x.strip() for x in r.stdout.strip().split(",")]
        try:
            return {
                "name": p[0],
                "vramMb": int(float(p[1])),
                "driver": p[2],
                "temperatureC": float(p[3]) if p[3] else None,
                "utilizationPct": float(p[4]) if p[4] else None,
                "memoryUtilPct": float(p[5]) if p[5] else None,
                "available": True,
            }
        except Exception:
            return {"available": True, "name": p[0]}
    return {"available": False}


def system_info() -> dict:
    gpu = detect_gpu()
    info = {
        "gpu": gpu,
        "cpu": {"model": None, "cores": os.cpu_count()},
        "ram": {"totalMb": None, "usedMb": None},
        "storage": {"totalMb": None, "usedMb": None, "mounted": False},
        "network": {"pingMs": None, "bitrateMbps": None, "quality": "unknown"},
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
    except Exception:
        pass
    return info


def collect_stats() -> dict:
    stats: dict = {}
    try:
        import psutil

        stats["cpuPct"] = psutil.cpu_percent()
        vm = psutil.virtual_memory()
        stats["ramUsedMb"] = vm.used // (1024 * 1024)
        stats["ramTotalMb"] = vm.total // (1024 * 1024)
        gpu = detect_gpu()
        if gpu.get("available"):
            stats["gpuPct"] = gpu.get("utilizationPct")
            stats["gpuTempC"] = gpu.get("temperatureC")
            if gpu.get("vramMb"):
                stats["vramUsedMb"] = int((gpu.get("memoryUtilPct", 0) / 100) * gpu["vramMb"])
                stats["vramTotalMb"] = gpu["vramMb"]
    except Exception:
        pass
    return stats
