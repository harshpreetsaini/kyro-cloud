"use client";

import { useState } from "react";
import { RemoteDesktop } from "@/components/RemoteDesktop";
import { PerfOverlay } from "@/components/PerfOverlay";
import { Button } from "@/components/ui";
import { useCloudPhase, OfflineHero, ReadyHero, StartingHero, ErrorHero } from "@/components/CloudStates";

export default function DesktopPage() {
  const [overlay, setOverlay] = useState(false);
  const phase = useCloudPhase();

  if (phase !== "online") {
    return (
      <div className="flex flex-col gap-4 h-full">
        <h2 className="font-display text-xl">Remote Desktop</h2>
        <div className="panel flex-1 min-h-[360px] flex flex-col">
          {phase === "offline" && <OfflineHero />}
          {phase === "ready" && <ReadyHero />}
          {phase === "starting" && <StartingHero />}
          {phase === "error" && <ErrorHero />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Remote Desktop</h2>
        <Button variant="ghost" className="!py-1 !px-3 text-xs" onClick={() => setOverlay((v) => !v)}>
          {overlay ? "Hide overlay" : "Perf overlay"}
        </Button>
      </div>
      <div className="relative panel overflow-hidden flex-1 min-h-[360px]">
        <RemoteDesktop className="absolute inset-0" />
        <PerfOverlay visible={overlay} />
      </div>
    </div>
  );
}
