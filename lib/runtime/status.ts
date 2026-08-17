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

export function deriveStatus(opts: {
  connected: boolean;
  session: SessionInfo | null;
  stats?: SystemStats | null;
}): DerivedStatus {
  const { connected, session } = opts;
  const state = session?.state;

  if (!connected && !session) {
    return { key: "offline", label: "CLOUD OFFLINE", tone: "offline", online: false, connected: false, streaming: false };
  }

  switch (state) {
    case "ONLINE":
      return { key: "online", label: "CLOUD ONLINE", tone: "online", online: true, connected: true, streaming: false };
    case "STREAMING":
      return { key: "streaming", label: "CLOUD ONLINE", tone: "online", online: true, connected: true, streaming: true };
    case "STARTING":
    case "INITIALIZING":
    case "PREPARING":
    case "CONNECTING":
      return { key: "starting", label: "STARTING CLOUD PC", tone: "starting", online: false, connected: true, streaming: false };
    case "STOPPING":
      return { key: "stopping", label: "STOPPING CLOUD PC", tone: "starting", online: false, connected: true, streaming: false };
    case "RECONNECTING":
      return { key: "reconnecting", label: "RECONNECTING", tone: "reconnecting", online: false, connected, streaming: false };
    case "ERROR":
      return { key: "error", label: "CLOUD UNAVAILABLE", tone: "error", online: false, connected, streaming: false };
    case "DISCONNECTED":
      return { key: "offline", label: "CLOUD OFFLINE", tone: "offline", online: false, connected: false, streaming: false };
    default:
      if (connected) return { key: "connecting", label: "CONNECTING", tone: "starting", online: false, connected: true, streaming: false };
      return { key: "offline", label: "CLOUD OFFLINE", tone: "offline", online: false, connected: false, streaming: false };
  }
}
