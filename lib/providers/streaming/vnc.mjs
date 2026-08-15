import { spawn } from "child_process";
import { ProcessTracker, which, sleep } from "../../system/util.mjs";

const DISPLAY = ":1";
const VNC_PORT = 5901;

export class StreamingProvider {
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

export class VNCStreamingProvider extends StreamingProvider {
  constructor(manager) {
    super(manager);
    this.xvncPath = null;
    this.wmPath = null;
  }

  _detect() {
    this.xvncPath = which("Xvnc") || which("xvnc");
    this.wmPath =
      which("xfce4-session") || which("openbox") || which("lxsession") || which("twm");
    return Boolean(this.xvncPath && this.wmPath);
  }

  async start(opts) {
    if (!this._detect()) {
      if (this.manager.providerKind === "mock") {
        this.manager.notify(
          "No local VNC desktop available — showing simulated stream (install tigervnc + xfce4 for a real desktop).",
          "warning"
        );
        return {
          type: "vnc",
          url: "/ws/stream",
          simulated: true,
          password: null,
          resolution: opts.resolution,
          fps: opts.fps,
          quality: opts.quality,
        };
      }
      throw new Error(
        "Missing Xvnc or a desktop environment. Install: sudo apt-get install -y tigervnc-standalone-server xfce4"
      );
    }

    this.tracker.add(
      spawn(this.xvncPath, [
        DISPLAY,
        "-geometry",
        "1920x1080",
        "-depth",
        "24",
        "-SecurityTypes",
        "None",
        "-localhost",
      ])
    );
    await sleep(1200);
    this.tracker.add(spawn(this.wmPath, [], { env: { ...process.env, DISPLAY } }));
    await sleep(1200);

    this.manager.setStreamTarget({ host: "127.0.0.1", port: VNC_PORT });
    this.manager.notify("Desktop stream started (VNC).", "success");

    return {
      type: "vnc",
      url: "/ws/stream",
      target: { host: "127.0.0.1", port: VNC_PORT },
      password: null,
      resolution: opts.resolution,
      fps: opts.fps,
      quality: opts.quality,
    };
  }
}
