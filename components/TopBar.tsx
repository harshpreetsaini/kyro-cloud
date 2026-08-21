"use client";

import { useSyncExternalStore } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { RuntimeStatus } from "@/components/RuntimeStatus";
import { ControllerStatus } from "@/components/ControllerStatus";
import { Badge } from "@/components/ui";
import { sidebarStore } from "@/lib/ui/sidebar";
import { APP_NAME } from "@/lib/config/branding";

const QUALITY_COLORS: Record<string, string> = {
  excellent: "bg-success", good: "bg-accent", fair: "bg-warning", poor: "bg-danger", unknown: "bg-muted",
};

const QUALITY_LABELS: Record<string, string> = {
  excellent: "Excellent", good: "Good", fair: "Fair", poor: "Poor", unknown: "—",
};

export function TopBar() {
  const { connected, systemInfo, session } = useRuntime();
  const networkQuality = systemInfo?.network?.quality || "unknown";
  const qualityColor = QUALITY_COLORS[networkQuality] || "bg-muted";
  const cloudState = session?.state || "OFFLINE";
  const isStreaming = cloudState === "STREAMING" || cloudState === "ONLINE";

  const statusText = (() => {
    if (isStreaming) return "STREAMING";
    if (cloudState === "RUNTIME_CONNECTED") return "READY";
    if (cloudState === "STARTING" || cloudState === "INITIALIZING" || cloudState === "PREPARING" || cloudState === "CONNECTING") return "STARTING";
    if (cloudState === "GPU_READY" || cloudState === "DESKTOP_READY" || cloudState === "STREAM_STARTING" || cloudState === "STREAM_READY") return "STARTING";
    if (cloudState === "ERROR") return "ERROR";
    if (cloudState === "DISCONNECTED" || cloudState === "RECONNECTING") return "RECONNECTING";
    if (connected) return "ONLINE";
    return "OFFLINE";
  })();

  return (
    <header className="h-14 shrink-0 border-b border-white/5 flex items-center justify-between px-4 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => sidebarStore.toggle()}
          className="lg:hidden text-muted hover:text-text p-1.5 -ml-1.5 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Toggle navigation menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <span className="hidden sm:block">
          <RuntimeStatus />
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm shrink-0">
        {/* Cloud status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/60">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-success" : "bg-muted"}`} />
          <span className="text-[11px] text-muted font-medium">
            {statusText}
          </span>
        </div>

        {/* Network quality */}
        <div className="hidden md:flex items-center gap-1.5" title={`Network: ${QUALITY_LABELS[networkQuality]}`}>
          <div className={`w-2 h-2 rounded-full ${qualityColor}`} />
          <span className="text-[11px] text-muted">{QUALITY_LABELS[networkQuality]}</span>
        </div>

        {/* Controller */}
        <span className="hidden md:block">
          <ControllerStatus />
        </span>

        {systemInfo?.simulated && <Badge tone="warning">SIM</Badge>}
      </div>
    </header>
  );
}
