"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";
import { StateBadge, Badge } from "@/components/ui";
import { ControllerStatus } from "@/components/ControllerStatus";
import { APP_NAME } from "@/lib/config/branding";

export function TopBar() {
  const { session, connected, systemInfo } = useRuntime();
  return (
    <header className="h-16 shrink-0 border-b border-white/5 flex items-center justify-between px-5">
      <div className="flex items-center gap-4">
        <h1 className="font-semibold tracking-tight hidden sm:block">{APP_NAME}</h1>
        {session && <StateBadge state={session.state} />}
        {systemInfo?.simulated && <Badge tone="warning">SIMULATED</Badge>}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="hidden lg:block">
          <ControllerStatus />
        </span>
        <span className="text-muted hidden md:block">{connected ? "● Link" : "○ Offline"}</span>
        {session?.provider && <Badge tone="neutral">{session.provider}</Badge>}
      </div>
    </header>
  );
}
