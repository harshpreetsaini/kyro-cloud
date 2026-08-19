import { ProcessTracker } from "../../system/util.mjs";

export class ComputeProvider {
  constructor(manager) {
    this.manager = manager;
    this.tracker = new ProcessTracker();
  }
  async start() {
    throw new Error("not implemented");
  }
  async stop() {
    await this.tracker.killAll();
  }
}
