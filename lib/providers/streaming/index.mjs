import { VNCStreamingProvider } from "./vnc.mjs";
import { WebRTCStreamingProvider } from "./webrtc.mjs";

export function createStreamingProvider(kind, manager) {
  switch (kind) {
    case "webrtc":
      return new WebRTCStreamingProvider(manager);
    case "vnc":
    default:
      return new VNCStreamingProvider(manager);
  }
}
