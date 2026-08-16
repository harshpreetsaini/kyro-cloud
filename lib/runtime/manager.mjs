import { createComputeProvider } from "../providers/compute/index.mjs";
import { createStreamingProvider } from "../providers/streaming/index.mjs";
import { getGame } from "../games/library.mjs";

const PROGRESS_STEPS = [
  { label: "Initializing GPU", status: "pending" },
  { label: "Preparing desktop", status: "pending" },
  { label: "Starting streaming service", status: "pending" },
  { label: "Establishing connection", status: "pending" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export class RuntimeManager {
  constructor() {
    this.state = "OFFLINE";
    this.sessionId = null;
    this.startedAt = null;
    this.durationMs = null;
    this.providerKind = process.env.COMPUTE_PROVIDER || "mock";
    this.streamingKind = process.env.STREAMING_PROVIDER || "vnc";
    this.simulated = this.providerKind === "mock";
    this.progress = PROGRESS_STEPS.map((s) => ({ ...s }));
    this.systemInfo = this._emptyInfo();
    this.stats = this._emptyStats();
    this.stream = null;
    this.error = null;
    this.provider = null;
    this.streaming = null;
    this.agentWs = null;
    this.agentAttached = false;
    this._waiters = [];
    this._broadcast = null;
    this._busy = false;
    this.lastHeartbeat = 0;
    this.expectAgent = false;
    this._hbTimer = null;
    this.heartbeatTimeout = Number(process.env.HEARTBEAT_TIMEOUT_MS || 20000);
  }

  _activeState() {
    return ["STARTING", "INITIALIZING", "PREPARING", "CONNECTING", "ONLINE", "STREAMING", "RECONNECTING"].includes(this.state);
  }

  _startHeartbeatWatchdog() {
    this._stopHeartbeatWatchdog();
    this._hbTimer = setInterval(() => {
      if (!this.expectAgent) return;
      if (this._activeState() && Date.now() - this.lastHeartbeat > this.heartbeatTimeout) {
        this.lastHeartbeat = 0;
        this.transition("DISCONNECTED", "Runtime disconnected — the Colab session ended.");
        this.notify("Runtime disconnected. Start a new session to reconnect.", "error");
      }
    }, 5000);
  }

  _stopHeartbeatWatchdog() {
    if (this._hbTimer) {
      clearInterval(this._hbTimer);
      this._hbTimer = null;
    }
  }

  _emptyInfo() {
    return {
      os: null,
      hostname: null,
      gpu: { name: null, vramMb: null, driver: null, temperatureC: null, utilizationPct: null, memoryUtilPct: null, available: false },
      cpu: { model: null, cores: null, utilizationPct: null },
      ram: { totalMb: null, usedMb: null },
      storage: { totalMb: null, usedMb: null, mounted: false },
      network: { pingMs: null, bitrateMbps: null, quality: "unknown" },
      simulated: this.simulated,
    };
  }

  _emptyStats() {
    return {
      gpuPct: null, gpuTempC: null, cpuPct: null,
      ramUsedMb: null, ramTotalMb: null, vramUsedMb: null, vramTotalMb: null,
      fps: null, frameTimeMs: null, latencyMs: null, bitrateMbps: null, streaming: false,
    };
  }

  attachBroadcaster(fn) {
    this._broadcast = fn;
  }

  broadcast(event) {
    if (this._broadcast) this._broadcast(event);
  }

  notify(message, level = "info") {
    this.broadcast({ type: "notification", payload: { message, level }, ts: Date.now() });
  }

  transition(next, note) {
    this.state = next;
    this.broadcast({ type: "runtime.status", payload: this.sessionInfo(), ts: Date.now() });
    if (note) this.notify(note, "info");
  }

  setProgress(index, status) {
    if (this.progress[index]) {
      this.progress[index].status = status;
      this.broadcast({ type: "runtime.progress", payload: this.progress, ts: Date.now() });
    }
  }

  setSystemInfo(info) {
    this.systemInfo = { ...this.systemInfo, ...info, simulated: this.simulated };
    this.broadcast({ type: "system.info", payload: this.systemInfo, ts: Date.now() });
  }

  setStats(stats) {
    this.stats = { ...this.stats, ...stats };
    this.broadcast({ type: "system.stats", payload: this.stats, ts: Date.now() });
  }

  setStream(config) {
    this.stream = config;
    this.broadcast({ type: "stream.status", payload: config, ts: Date.now() });
  }

  setStreamTarget(target) {
    this.streamTarget = target;
  }

  sessionInfo() {
    return {
      id: this.sessionId,
      state: this.state,
      startedAt: this.startedAt,
      durationMs: this.startedAt ? Date.now() - this.startedAt : null,
      provider: this.providerKind,
      streaming: this.streamingKind,
      simulated: this.simulated,
      progress: this.progress,
      error: this.error,
    };
  }

  async start() {
    if (this._busy) return { ok: false, error: "Runtime action already in progress" };
    if (["STARTING", "INITIALIZING", "PREPARING", "CONNECTING", "ONLINE", "STREAMING"].includes(this.state))
      return { ok: false, error: "Runtime already active" };
    this._busy = true;
    this.error = null;
    this.sessionId = uid();
    this.startedAt = Date.now();
    this.progress = PROGRESS_STEPS.map((s) => ({ ...s }));
    this.systemInfo = this._emptyInfo();
    this.stats = this._emptyStats();
    this.stream = null;
    try {
      this.transition("STARTING", "Starting your cloud PC...");
      this.provider = createComputeProvider(this.providerKind, this);
      if (this.providerKind === "colab") {
        this.expectAgent = true;
        this.lastHeartbeat = 0;
        this._startHeartbeatWatchdog();
      }
      await this.provider.start();
      return { ok: true, data: this.sessionInfo() };
    } catch (err) {
      this.error = String(err && err.message ? err.message : err);
      this.transition("ERROR", "Runtime failed to start");
      return { ok: false, error: this.error };
    } finally {
      this._busy = false;
    }
  }

  async startStreaming() {
    try {
      this.streaming = createStreamingProvider(this.streamingKind, this);
      const config = await this.streaming.start({
        resolution: process.env.STREAM_RESOLUTION || "1080p",
        fps: Number(process.env.STREAM_FPS || 60),
        quality: process.env.STREAM_QUALITY || "balanced",
      });
      this.setStream(config);
      this.transition("STREAMING", "Streaming ready");
      return config;
    } catch (err) {
      this.error = String(err && err.message ? err.message : err);
      this.notify("Streaming failed: " + this.error, "error");
      this.transition("ERROR", "Streaming failed");
      throw err;
    }
  }

  async stop() {
    if (this._busy && this.state !== "STOPPING") return { ok: false, error: "Runtime action in progress" };
    this._busy = true;
    try {
      this.expectAgent = false;
      this._stopHeartbeatWatchdog();
      this.transition("STOPPING", "Stopping session...");
      if (this.streaming) { try { await this.streaming.stop(); } catch {} this.streaming = null; }
      if (this.provider) { try { await this.provider.stop(); } catch {} this.provider = null; }
      this.durationMs = this.startedAt ? Date.now() - this.startedAt : null;
      this.transition("OFFLINE", "Session stopped");
      return { ok: true, data: this.sessionInfo() };
    } finally {
      this._busy = false;
    }
  }

  async restart() {
    await this.stop();
    return this.start();
  }

  attachAgent(ws) {
    this.agentWs = ws;
    this.agentAttached = true;
    this.broadcast({ type: "runtime.status", payload: this.sessionInfo(), ts: Date.now() });
  }

  detachAgent() {
    if (this.agentWs) this.agentWs = null;
    this.agentAttached = false;
  }

  // Resolves immediately if the agent is already connected, otherwise waits for it.
  // (The agent sends "ready" once on connect, so callers must not rely on waitAgentEvent("ready").)
  async waitForAgent(timeoutMs = 5 * 60 * 1000) {
    if (this.agentAttached) return true;
    return this.waitAgentEvent("agent_attached", timeoutMs);
  }

  sendToAgent(msg) {
    if (this.agentWs && this.agentWs.readyState === 1) {
      this.agentWs.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  launchGame(id) {
    const g = getGame(id);
    if (!g) return { ok: false, error: "Game not found" };
    const payload = {
      id: g.id,
      name: g.name,
      executable: g.executable,
      arguments: g.arguments,
      workingDir: g.workingDir,
    };
    if (this.provider && typeof this.provider.launchGame === "function") {
      this.provider.launchGame(payload);
      return { ok: true, data: g };
    }
    this.sendToAgent({ type: "launch_game", payload });
    return { ok: true, data: g };
  }

  waitAgentEvent(type, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._waiters = this._waiters.filter((w) => w !== wobj);
        reject(new Error("timeout waiting for agent event: " + type));
      }, timeoutMs);
      const wobj = {
        type,
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      };
      this._waiters.push(wobj);
    });
  }

  emitAgentEvent(type, payload) {
    for (const w of [...this._waiters]) {
      if (w.type === type) {
        this._waiters = this._waiters.filter((x) => x !== w);
        w.resolve(payload);
      }
    }
    if (["ready", "agent_attached", "agent_disconnected", "desktop_ready", "stream_ready", "stats", "system_info", "pong"].includes(type)) {
      this.lastHeartbeat = Date.now();
    }
    if (type === "agent_disconnected") {
      this.lastHeartbeat = 0;
      this.expectAgent = false;
      if (this._activeState() || this.state === "DISCONNECTED") {
        this.transition("DISCONNECTED", "Runtime disconnected — the Colab session ended.");
        this.notify("Runtime disconnected. Start a new session to reconnect.", "error");
      }
    }
    if (type === "system_info") this.setSystemInfo(payload);
    else if (type === "stats") this.setStats(payload);
  }
}

export function getManager() {
  if (!globalThis.__LUNA_MANAGER__) {
    globalThis.__LUNA_MANAGER__ = new RuntimeManager();
  }
  return globalThis.__LUNA_MANAGER__;
}
