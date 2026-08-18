"use client";

import { useState } from "react";
import { RemoteDesktop } from "@/components/RemoteDesktop";
import { SystemStatsPanel } from "@/components/SystemStatsPanel";
import { SessionControls } from "@/components/SessionControls";
import { PerfOverlay } from "@/components/PerfOverlay";
import { Button, Card } from "@/components/ui";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { useCloudPhase, OfflineHero, ReadyHero, StartingHero, ErrorHero } from "@/components/CloudStates";

function OfflineStats() {
  const items = ["GPU", "CPU", "RAM", "STORAGE"];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((label) => (
        <Card key={label} className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
          <span className="mono text-xl text-muted">--</span>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [overlay, setOverlay] = useState(false);
  const phase = useCloudPhase();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Dashboard</h2>
        {phase === "online" && (
          <Button variant="ghost" className="!py-1 !px-3 text-xs" onClick={() => setOverlay((v) => !v)}>
            {overlay ? "Hide overlay" : "Perf overlay"}
          </Button>
        )}
      </div>

      {phase === "offline" && (
        <div className="panel flex flex-col gap-4">
          <OfflineHero />
          <OfflineStats />
        </div>
      )}

      {phase === "ready" && (
        <div className="panel flex flex-col gap-4">
          <ReadyHero />
          <OfflineStats />
        </div>
      )}

      {phase === "starting" && (
        <div className="panel">
          <StartingHero />
        </div>
      )}

      {phase === "error" && (
        <div className="panel">
          <ErrorHero />
        </div>
      )}

      {phase === "online" && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="relative panel overflow-hidden" style={{ height: "62vh", minHeight: 360 }}>
              <RemoteDesktop className="absolute inset-0" />
              <PerfOverlay visible={overlay} />
            </div>
            <SystemStatsPanel />
          </div>
          <div className="flex flex-col gap-4">
            <SessionControls />
          </div>
        </div>
      )}
    </div>
  );
}
