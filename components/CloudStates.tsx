"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Button, EmptyState } from "@/components/ui";
import { XIcon, CheckIcon } from "@/components/icons";
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

type SplashStep = { label: string; status: "pending" | "active" | "done" | "error" };

// Premium boot splash — ambient CSS scene, glowing monogram, real progress.
// No generated imagery; every pixel is on-palette (DESIGN.md) and every value
// shown is measured, never fabricated.
export function StepRail({ steps }: { steps: SplashStep[] }) {
  return (
    <ol className="relative flex flex-col gap-0 w-full max-w-xs">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={i} className="relative flex gap-3 animate-fadeInUp" style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}>
            {/* rail */}
            {!last && (
              <span
                aria-hidden
                className={`absolute left-[7px] top-[18px] bottom-[-14px] w-px ${
                  s.status === "done" ? "bg-success/40" : "bg-white/10"
                }`}
              />
            )}
            <span className="relative z-10 mt-1 shrink-0">
              {s.status === "done" ? (
                <span className="w-[15px] h-[15px] rounded-full bg-success text-[#04291a] flex items-center justify-center">
                  <CheckIcon className="w-2 h-2" />
                </span>
              ) : s.status === "active" ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-accent splash-halo" aria-hidden />
                  <span className="block w-[15px] h-[15px] rounded-full bg-accent ring-4 ring-accent/20" />
                </>
              ) : s.status === "error" ? (
                <span className="w-[15px] h-[15px] rounded-full bg-danger-container text-[#ffdad6] flex items-center justify-center">
                  <XIcon className="w-2 h-2" />
                </span>
              ) : (
                <span className="block w-[15px] h-[15px] rounded-full border border-white/25 bg-transparent" />
              )}
            </span>
            <span className={`text-[13px] leading-[17px] pb-3.5 ${s.status === "pending" ? "text-muted/80" : s.status === "error" ? "text-danger" : "text-text"}`}>
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function StartingHero() {
  const { session } = useRuntime();
  const steps = (session?.progress || []) as SplashStep[];
  const reconnecting = session?.state === "RECONNECTING";
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const done = steps.filter((s) => s.status === "done").length;
  const errored = steps.some((s) => s.status === "error");
  const fraction = steps.length ? Math.round(((done + (steps.some((s) => s.status === "active") ? 0.5 : 0)) / steps.length) * 100) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5 shadow-clay animate-scaleIn">
      {/* Scene */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#171935] via-[#10122e] to-[#090b27]" aria-hidden />
      <div className="absolute inset-0 splash-grid" aria-hidden />
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-primary-container/20 blur-[110px] splash-blob-a" aria-hidden />
      <div className="absolute -bottom-28 -right-20 w-[380px] h-[380px] rounded-full bg-tertiary/15 blur-[120px] splash-blob-b" aria-hidden />

      <div className="relative px-6 py-12 sm:py-16 flex flex-col items-center text-center gap-8">
        {/* Monogram */}
        <div className="relative">
          <span className="absolute inset-0 rounded-2xl bg-accent/40 splash-halo" aria-hidden />
          <div className="relative w-16 h-16 rounded-2xl bg-accent text-on-accent glow-accent shadow-glow-primary flex items-center justify-center font-display font-extrabold text-2xl">
            K
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <p className="font-display text-[13px] font-bold tracking-[0.42em] text-text pl-[0.42em]">KYRO CLOUD</p>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            {reconnecting ? "Reconnecting to your Cloud PC" : "Powering up your Cloud PC"}
          </h2>
          <p className="text-sm text-muted max-w-md">
            {reconnecting
              ? "Re-establishing the secure link to your machine."
              : errored
                ? "A startup step needs attention — details below."
                : "Allocating your GPU and preparing the desktop stream."}
          </p>
        </div>

        {/* Progress */}
        <div className="w-full max-w-xs flex flex-col gap-2.5">
          <div className="relative h-1.5 rounded-full bg-black/40 overflow-hidden clay-inset">
            {fraction != null ? (
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent via-primary-container to-accent transition-all duration-700 ease-out"
                style={{ width: `${fraction}%` }}
              />
            ) : (
              <div className="absolute inset-y-0 left-0 w-1/4 rounded-full bg-gradient-to-r from-transparent via-accent/70 to-transparent splash-sweep" />
            )}
          </div>
          <div className="flex items-center justify-between mono text-[10px] tracking-widest text-muted uppercase">
            <span>{reconnecting ? "Link" : session?.state || "Boot"}{fraction != null ? ` · ${fraction}%` : ""}</span>
            <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
          </div>
        </div>

        {/* Steps */}
        {steps.length > 0 && (
          <div className="panel !rounded-2xl px-5 py-4 w-full max-w-xs text-left backdrop-blur-sm">
            <StepRail steps={steps} />
          </div>
        )}
      </div>
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
