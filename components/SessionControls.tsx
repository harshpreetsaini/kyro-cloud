"use client";

import { useState } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Button, ProgressList, StatusDot } from "@/components/ui";
import { deriveStatus } from "@/lib/runtime/status";

const ACTIVE = [
  "STARTING", "INITIALIZING", "PREPARING", "CONNECTING",
  "RUNTIME_CONNECTED", "GPU_READY", "DESKTOP_READY", "STREAM_STARTING", "STREAM_READY",
  "ONLINE", "STREAMING", "ERROR", "DISCONNECTED", "RECONNECTING", "STOPPING",
];

export function SessionControls() {
  const { session, start, stop, restart } = useRuntime();
  const [busy, setBusy] = useState<null | "stop" | "restart" | "start">(null);
  const state = session?.state || "OFFLINE";
  const status = deriveStatus({ connected: true, session });
  const active = ACTIVE.includes(state);

  async function doStop() {
    setBusy("stop");
    try {
      await stop();
    } finally {
      setBusy(null);
    }
  }
  async function doRestart() {
    setBusy("restart");
    try {
      await restart();
    } finally {
      setBusy(null);
    }
  }
  async function doStart() {
    setBusy("start");
    try {
      await start();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">Session</span>
        <div className="flex items-center gap-2">
          <StatusDot tone={status.tone} pulse={status.tone === "starting" || status.tone === "reconnecting"} />
          <span className="text-sm font-medium">{status.label}</span>
        </div>
      </div>

      {session?.progress && active && status.tone === "starting" && (
        <ProgressList steps={session.progress as any} />
      )}

      {state === "ERROR" && (
        <p className="text-sm text-muted">
          Your Cloud PC is connected, but the streaming service isn&apos;t running. Retry or check Diagnostics.
        </p>
      )}

      <div className="flex gap-2">
        {!active ? (
          <Button onClick={doStart} disabled={busy === "start"}>
            {busy === "start" ? "Starting…" : "Start Cloud PC"}
          </Button>
        ) : (
          <>
            <Button variant="danger" onClick={doStop} disabled={busy === "stop"}>
              {busy === "stop" ? "Stopping…" : "Stop Session"}
            </Button>
            <Button variant="ghost" onClick={doRestart} disabled={busy === "restart"}>
              {busy === "restart" ? "Restarting…" : "Restart"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
