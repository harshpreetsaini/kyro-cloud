"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Button, StateBadge, ProgressList } from "@/components/ui";

export function SessionControls() {
  const { session, start, stop, restart } = useRuntime();
  const state = session?.state || "OFFLINE";
  const active = [
    "STARTING",
    "INITIALIZING",
    "PREPARING",
    "CONNECTING",
    "ONLINE",
    "STREAMING",
    "ERROR",
    "DISCONNECTED",
  ].includes(state);

  return (
    <div className="panel p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">Session</span>
        {session && <StateBadge state={state} />}
      </div>

      {session?.progress && active && (
        <ProgressList steps={session.progress as any} />
      )}

      {session?.error && state === "ERROR" && (
        <p className="text-sm text-danger">{session.error}</p>
      )}

      <div className="flex gap-2">
        {!active ? (
          <Button onClick={start}>Start Session</Button>
        ) : (
          <>
            <Button variant="danger" onClick={stop}>
              Stop
            </Button>
            <Button variant="ghost" onClick={restart}>
              Restart
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
