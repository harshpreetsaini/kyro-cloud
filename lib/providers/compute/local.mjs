import { ComputeProvider } from "./types.mjs";
import { sleep, ProcessTracker } from "../../system/util.mjs";
import { collectGpu, collectSystem } from "../../system/collect.mjs";
import os from "os";
import { spawn } from "child_process";

export class LocalComputeProvider extends ComputeProvider {
  constructor(manager) {
    super(manager);
    this.tracker = new ProcessTracker();
    this.timers = [];
  }

  async start() {
    const m = this.manager;
    m.transition("INITIALIZING");
    m.setProgress(0, "active");
    const gpu = await collectGpu();
    const sys = await collectSystem();
    m.setSystemInfo({
      os: "Linux (local)",
      hostname: os.hostname(),
      gpu,
      cpu: { model: null, cores: os.cpus().length, utilizationPct: null },
      ram: sys.ram,
      storage: sys.storage,
      network: { pingMs: null, bitrateMbps: null, quality: "unknown" },
    });
    m.setProgress(0, "done");

    m.transition("PREPARING");
    m.setProgress(1, "active");
    await sleep(600);
    m.setProgress(1, "done");

    m.transition("CONNECTING");
    m.setProgress(2, "active");
    m.transition("ONLINE");
    m.setProgress(2, "done");

    m.setProgress(3, "active");
    await m.startStreaming();
    m.setProgress(3, "done");

    this._startStats();
  }

  _startStats() {
    const m = this.manager;
    const t = setInterval(async () => {
      const gpu = await collectGpu();
      const sys = await collectSystem();
      m.setSystemInfo({ gpu, ram: sys.ram, storage: sys.storage });
      m.setStats({
        gpuPct: gpu.utilizationPct,
        gpuTempC: gpu.temperatureC,
        cpuPct: sys.cpu.utilizationPct,
        ramUsedMb: sys.ram.usedMb,
        ramTotalMb: sys.ram.totalMb,
        vramUsedMb:
          gpu.memoryUtilPct != null && gpu.vramMb
            ? Math.round((gpu.memoryUtilPct / 100) * gpu.vramMb)
            : null,
        vramTotalMb: gpu.vramMb,
        fps: null,
        frameTimeMs: null,
        latencyMs: null,
        bitrateMbps: null,
        streaming: m.state === "STREAMING",
      });
    }, 2000);
    this.timers.push(t);
  }

  async stop() {
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
    await super.stop();
  }

  launchGame(payload) {
    const exe = payload.executable;
    if (!exe) return false;
    const env = { ...process.env, DISPLAY: ":1" };
    const proc = spawn(
      exe,
      payload.arguments ? payload.arguments.split(/\s+/).filter(Boolean) : [],
      { env, cwd: payload.workingDir || undefined, stdio: "ignore" }
    );
    this.tracker.add(proc);
    return true;
  }
}
