"use client";

import Link from "next/link";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Button, ProgressList, EmptyState, Badge, Spinner } from "@/components/ui";
import { XIcon } from "@/components/icons";
import type { RuntimeState } from "@shared/types";

export type CloudPhase = "offline" | "ready" | "starting" | "error" | "online";

const STARTING: RuntimeState[] = [
  "STARTING",
  "INITIALIZING",
  "PREPARING",
  "CONNECTING",
  "GPU_READY",
  "DESKTOP_READY",
  "STREAM_STARTING",
  "STREAM_READY",
  "STOPPING",
  "RECONNECTING",
];

const OFFLINE_STATES: RuntimeState[] = ["OFFLINE", "STOPPED", "DISCONNECTED"];

export function useCloudPhase(): CloudPhase {
  const { connected, session } = useRuntime();
  const state = session?.state;
  if (state === "ERROR") return "error";
  if (state === "ONLINE" || state === "STREAMING") return "online";
  if (state === "RUNTIME_CONNECTED") return "ready";
  if (state && STARTING.includes(state)) return "starting";
  if (connected && !state) return "starting";
  if (!state || OFFLINE_STATES.includes(state)) return "offline";
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

export function ReadyHero() {
  return (
    <EmptyState
      icon="⏻"
      title="YOUR CLOUD PC IS READY"
      description="Your Colab GPU runtime is connected. Start the Cloud PC to launch the desktop, games and apps."
      action={<StartCloudButton label="Start Cloud PC" />}
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
  const error = session?.error || "";
  const isAgentError = error.includes("agent did not connect") || error.includes("Colab runtime agent");
  const isStreamError = error.includes("stream") || error.includes("VNC") || error.includes("x11vnc");

  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
      <div className="w-14 h-14 rounded-2xl bg-danger/15 flex items-center justify-center text-danger">
        <XIcon className="w-7 h-7" />
      </div>
      <div>
        <p className="font-display text-lg tracking-wide text-danger">CLOUD PC UNAVAILABLE</p>
        <p className="text-sm text-muted mt-1 max-w-md">
          {isAgentError
            ? "The Colab runtime agent could not connect. Run the bootstrap notebook and verify the runtime secret."
            : isStreamError
              ? "The streaming service failed to start. Check that x11vnc and the desktop environment are installed."
              : "The cloud runtime encountered an error during startup."}
        </p>
      </div>
      {session?.error && (
        <div className="panel p-3 max-w-md w-full">
          <p className="mono text-[11px] text-danger/80 break-words whitespace-pre-wrap">{session.error}</p>
        </div>
      )}
      <div className="flex gap-2 mt-1">
        <Button onClick={restart}>Retry</Button>
        <Link href="/diagnostics">
          <Button variant="secondary">Diagnostics</Button>
        </Link>
      </div>
    </div>
  );
}
