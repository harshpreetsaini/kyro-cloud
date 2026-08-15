"use client";

import { useState, useEffect } from "react";
import { RemoteDesktop } from "@/components/RemoteDesktop";
import { PerfOverlay } from "@/components/PerfOverlay";
import { Button } from "@/components/ui";

export default function DesktopPage() {
  const [overlay, setOverlay] = useState(false);
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Desktop</h2>
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
