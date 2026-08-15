import { StreamingProvider } from "./vnc.mjs";

const STREAM_TIMEOUT_MS = 5 * 60 * 1000;

export class WebRTCStreamingProvider extends StreamingProvider {
  constructor(manager) {
    super(manager);
  }

  async start(opts) {
    const m = this.manager;
    m.sendToAgent({
      type: "start_stream",
      payload: { resolution: opts.resolution, fps: opts.fps, quality: opts.quality },
    });

    let ready = null;
    try {
      ready = await m.waitAgentEvent("stream_ready", STREAM_TIMEOUT_MS);
    } catch {
      throw new Error("Colab agent did not start the WebRTC stream (Selkies).");
    }

    return {
      type: "webrtc",
      signalingUrl: ready?.signalingUrl || null,
      iceServers: ready?.iceServers || [{ urls: "stun:stun.l.google.com:19302" }],
      password: null,
      resolution: opts.resolution,
      fps: opts.fps,
      quality: opts.quality,
    };
  }

  async stop() {
    this.manager.sendToAgent({ type: "stop_stream", payload: {} });
    await super.stop();
  }
}
