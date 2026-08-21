import { api, wsUrl } from "@/lib/config/api";
import { getToken, authHeader } from "@/lib/auth/client";
import { getGame } from "@/lib/games/library.mjs";
import type { SessionInfo, SystemInfo, SystemStats, StreamClientConfig, InstallProgress } from "@shared/types";

export type AppState =
  | "NOT_INSTALLED"
  | "INSTALLING"
  | "INSTALLED"
  | "STARTING"
  | "RUNNING"
  | "STOPPING"
  | "STOPPED"
  | "FAILED"
  | "UNSUPPORTED";

export interface AppEntry {
  id: string;
  name: string;
  category?: string;
  state?: AppState;
  installed?: boolean;
  executable?: string | null;
  supported?: boolean;
  note?: string;
  pid?: number;
  exitCode?: number;
}

interface Notification {
  id: string;
  message: string;
  level: "info" | "success" | "warning" | "error";
}

interface RuntimeState {
  connected: boolean;
  session: SessionInfo | null;
  systemInfo: SystemInfo | null;
  stats: SystemStats | null;
  stream: StreamClientConfig | null;
  notifications: Notification[];
  statsHistory: SystemStats[];
  runningGames: string[];
  apps: Record<string, AppEntry>;
  installProgress: Record<string, InstallProgress>;
}

const EMPTY: RuntimeState = {
  connected: false,
  session: null,
  systemInfo: null,
  stats: null,
  stream: null,
  notifications: [],
  statsHistory: [],
  runningGames: [],
  apps: {},
  installProgress: {},
};

let state: RuntimeState = EMPTY;
let snapshot: RuntimeState = EMPTY;
const listeners = new Set<() => void>();
let ws: WebSocket | null = null;
let retry = 0;
let started = false;
let pingInterval: ReturnType<typeof setInterval> | null = null;

function emit() {
  snapshot = { ...state };
  for (const l of listeners) l();
}

function notify(message: string, level: Notification["level"]) {
  const id = Math.random().toString(36).slice(2);
  state = { ...state, notifications: [...state.notifications.slice(-4), { id, message, level }] };
  emit();
  setTimeout(() => dismiss(id), 6000);
}

export function dismiss(id: string) {
  state = { ...state, notifications: state.notifications.filter((n) => n.id !== id) };
  emit();
}

function connect() {
  if (typeof window === "undefined") return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  const token = getToken();
  const url = wsUrl("/ws") + (token ? `?token=${encodeURIComponent(token)}` : "");
  ws = new WebSocket(url);
  ws.onopen = () => {
    state = { ...state, connected: true };
    retry = 0;
    emit();
    // Send keepalive ping every 10 seconds (also measures browser→backend latency)
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
      }
    }, 10000);
  };
  ws.onclose = () => {
    state = { ...state, connected: false };
    emit();
    if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
    if (started) {
      retry += 1;
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s cap
      const delay = Math.min(1000 * Math.pow(2, retry - 1), 30000);
      setTimeout(connect, delay);
    }
  };
  ws.onmessage = (ev) => {
    let event: { type: string; payload: unknown };
    try {
      event = JSON.parse(ev.data as string);
    } catch {
      return;
    }
    switch (event.type) {
      case "runtime.status":
        state = { ...state, session: event.payload as SessionInfo };
        const st = (event.payload as SessionInfo)?.state;
        if (st === "OFFLINE" || st === "STOPPED" || st === "DISCONNECTED") {
          state = { ...state, runningGames: [], stream: null, apps: {} };
        }
        emit();
        break;
      case "runtime.progress":
        state = {
          ...state,
          session: state.session
            ? { ...state.session, progress: event.payload as SessionInfo["progress"] }
            : state.session,
        };
        emit();
        break;
      case "system.info":
        state = { ...state, systemInfo: event.payload as SystemInfo };
        emit();
        break;
      case "system.stats":
        state = {
          ...state,
          stats: { ...(state.stats || {}), ...(event.payload as SystemStats) },
          statsHistory: [...state.statsHistory.slice(-59), event.payload as SystemStats],
        };
        emit();
        break;
      case "pong": {
        // Frontend→backend round-trip latency (the user-facing control latency).
        // The backend echoes the client timestamp at the top level (event.ts).
        // The backend→Colab leg is reported separately as agentLatencyMs.
        const ts = (event as { ts?: number }).ts;
        if (typeof ts === "number") {
          const rtt = Math.max(0, Date.now() - ts);
          state = {
            ...state,
            stats: { ...(state.stats || {}), latencyMs: rtt, latencySource: "browser" } as SystemStats,
          };
          emit();
        }
        break;
      }
      case "stream.status":
        state = { ...state, stream: event.payload as StreamClientConfig };
        emit();
        break;
      case "notification":
        notify(
          (event.payload as { message: string }).message,
          (event.payload as { level: Notification["level"] }).level
        );
        break;
      case "game.started": {
        const p = event.payload as any;
        const ids: string[] = Array.isArray(p) ? p.map((g: any) => g.id) : p?.id ? [p.id] : [];
        state = { ...state, runningGames: Array.from(new Set([...state.runningGames, ...ids])) };
        emit();
        break;
      }
      case "game.stopped":
        state = {
          ...state,
          runningGames: state.runningGames.filter((id) => id !== (event.payload as { id: string }).id),
        };
        emit();
        break;
      case "apps": {
        const payload = event.payload as Record<string, AppEntry> | AppEntry[] | null;
        let apps: Record<string, AppEntry> = {};
        if (Array.isArray(payload)) {
          for (const a of payload) apps[a.id] = a;
        } else if (payload) {
          apps = payload as Record<string, AppEntry>;
        }
        state = { ...state, apps };
        emit();
        break;
      }
      case "quality_adjusted": {
        const qualityPayload = event.payload as any;
        if (qualityPayload?.ok) {
          notify("Stream quality adjusted", "success");
        } else {
          notify(`Quality adjustment failed: ${qualityPayload?.error || "unknown"}`, "error");
        }
        emit();
        break;
      }
      case "quality_info": {
        // Current quality info received
        emit();
        break;
      }
      case "ping": {
        // Respond to server keepalive ping
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
        }
        break;
      }
      case "game.install.progress": {
        const p = event.payload as InstallProgress;
        state = { ...state, installProgress: { ...state.installProgress, [p.gameId]: p } };
        emit();
        break;
      }
      case "game.install.done": {
        const p = event.payload as { gameId: string; success: boolean; error?: string };
        const prog = state.installProgress[p.gameId];
        if (prog) {
          state = {
            ...state,
            installProgress: {
              ...state.installProgress,
              [p.gameId]: { ...prog, state: p.success ? "ready" : "error", percent: p.success ? 100 : prog.percent, error: p.error },
            },
          };
        }
        emit();
        break;
      }
      default:
        break;
    }
  };
}

