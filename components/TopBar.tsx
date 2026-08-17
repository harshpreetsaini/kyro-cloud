"use client";

import { useSyncExternalStore } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { RuntimeStatus } from "@/components/RuntimeStatus";
import { ControllerStatus } from "@/components/ControllerStatus";
import { Badge } from "@/components/ui";
import { sidebarStore } from "@/lib/ui/sidebar";
import { APP_NAME } from "@/lib/config/branding";

export function TopBar() {
  const { connected, systemInfo } = useRuntime();
  const sidebarOpen = useSyncExternalStore(sidebarStore.subscribe, sidebarStore.getSnapshot, sidebarStore.getSnapshot);

  return (
    <header className="h-16 shrink-0 border-b border-white/5 flex items-center justify-between px-4 sm:px-5 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => sidebarStore.toggle()}
          className="lg:hidden text-muted hover:text-text p-2 -ml-2"
          aria-label="Toggle navigation menu"
        >
          <span className="text-xl leading-none">☰</span>
        </button>
        <h1 className="font-semibold tracking-tight hidden sm:block truncate">{APP_NAME}</h1>
        <span className="hidden xl:block">
          <RuntimeStatus />
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 text-sm shrink-0">
        <span className="hidden sm:block">
          <ControllerStatus />
        </span>
        {systemInfo?.simulated && <Badge tone="warning">SIMULATED</Badge>}
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${connected ? "bg-success" : "bg-muted"}`}
          title={connected ? "Realtime link active" : "No realtime link"}
          aria-label={connected ? "Realtime link active" : "No realtime link"}
        />
      </div>
    </header>
  );
}
