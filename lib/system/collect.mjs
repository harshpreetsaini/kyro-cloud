import { run, which } from "./util.mjs";

let cachedPaths = null;
function tools() {
  if (cachedPaths) return cachedPaths;
  cachedPaths = {
    nvidiaSmi: which("nvidia-smi"),
    free: which("free"),
    xvnc: which("Xvnc") || which("xvnc"),
  };
  return cachedPaths;
}

export async function collectGpu() {
  const { nvidiaSmi } = tools();
  if (!nvidiaSmi) {
    return {
      name: null,
      vramMb: null,
      driver: null,
      temperatureC: null,
      utilizationPct: null,
      memoryUtilPct: null,
      available: false,
    };
  }
  try {
    const { stdout } = await run(
      `${nvidiaSmi} --query-gpu=name,memory.total,driver_version,temperature.gpu,utilization.gpu,utilization.memory --format=csv,noheader,nounits`
    );
    const parts = stdout.trim().split(",").map((s) => s.trim());
    if (parts.length < 6) return { available: false };
    return {
      name: parts[0],
      vramMb: Number(parts[1]) || null,
      driver: parts[2] || null,
      temperatureC: Number(parts[3]) || null,
      utilizationPct: Number(parts[4]) || null,
      memoryUtilPct: Number(parts[5]) || null,
      available: true,
    };
  } catch {
    return { available: false };
  }
}

export async function collectSystem() {
  const info = {
    cpu: { model: null, cores: null, utilizationPct: null },
    ram: { totalMb: null, usedMb: null },
    storage: { totalMb: null, usedMb: null, mounted: false },
    network: { pingMs: null, bitrateMbps: null, quality: "unknown" },
  };
  try {
    if (tools().free) {
      const { stdout } = await run(`${tools().free} -m`);
      const lines = stdout.split("\n");
      const mem = lines.find((l) => l.startsWith("Mem:"));
      if (mem) {
        const f = mem.split(/\s+/);
        info.ram.totalMb = Number(f[1]) || null;
        info.ram.usedMb = Number(f[2]) || null;
      }
    }
  } catch {}
  try {
    const { stdout } = await run("df -m / 2>/dev/null | tail -1");
    const f = stdout.split(/\s+/);
    if (f.length >= 4) {
      info.storage.totalMb = Number(f[1]) || null;
      info.storage.usedMb = Number(f[2]) || null;
    }
  } catch {}
  return info;
}
