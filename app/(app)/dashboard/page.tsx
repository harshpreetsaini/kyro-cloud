"use client";

import { useState } from "react";
import { RemoteDesktop } from "@/components/RemoteDesktop";
import { SystemStatsPanel } from "@/components/SystemStatsPanel";
import { SessionControls } from "@/components/SessionControls";
import { PerfOverlay } from "@/components/PerfOverlay";
import { Button } from "@/components/ui";

export default function DashboardPage() {
  const [overlay, setOverlay] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Dashboard</h2>
        <Button variant="ghost" className="!py-1 !px-3 text-xs" onClick={() => setOverlay((v) => !v)}>
          {overlay ? "Hide overlay" : "Perf overlay"}
        </Button>
      </div>

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
    </div>
  );
}
