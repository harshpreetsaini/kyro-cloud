"use client";

import Link from "next/link";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Button, ProgressList, EmptyState, Badge, Spinner } from "@/components/ui";
import type { RuntimeState } from "@shared/types";

export type CloudPhase = "offline" | "starting" | "error" | "online";

const STARTING: RuntimeState[] = [
  "STARTING",
  "INITIALIZING",
  "PREPARING",
  "CONNECTING",
  "STOPPING",
  "RECONNECTING",
];

export function useCloudPhase(): CloudPhase {
  const { connected, session } = useRuntime();
  const state = session?.state;
  if (state === "ERROR") return "error";
  if (state === "ONLINE" || state === "STREAMING") return "online";
  if (state && STARTING.includes(state)) return "starting";
  if (connected) return "starting";
  return "offline";
}

export function StartCloudButton({ label = "Start Cloud PC", className = "" }: { label?: string; className?: string }) {
  const { start } = useRuntime();
  return (
    <Button onClick={start} className={className}>
      {label}
    </Button>
  );
}

export function OfflineHero() {
  return (
    <EmptyState
      icon="⏻"
      title="YOUR CLOUD PC IS OFFLINE"
      description="Start your GPU session to access your remote desktop and games."
      action={<StartCloudButton />}
    />
  );
}

export function StartingHero() {
  const { session } = useRuntime();
  const steps = (session?.progress || []) as { label: string; status: "pending" | "active" | "done" | "error" }[];
  return (
    <div className="flex flex-col items-center justify-center text-center gap-5 py-12">
      <Spinner />
      <div>
        <p className="font-display text-lg tracking-wide">
          {session?.state === "RECONNECTING" ? "RECONNECTING" : "STARTING CLOUD PC"}
        </p>
        <p className="text-sm text-muted mt-1">
          {session?.state === "RECONNECTING"
            ? "Re-establishing the link to your Cloud PC."
            : "Your GPU session is booting. This only takes a moment."}
        </p>
      </div>
      {steps.length > 0 && (
        <div className="panel p-4 w-full max-w-sm text-left">
          <ProgressList steps={steps} />
        </div>
      )}
    </div>
  );
}

export function ErrorHero() {
  const { session, restart } = useRuntime();
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
      <div className="w-14 h-14 rounded-2xl bg-danger/15 flex items-center justify-center text-2xl text-danger">✕</div>
      <div>
        <p className="font-display text-lg tracking-wide text-danger">CLOUD PC UNAVAILABLE</p>
        <p className="text-sm text-muted mt-1 max-w-md">
          The cloud runtime is connected, but the streaming service isn&apos;t ready.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Streaming</span>
        <Badge tone="danger">✕ Not running</Badge>
      </div>
      {session?.error && (
        <p className="mono text-[11px] text-danger/80 max-w-md break-words">{session.error}</p>
      )}
      <div className="flex gap-2 mt-1">
        <Button onClick={restart}>Retry Stream</Button>
        <Link href="/diagnostics">
          <Button variant="secondary">View Diagnostics</Button>
        </Link>
      </div>
    </div>
  );
}
