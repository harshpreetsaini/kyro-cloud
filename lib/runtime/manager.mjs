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
    this.vncTunnelWs = null;
    this.apps = {};
    this._waiters = [];
    this._broadcast = null;
    this._busy = false;
    this._generation = 0;
    this.lastHeartbeat = 0;
    this.expectAgent = false;
    this._hbTimer = null;
    this.heartbeatTimeout = Number(process.env.HEARTBEAT_TIMEOUT_MS || 30000);
  }

  _activeState() {
    return [
      "STARTING", "INITIALIZING", "PREPARING", "CONNECTING",
      "RUNTIME_CONNECTED", "GPU_READY", "DESKTOP_READY", "STREAM_STARTING", "STREAM_READY",
      "ONLINE", "STREAMING", "RECONNECTING",
    ].includes(this.state);
  }

  _startHeartbeatWatchdog() {
    this._stopHeartbeatWatchdog();
    this._hbTimer = setInterval(() => {
      if (!this.expectAgent) return;
      // Don't fire during STARTING — Colab bootstrap can take 30+ seconds
      if (this.state === "STARTING" || this.state === "INITIALIZING" || this.state === "PREPARING" || this.state === "CONNECTING") return;
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
      fps: null, frameTimeMs: null, bitrateMbps: null, streaming: false,
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
      stream: this.stream,
      error: this.error,
    };
  }

  async start() {
    if (this._busy) return { ok: false, error: "Runtime action already in progress" };
    // RUNTIME_CONNECTED means the agent is merely attached and ready to be
    // started by the user — it is NOT an already-active session.
    if ([
      "STARTING", "INITIALIZING", "PREPARING", "CONNECTING",
      "GPU_READY", "DESKTOP_READY", "STREAM_STARTING", "STREAM_READY",
      "ONLINE", "STREAMING",
    ].includes(this.state))
      return { ok: false, error: "Runtime already active" };
    this._busy = true;
    this.error = null;
    this.sessionId = uid();
    this.startedAt = Date.now();
    this._generation++;
    const gen = this._generation;
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
      }
      await this.provider.start();
      return { ok: true, data: this.sessionInfo() };
    } catch (err) {
      if (String(err && err.message) === "cancelled") {
        this.transition("OFFLINE", "Session stopped");
        return { ok: true, data: this.sessionInfo() };
      }
      this.error = String(err && err.message ? err.message : err);
      this.transition("ERROR", "Runtime failed to start");
      return { ok: false, error: this.error };
    } finally {
      this._busy = false;
    }
  }

  async startStreaming(userSettings = null) {
    try {
      // Colab uses GStreamer (GPU NVENC encoding) for low-latency streaming.
      // Falls back to VNC if GStreamer is unavailable.
      const streamingKind = this.providerKind === "colab" ? "gstreamer" : this.streamingKind;
      this.streaming = createStreamingProvider(streamingKind, this);

      // Use user settings if provided, otherwise fall back to env vars
      const settings = userSettings || {};
      const config = await this.streaming.start({
        resolution: settings.resolution || process.env.STREAM_RESOLUTION || "1080p",
        fps: Number(settings.fps || process.env.STREAM_FPS || 60),
        quality: settings.quality || process.env.STREAM_QUALITY || "balanced",
      });

      // Store current quality settings for adaptive adjustments
      this._currentQuality = {
        resolution: settings.resolution || "1080p",
        fps: Number(settings.fps || 60),
        quality: settings.quality || "balanced",
      };

      this.setStream(config);
      this.transition("STREAM_READY", "Stream ready");
      this.transition("STREAMING", "Streaming ready");
      return config;
    } catch (err) {
      this.error = String(err && err.message ? err.message : err);
      this.notify("Streaming failed: " + this.error, "error");
      this.transition("ERROR", "Streaming failed");
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // Adaptive quality control
  // ------------------------------------------------------------------

  adjustQuality(settings) {
    if (!this.agentAttached) {
      return { ok: false, error: "Agent not connected" };
    }

    // Merge with current quality settings
    const newQuality = {
      resolution: settings.resolution || this._currentQuality?.resolution || "1080p",
      fps: settings.fps || this._currentQuality?.fps || 60,
      quality: settings.quality || this._currentQuality?.quality || "balanced",
      network_quality: settings.network_quality,
    };

    // Update stored quality
    this._currentQuality = newQuality;

    // Send adjust_quality command to the agent
    this.sendToAgent({ type: "adjust_quality", payload: newQuality });
    return { ok: true, data: newQuality };
  }

  // Network-adaptive quality: auto-adjust based on network conditions
  _adaptToNetwork(networkQuality) {
    if (!this._currentQuality || !this.agentAttached) return;

    const adaptationMap = {
      "excellent": { quality: "high", resolution: this._currentQuality.resolution },
      "good":      { quality: "balanced", resolution: this._currentQuality.resolution },
      "fair":      { quality: "low", resolution: "720p" },
      "poor":      { quality: "low", resolution: "720p" },
    };

    const adapted = adaptationMap[networkQuality];
    if (!adapted) return;

    // Only adjust if the network quality is degrading and we haven't already adapted
    if (networkQuality === "fair" || networkQuality === "poor") {
      if (adapted.resolution !== this._currentQuality.resolution || adapted.quality !== this._currentQuality.quality) {
        console.log(`[manager] Adaptive quality: ${networkQuality} -> ${adapted.resolution}/${adapted.quality}`);
        this.adjustQuality({ ...adapted, network_quality: networkQuality });
      }
    }
  }

  async stop() {
    this._busy = true;
    try {
      this.expectAgent = false;
      this._stopHeartbeatWatchdog();
      this._stopPing();
      // Abort any in-progress start (e.g. waiting on the agent/stream) so Stop works immediately.
      if (this._waiters.length) {
        const waiters = [...this._waiters];
        this._waiters = [];
        for (const w of waiters) w.reject(new Error("cancelled"));
      }
      // Tell the agent to tear down the desktop/stream first (best effort).
      this.sendToAgent({ type: "stop", payload: {} });
      this.transition("STOPPING", "Stopping session...");
      if (this.streaming) { try { await this.streaming.stop(); } catch {} this.streaming = null; }
      if (this.provider) { try { await this.provider.stop(); } catch {} this.provider = null; }
      if (this.vncTunnelWs) { try { this.vncTunnelWs.close(); } catch {} this.vncTunnelWs = null; }

      // Fully reset all session state so the frontend cannot show anything stale.
      this.state = "OFFLINE";
      this.sessionId = null;
      this.startedAt = null;
      this.durationMs = null;
      this.error = null;
      this.progress = PROGRESS_STEPS.map((s) => ({ ...s }));
      this.systemInfo = this._emptyInfo();
      this.stats = this._emptyStats();
      this.stream = null;
      this.streamTarget = null;

      // Broadcast the clean slate so every client clears stream/telemetry/progress.
      this.broadcast({ type: "stream.status", payload: null, ts: Date.now() });
      this.broadcast({ type: "system.info", payload: this.systemInfo, ts: Date.now() });
      this.broadcast({ type: "system.stats", payload: this.stats, ts: Date.now() });
      this.broadcast({ type: "runtime.status", payload: this.sessionInfo(), ts: Date.now() });
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
    this.lastHeartbeat = Date.now();  // reset on fresh connection
    this._startPing();
    if (this.providerKind === "colab") {
      this._startHeartbeatWatchdog();  // start watchdog only after agent connects
    }
    if (
      !this._activeState() &&
      (this.state === "OFFLINE" || this.state === "STOPPED" || this.state === "DISCONNECTED")
    ) {
      this.transition("RUNTIME_CONNECTED", "Runtime connected — start your cloud PC.");
    }
    this.broadcast({ type: "runtime.status", payload: this.sessionInfo(), ts: Date.now() });
  }

  detachAgent() {
    if (this.agentWs) this.agentWs = null;
    this.agentAttached = false;
    this._stopPing();
    this._stopHeartbeatWatchdog();
  }

  _startPing() {
    this._stopPing();
    this._pingTimer = setInterval(() => {
      if (!this.agentAttached) return;
      this._pingSent = Date.now();
      this.sendToAgent({ type: "ping", payload: {} });
    }, 3000);
  }

  _stopPing() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  attachVncTunnel(ws) {
    this.vncTunnelWs = ws;
    // Buffer data from the tunnel until a browser client connects to /ws/stream.
    this._vncBuffer = [];
    this._vncBufferBytes = 0;
    this._vncBuffering = true;
    const onData = (data) => {
      if (this._vncBuffering) {
        this._vncBuffer.push(data);
        this._vncBufferBytes += data.length || data.byteLength || 0;
        // Cap buffer at 3MB to prevent memory leaks (tighter for zero-latency)
        while (this._vncBufferBytes > 3 * 1024 * 1024 && this._vncBuffer.length > 1) {
          const removed = this._vncBuffer.shift();
          this._vncBufferBytes -= removed.length || removed.byteLength || 0;
        }
      }
    };
    ws.on("message", onData);
    this._vncOnData = onData;
    this.notify("VNC stream tunnel connected.", "success");
  }

  flushVncBuffer(clientWs) {
    if (!this._vncBuffer) return;
    this._vncBuffering = false;
    // Flush in bulk for zero-latency startup
    const buffer = this._vncBuffer;
    this._vncBuffer = [];
    this._vncBufferBytes = 0;
    for (const chunk of buffer) {
      if (clientWs.readyState === 1) clientWs.send(chunk);
    }
  }

  detachVncTunnel() {
    this._vncBuffering = false;
    this._vncBuffer = [];
    if (this.vncTunnelWs && this._vncOnData) {
      try { this.vncTunnelWs.off("message", this._vncOnData); } catch {}
    }
    if (this.vncTunnelWs) this.vncTunnelWs = null;
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
    const gen = this._generation;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._waiters = this._waiters.filter((w) => w !== wobj);
        reject(new Error("timeout waiting for agent event: " + type));
      }, timeoutMs);
      const wobj = {
        type,
        generation: gen,
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
      if (w.type === type && (w.generation == null || w.generation === this._generation)) {
        this._waiters = this._waiters.filter((x) => x !== w);
        w.resolve(payload);
      }
    }
    if (["ready", "agent_attached", "agent_disconnected", "desktop_ready", "stream_ready", "vnc_ready", "webrtc_ready", "stats", "system_info", "pong"].includes(type)) {
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
    if (type === "ready") {
      // Agent reported its initial GPU detection + hostname on connect.
      this.setSystemInfo({ gpu: payload.gpu, hostname: payload.hostname });
    } else if (type === "system_info") this.setSystemInfo(payload);
    else if (type === "stats") {
      this.setStats(payload);
      // Trigger adaptive quality when network quality degrades
      if (payload.quality) {
        this._adaptToNetwork(payload.quality);
      }
    } else if (type === "pong") {
      if (this._pingSent) {
        const rtt = Date.now() - this._pingSent;
        this.setStats({ agentLatencyMs: rtt, latencySource: "agent" });
      }
    } else if (type === "app.list") {
      this.setApps(payload);
    } else if (type === "app.state") {
      this.setAppState(payload);
    } else if (type === "quality_adjusted") {
      // Agent confirmed quality change
      if (payload?.ok && this.stream) {
        this.stream.resolution = payload.width && payload.height ? `${payload.height}p` : this.stream.resolution;
        this.stream.fps = payload.fps || this.stream.fps;
        this.broadcast({ type: "stream.status", payload: this.stream, ts: Date.now() });
      }
    } else if (type === "gst-quality-changed") {
      // Agent reports quality change mid-stream
      if (this.stream) {
        this.stream.resolution = payload.resolution || this.stream.resolution;
        this.stream.fps = payload.fps || this.stream.fps;
        this.stream.quality = payload.quality || this.stream.quality;
        this.broadcast({ type: "stream.status", payload: this.stream, ts: Date.now() });
      }
    }

    // Route files.result to the waiter that matches the requestId
    if (type === "files.result" && payload?.requestId) {
      for (const w of [...(this._resultWaiters || [])]) {
        if (w.requestId === payload.requestId) {
          this._resultWaiters = this._resultWaiters.filter((x) => x !== w);
          w.resolve(payload);
        }
      }
    }

    // Route clipboard.result to the waiter that matches the requestId
    if (type === "clipboard.result" && payload?.requestId) {
      for (const w of [...(this._resultWaiters || [])]) {
        if (w.requestId === payload.requestId) {
          this._resultWaiters = this._resultWaiters.filter((x) => x !== w);
          w.resolve(payload);
        }
      }
    }

    // Notify per-client event listeners (terminal output, etc.)
    if (this._eventListeners && this._eventListeners[type]) {
      for (const cb of this._eventListeners[type]) {
        try { cb(payload); } catch {}
      }
    }
  }

  setApps(list) {
    const next = {};
    for (const a of list || []) {
      next[a.id] = { ...(this.apps[a.id] || {}), ...a };
    }
    this.apps = next;
    this.broadcast({ type: "apps", payload: this.apps, ts: Date.now() });
  }

  setAppState(p) {
    if (!p || !p.id) return;
    this.apps[p.id] = { ...(this.apps[p.id] || { id: p.id }), ...p };
    this.broadcast({ type: "apps", payload: this.apps, ts: Date.now() });
  }

  launchApp(id) {
    if (!id) return { ok: false, error: "Missing app id" };
    this.sendToAgent({ type: "launch_app", payload: { id } });
    return { ok: true, data: { id } };
  }

  stopApp(id) {
    if (!id) return { ok: false, error: "Missing app id" };
    this.sendToAgent({ type: "stop_app", payload: { id } });
    return { ok: true, data: { id } };
  }

  getApps() {
    return Object.values(this.apps);
  }

  // ------------------------------------------------------------------
  // Event subscription (for per-client routing, e.g. terminal output)
  // ------------------------------------------------------------------
  onEvent(type, callback) {
    if (!this._eventListeners) this._eventListeners = {};
    if (!this._eventListeners[type]) this._eventListeners[type] = [];
    this._eventListeners[type].push(callback);
    return () => {
      this._eventListeners[type] = (this._eventListeners[type] || []).filter((cb) => cb !== callback);
    };
  }

  // ------------------------------------------------------------------
  // Request-response pattern (for Colab-proxied file operations)
  // ------------------------------------------------------------------
  async waitForAgentResult(requestId, timeoutMs = 15000) {
    const gen = this._generation;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._resultWaiters = (this._resultWaiters || []).filter((w) => w.requestId !== requestId);
        reject(new Error("Agent response timed out for requestId: " + requestId));
      }, timeoutMs);
      const wobj = {
        requestId,
        generation: gen,
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      };
      if (!this._resultWaiters) this._resultWaiters = [];
      this._resultWaiters.push(wobj);
    });
  }
}

export function getManager() {
  if (!globalThis.__LUNA_MANAGER__) {
    globalThis.__LUNA_MANAGER__ = new RuntimeManager();
  }
  return globalThis.__LUNA_MANAGER__;
}
