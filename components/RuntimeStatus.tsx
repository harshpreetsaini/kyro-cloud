"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";
import { deriveStatus } from "@/lib/runtime/status";
import { StatusPill } from "@/components/ui";
import { fmt } from "@/components/ui";

export function RuntimeStatus() {
  const { connected, session, systemInfo, stats, stream } = useRuntime();
  const status = deriveStatus({ connected, session, stats });

  let sub: string | undefined;
  if (status.online) {
    const gpu = systemInfo?.gpu?.name;
    const res = stream?.resolution || "--";
    const fps = stats?.fps != null ? String(Math.round(stats.fps)) : "--";
    const ms = stats?.latencyMs != null ? `${Math.round(stats.latencyMs)} ms` : "--";
    sub = `${gpu ? gpu.replace(/\(.*\)/, "").trim() : "GPU"} • ${res} • ${fps} FPS • ${ms}`;
  } else if (status.tone === "starting") {
    sub = "Please wait while your Cloud PC boots";
  } else if (status.tone === "error") {
    sub = "Streaming service not ready";
  } else if (status.connected) {
    sub = "Connecting…";
  } else {
    sub = "No connection to the cloud";
  }

  return (
    <StatusPill
      tone={status.tone}
      label={status.label}
      sub={sub}
      pulse={status.tone === "starting" || status.tone === "reconnecting"}
    />
  );
}
