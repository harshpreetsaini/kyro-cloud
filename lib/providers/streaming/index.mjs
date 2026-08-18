import { VNCStreamingProvider } from "./vnc.mjs";
import { WebRTCStreamingProvider } from "./webrtc.mjs";
import { GStreamerStreamingProvider } from "./gstreamer.mjs";

export function createStreamingProvider(kind, manager) {
  switch (kind) {
    case "gstreamer":
      return new GStreamerStreamingProvider(manager);
    case "webrtc":
      return new WebRTCStreamingProvider(manager);
    case "vnc":
    default:
      return new VNCStreamingProvider(manager);
  }
}
