import type { SessionInfo, SystemStats } from "@shared/types";

export type StatusTone = "online" | "starting" | "reconnecting" | "error" | "offline";

export interface DerivedStatus {
  key: string;
  label: string;
  tone: StatusTone;
  online: boolean;
  connected: boolean;
  streaming: boolean;
}

const STARTING: string[] = [
  "STARTING",
  "INITIALIZING",
  "PREPARING",
  "CONNECTING",
  "RUNTIME_CONNECTED",
  "GPU_READY",
  "DESKTOP_READY",
  "STREAM_STARTING",
  "STREAM_READY",
];

export function deriveStatus(opts: {
  connected: boolean;
  session: SessionInfo | null;
  stats?: SystemStats | null;
}): DerivedStatus {
  const { connected, session, stats } = opts;
  const state = session?.state;
  const hasStream = !!session?.stream || !!stats?.streaming;

  if (state === "STREAMING" || (state === "ONLINE" && hasStream)) {
    return { key: "online", label: "CLOUD ONLINE", tone: "online", online: true, connected: true, streaming: true };
  }
  if (state === "ONLINE") {
    return { key: "online-no-stream", label: "CLOUD ONLINE", tone: "starting", online: false, connected: true, streaming: false };
  }
  if (state === "DISCONNECTED") {
    return { key: "disconnected", label: "CLOUD RUNTIME OFFLINE", tone: "offline", online: false, connected: false, streaming: false };
  }
  if (state === "STOPPED" || state === "OFFLINE") {
    return { key: "offline", label: "CLOUD OFFLINE", tone: "offline", online: false, connected: false, streaming: false };
  }
  if (state === "ERROR") {
    return { key: "error", label: "CLOUD UNAVAILABLE", tone: "error", online: false, connected, streaming: false };
  }
  if (state === "RECONNECTING") {
    return { key: "reconnecting", label: "RECONNECTING", tone: "reconnecting", online: false, connected, streaming: false };
  }
  if (state && STARTING.includes(state)) {
    return { key: "starting", label: "STARTING CLOUD PC", tone: "starting", online: false, connected: true, streaming: false };
  }
  if (connected) {
    return { key: "connecting", label: "CONNECTING", tone: "starting", online: false, connected: true, streaming: false };
  }
  return { key: "offline", label: "CLOUD OFFLINE", tone: "offline", online: false, connected: false, streaming: false };
}
