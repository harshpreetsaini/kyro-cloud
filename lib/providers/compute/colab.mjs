import { ComputeProvider } from "./types.mjs";
import { sleep } from "../../system/util.mjs";

const AGENT_TIMEOUT_MS = 5 * 60 * 1000;

export class ColabComputeProvider extends ComputeProvider {
  constructor(manager) {
    super(manager);
    this.display = ":1";
  }

  async start() {
    const m = this.manager;
    m.transition("STARTING");
    m.setProgress(0, "active");

    let attached = false;
    try {
      await m.waitForAgent(AGENT_TIMEOUT_MS);
      attached = true;
    } catch {
      attached = false;
    }
    if (!attached) {
      m.setProgress(0, "error");
      throw new Error(
        "Colab runtime agent did not connect. Run the LUNA CLOUD Colab bootstrap notebook to link this session."
      );
    }
    m.setProgress(0, "done");
    m.transition("RUNTIME_CONNECTED");
    m.transition("GPU_READY");

    m.transition("PREPARING");
    m.setProgress(1, "active");
    m.sendToAgent({ type: "prepare_desktop", payload: { display: this.display } });
    try {
      await m.waitAgentEvent("desktop_ready", AGENT_TIMEOUT_MS);
    } catch {
      m.setProgress(1, "error");
      throw new Error("Colab agent failed to prepare the desktop environment.");
    }
    m.setProgress(1, "done");
    m.transition("DESKTOP_READY");

    m.transition("STREAM_STARTING");
    m.setProgress(2, "active");
    m.setProgress(3, "active");
    try {
      await m.startStreaming();
    } catch {
      m.setProgress(2, "error");
      m.setProgress(3, "error");
      throw new Error("Colab agent failed to start the streaming service (VNC).");
    }
    m.setProgress(2, "done");
    m.setProgress(3, "done");
  }

  async stop() {
    this.manager.sendToAgent({ type: "stop", payload: {} });
    await super.stop();
  }
}
