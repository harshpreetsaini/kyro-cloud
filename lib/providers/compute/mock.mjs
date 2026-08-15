import { ComputeProvider } from "./types.mjs";
import { sleep } from "../../system/util.mjs";

export class MockComputeProvider extends ComputeProvider {
  constructor(manager) {
    super(manager);
    this.timers = [];
  }

  async start() {
    const m = this.manager;
    m.transition("INITIALIZING");
    m.setProgress(0, "active");
    await sleep(900);
    m.setSystemInfo({
      os: "Linux 6.8 (simulated)",
      hostname: "luna-mock",
      gpu: {
        name: "NVIDIA GeForce RTX 4070 (simulated)",
        vramMb: 12288,
        driver: "535.86.05 (sim)",
        temperatureC: null,
        utilizationPct: null,
        memoryUtilPct: null,
        available: true,
      },
      cpu: { model: "AMD Ryzen 9 7940X (sim)", cores: 16, utilizationPct: null },
      ram: { totalMb: 32768, usedMb: null },
      storage: { totalMb: 204800, usedMb: 54200, mounted: true },
      network: { pingMs: 24, bitrateMbps: 18, quality: "good" },
    });
    m.setProgress(0, "done");

    m.transition("PREPARING");
    m.setProgress(1, "active");
    await sleep(900);
    m.setProgress(1, "done");

    m.transition("CONNECTING");
    m.setProgress(2, "active");
    await sleep(900);
    m.setProgress(2, "done");

    m.setProgress(3, "active");
    await sleep(700);
    m.setProgress(3, "done");

    m.transition("ONLINE");
    await m.startStreaming();
    this._startStats();
  }

  _startStats() {
    const m = this.manager;
    const t = setInterval(() => {
      const s = Date.now() / 1000;
      m.setStats({
        gpuPct: Math.round(40 + 30 * Math.abs(Math.sin(s / 3))),
        gpuTempC: Math.round(60 + 8 * Math.abs(Math.sin(s / 5))),
        cpuPct: Math.round(30 + 25 * Math.abs(Math.sin(s / 2))),
        ramUsedMb: Math.round(8000 + 1500 * Math.abs(Math.sin(s / 4))),
        ramTotalMb: 32768,
        vramUsedMb: Math.round(2000 + 1500 * Math.abs(Math.sin(s / 3))),
        vramTotalMb: 12288,
        fps: 60,
        frameTimeMs: 16.7,
        latencyMs: Math.round(24 + 6 * Math.abs(Math.sin(s / 3))),
        bitrateMbps: Math.round(18 + 4 * Math.abs(Math.sin(s / 2))),
        streaming: true,
      });
    }, 1500);
    this.timers.push(t);
  }

  async stop() {
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
    await super.stop();
  }
}
