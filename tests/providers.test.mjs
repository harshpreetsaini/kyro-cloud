import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createComputeProvider } from "../lib/providers/compute/index.mjs";
import { createStreamingProvider } from "../lib/providers/streaming/index.mjs";
import { getManager } from "../lib/runtime/manager.mjs";

describe("provider factory", () => {
  it("returns mock compute provider by default", () => {
    const p = createComputeProvider("mock", getManager());
    assert.equal(p.constructor.name, "MockComputeProvider");
  });
  it("returns local compute provider", () => {
    const p = createComputeProvider("local", getManager());
    assert.equal(p.constructor.name, "LocalComputeProvider");
  });
  it("returns colab compute provider", () => {
    const p = createComputeProvider("colab", getManager());
    assert.equal(p.constructor.name, "ColabComputeProvider");
  });
  it("returns vnc streaming provider", () => {
    const p = createStreamingProvider("vnc", getManager());
    assert.equal(p.constructor.name, "VNCStreamingProvider");
  });
  it("returns webrtc streaming provider", () => {
    const p = createStreamingProvider("webrtc", getManager());
    assert.equal(p.constructor.name, "WebRTCStreamingProvider");
  });
});

describe("runtime manager", () => {
  it("starts in OFFLINE state with a session id shape", () => {
    const m = getManager();
    assert.equal(m.state, "OFFLINE");
    const info = m.sessionInfo();
    assert.ok(Array.isArray(info.progress));
    assert.equal(info.simulated, m.providerKind === "mock");
  });
});