export function ensureConnected() {
  started = true;
  connect();
}

export async function runtimeAction(path: string) {
  await fetch(api(`/api/runtime/${path}`), { method: "POST", headers: { ...authHeader() } });
}

export function runtimeLaunchGame(id: string) {
  fetch(api("/api/games/launch"), {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader() },
    body: JSON.stringify({ id }),
  });
}

export function runtimeInstallGame(id: string) {
  // Look up the game to build the install payload (provider, appId, method)
  let game: any = null;
  try { game = getGame(id); } catch {}

  const provider = game?.providers?.[0];
  const installMethod =
    provider?.launchMethod === "epic" ? "legendary" :
    provider?.launchMethod === "gog" ? "lgogdownloader" : "steamcmd";
  const appId = provider?.appId || provider?.steamAppId || id?.replace(/\D/g, "");

  // Set local installing state immediately
  state = {
    ...state,
    installProgress: {
      ...state.installProgress,
      [id]: { gameId: id, state: "checking", percent: 0, downloadedBytes: 0, totalBytes: 0, speedBytesPerSec: 0, etaSeconds: 0 },
    },
  };
  emit();

  // Send install command via WebSocket to the backend (which has the agent)
  const connected = ws !== null && ws.readyState === WebSocket.OPEN;
  if (!connected) {
    state = {
      ...state,
      installProgress: {
        ...state.installProgress,
        [id]: { gameId: id, state: "error", percent: 0, downloadedBytes: 0, totalBytes: 0, speedBytesPerSec: 0, etaSeconds: 0, error: "Not connected to cloud PC. Start your session first." },
      },
    };
    emit();
    return;
  }

  runtimeSend("game.install", {
    id: game?.id || id,
    name: game?.name,
    installMethod,
    provider: provider?.type || "steam",
    appId,
  });
}

export function runtimeCancelInstall(id: string) {
  runtimeSend("game.install.cancel", { id });
  state = {
    ...state,
    installProgress: { ...state.installProgress, [id]: { gameId: id, state: "idle", percent: 0, downloadedBytes: 0, totalBytes: 0, speedBytesPerSec: 0, etaSeconds: 0 } },
  };
  emit();
}

export function runtimeUninstallGame(id: string) {
  runtimeSend("game.uninstall", { id });
  state = {
    ...state,
    installProgress: { ...state.installProgress, [id]: { gameId: id, state: "uninstalling", percent: 0, downloadedBytes: 0, totalBytes: 0, speedBytesPerSec: 0, etaSeconds: 0 } },
  };
  emit();
}

export function runtimeStopGame(id: string) {
  // Send stop command via WebSocket to the agent
  runtimeSend("stop_app", { id });
  state = { ...state, runningGames: state.runningGames.filter((g) => g !== id) };
  emit();
}

export async function runtimeFetchApps(): Promise<AppEntry[]> {
  // Apps are pushed by the agent via WebSocket "apps" event
  // Return current state
  const apps = Object.values(state.apps);
  return apps;
}

export function runtimeLaunchApp(id: string) {
  // Send launch command via WebSocket to the agent
  runtimeSend("launch_app", { id });
}

export function runtimeStopApp(id: string) {
  // Send stop command via WebSocket to the agent
  runtimeSend("stop_app", { id });
}

export function runtimeSend(type: string, payload: unknown) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload, ts: Date.now() }));
  }
}

export function adjustQuality(settings: {
  resolution?: string;
  fps?: number;
  quality?: string;
  network_quality?: string;
}) {
  runtimeSend("adjust_quality", settings);
}

export function getQuality() {
  runtimeSend("get_quality", {});
}

export const runtimeStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot() {
    return snapshot;
  },
};
