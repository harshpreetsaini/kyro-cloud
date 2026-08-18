import { StreamingProvider } from "./vnc.mjs";

/**
 * GStreamer GPU-accelerated streaming provider for Colab.
 *
 * Instead of x11vnc (software RFB), this uses GStreamer with NVENC (GPU) or
 * x264enc (software) to encode the Xvfb display as H.264.  The encoded
 * bitstream is tunneled over the agent's outbound WebSocket and decoded by
 * the browser using WebCodecs — significantly lower latency.
 *
 * Falls back to VNC if GStreamer is unavailable on the agent.
 */
export class GStreamerStreamingProvider extends StreamingProvider {
  constructor(manager) {
    super(manager);
  }

  async start(opts) {
    const m = this.manager;
    if (m.providerKind === "colab") {
      // Tell the Colab agent to start GStreamer encoding and tunnel it back.
      m.sendToAgent({ type: "start_gstreamer", payload: opts });
      const res = await m.waitAgentEvent("gst_ready", 30000);
      if (res && (res.ok === false || res.error)) {
        // GStreamer failed — fall back to VNC.
        m.notify("GStreamer unavailable, falling back to VNC.", "warning");
        m.sendToAgent({ type: "start_vnc", payload: opts });
        const vncRes = await m.waitAgentEvent("vnc_ready", 30000);
        if (vncRes && (vncRes.ok === false || vncRes.error)) {
          throw new Error(vncRes.error || "VNC stream failed to start.");
        }
        return {
          type: "vnc",
          url: "/ws/stream",
          password: null,
          resolution: opts.resolution,
          fps: opts.fps,
          quality: opts.quality,
        };
      }
      m.notify("Desktop stream started (GStreamer GPU encoding).", "success");
      return {
        type: "gstreamer",
        url: "/ws/stream",
        encoder: res?.encoder || "unknown",
        fps: opts.fps,
        resolution: opts.resolution,
        quality: opts.quality,
      };
    }
    // Non-Colab: not implemented (use VNC provider instead).
    throw new Error("GStreamer provider only supports Colab compute.");
  }
}
