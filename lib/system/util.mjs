import { exec, execSync } from "child_process";
import { promisify } from "util";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const run = promisify(exec);

export function which(bin) {
  try {
    const p = execSync(`command -v ${bin}`, { stdio: ["ignore", "pipe", "ignore"] });
    return p.toString().trim() || null;
  } catch {
    return null;
  }
}

export class ProcessTracker {
  constructor() {
    this.procs = [];
  }
  add(proc) {
    this.procs.push(proc);
    return proc;
  }
  async killAll() {
    for (const p of this.procs) {
      try {
        if (!p.killed) p.kill("SIGTERM");
      } catch {}
    }
    await sleep(300);
    for (const p of this.procs) {
      try {
        if (!p.killed) p.kill("SIGKILL");
      } catch {}
    }
    this.procs = [];
  }
}
