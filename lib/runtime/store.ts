import { api, wsUrl } from "@/lib/config/api";
import { getToken, authHeader } from "@/lib/auth/client";
import type { SessionInfo, SystemInfo, SystemStats, StreamClientConfig } from "@shared/types";

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
};

let state: RuntimeState = EMPTY;
let snapshot: RuntimeState = EMPTY;
const listeners = new Set<() => void>();
let ws: WebSocket | null = null;
let retry = 0;
let started = false;

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
  };
  ws.onclose = () => {
    state = { ...state, connected: false };
    emit();
    if (started) {
      retry += 1;
      setTimeout(connect, Math.min(1000 * retry, 5000));
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
          state = { ...state, runningGames: [], stream: null };
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
          stats: event.payload as SystemStats,
          statsHistory: [...state.statsHistory.slice(-59), event.payload as SystemStats],
        };
        emit();
        break;
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

export function runtimeStopGame(id: string) {
  fetch(api("/api/games/stop"), {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader() },
    body: JSON.stringify({ id }),
  }).then(() => {
    state = { ...state, runningGames: state.runningGames.filter((g) => g !== id) };
    emit();
  });
}

export function runtimeSend(type: string, payload: unknown) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload, ts: Date.now() }));
  }
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
