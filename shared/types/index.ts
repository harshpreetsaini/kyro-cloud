export type RuntimeState =
  | "OFFLINE"
  | "STARTING"
  | "INITIALIZING"
  | "PREPARING"
  | "CONNECTING"
  | "RUNTIME_CONNECTED"
  | "GPU_READY"
  | "DESKTOP_READY"
  | "STREAM_STARTING"
  | "STREAM_READY"
  | "ONLINE"
  | "STREAMING"
  | "RECONNECTING"
  | "STOPPING"
  | "STOPPED"
  | "ERROR"
  | "DISCONNECTED";

export interface GpuInfo {
  name: string | null;
  vramMb: number | null;
  usedMb: number | null;
  freeMb: number | null;
  driver: string | null;
  temperatureC: number | null;
  utilizationPct: number | null;
  memoryUtilPct: number | null;
  available: boolean;
}

export type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

export interface SystemInfo {
  os: string | null;
  hostname: string | null;
  gpu: GpuInfo;
  cpu: { model: string | null; cores: number | null; utilizationPct: number | null };
  ram: { totalMb: number | null; usedMb: number | null };
  storage: { totalMb: number | null; usedMb: number | null; mounted: boolean };
  network: { pingMs: number | null; bitrateMbps: number | null; quality: NetworkQuality; upBps?: number | null; downBps?: number | null; state?: string | null };
  simulated: boolean;
}

export interface SystemStats {
  gpuPct: number | null;
  gpuTempC: number | null;
  cpuPct: number | null;
  ramUsedMb: number | null;
  ramTotalMb: number | null;
  vramUsedMb: number | null;
  vramTotalMb: number | null;
  fps: number | null;
  frameTimeMs: number | null;
  latencyMs?: number | null;
  latencySource?: "control" | "webrtc" | "agent" | "browser" | null;
  agentLatencyMs?: number | null;
  bitrateMbps: number | null;
  streaming: boolean;
  netUpBps?: number | null;
  netDownBps?: number | null;
  netState?: string | null;
}

export type StreamType = "vnc" | "webrtc" | "gstreamer";

export interface StreamClientConfig {
  type: StreamType;
  url?: string;
  signalingUrl?: string;
  room?: string;
  iceServers?: { urls: string }[];
  password?: string | null;
  resolution: string;
  fps: number;
  quality: string;
}

export type Compatibility = "SUPPORTED" | "PARTIAL" | "UNKNOWN" | "UNSUPPORTED";

export type GameAvailability = "available" | "install_required" | "installing" | "ready" | "running" | "unavailable" | "unsupported";

export type GameProviderType = "steam" | "epic" | "manual" | "other";

export interface GameProvider {
  id: string;
  type: GameProviderType;
  name: string;
  appId?: string;
  launchMethod?: string;
  availability: GameAvailability;
}

export interface GameGenre {
  id: number;
  name: string;
}

export interface GameScreenshot {
  id: number;
  url: string;
  width?: number;
  height?: number;
}

export interface GameEntry {
  id: string;
  slug: string;
  name: string;
  description?: string;
  shortDescription?: string;
  heroImage?: string;
  coverImage?: string;
  screenshots?: GameScreenshot[];
  releaseDate?: string;
  developer?: string;
  publisher?: string;
  genres?: GameGenre[];
  rating?: number;
  metacritic?: number;
  platforms?: string[];
  providers: GameProvider[];
  availability: GameAvailability;
  installed: boolean;
  favorite?: boolean;
  isFree?: boolean;
  price?: string;
  lastPlayedAt?: string | null;
  playTime?: number;
  running?: boolean;
  installState?: "idle" | "installing" | "updating";
  tags?: string[];
  controllerSupport?: "full" | "partial" | "none";
  downloadSize?: string;
  systemRequirements?: { minimum?: string; recommended?: string } | null;
  // Legacy fields for backward compatibility
  executable?: string;
  arguments?: string;
  workingDir?: string;
  launcher?: string;
  compatibility: Compatibility;
  linuxCompatible?: boolean;
}

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  sizeBytes: number | null;
  modified: string | null;
}

export type WSEventType =
  | "runtime.status"
  | "runtime.progress"
  | "system.stats"
  | "system.info"
  | "stream.status"
  | "game.started"
  | "game.stopped"
  | "file.progress"
  | "terminal.output"
  | "notification"
  | "error";

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  ts: number;
}

export interface RuntimeProgressStep {
  label: string;
  status: "pending" | "active" | "done" | "error";
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface SessionInfo {
  id: string | null;
  state: RuntimeState;
  startedAt: number | null;
  durationMs: number | null;
  provider: string;
  streaming: string;
  simulated: boolean;
  progress: RuntimeProgressStep[];
  stream?: StreamClientConfig | null;
  error?: string | null;
}

export interface InstallProgress {
  gameId: string;
  state: "idle" | "requested" | "checking" | "downloading" | "installing" | "verifying" | "ready" | "uninstalling" | "error" | "cancelled";
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  error?: string;
}

export interface SettingsState {
  resolution: "720p" | "900p" | "1080p" | "Auto";
  fps: 30 | 60 | "Auto";
  quality: "low" | "balanced" | "high";
  autoReconnect: boolean;
  perfOverlay: boolean;
  compactMode: boolean;
  mouseSensitivity: number;
}
