import { StreamingProvider } from "./vnc.mjs";

// WebRTC streaming path (the low-latency stack real cloud-gaming platforms use:
// GPU-encoded video + audio + controller, relayed via the agent-outbound
// signaling server). Falls back to VNC elsewhere. Experimental on Colab.
export class WebRTCStreamingProvider extends StreamingProvider {
  async start(opts) {
    if (this.manager.providerKind !== "colab") {
      throw new Error("WebRTC streaming is only available for the Colab runtime.");
    }
    const room = this.manager.sessionId || "default";
    const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    this.manager.sendToAgent({ type: "start_webrtc", payload: { room, iceServers } });
    const res = await this.manager.waitAgentEvent("webrtc_ready", 30000);
    if (res && (res.ok === false || res.error)) {
      throw new Error(res.error || "WebRTC stream failed to start on the Colab agent.");
    }
    this.manager.notify("Desktop stream started (WebRTC).", "success");
    return {
      type: "webrtc",
      signalingUrl: "/ws/signal",
      room,
      iceServers,
      resolution: opts.resolution,
      fps: opts.fps,
      quality: opts.quality,
    };
  }
}
