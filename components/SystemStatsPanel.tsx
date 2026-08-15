"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Card, Stat, fmt, Badge } from "@/components/ui";
import type { NetworkQuality } from "@shared/types";

const QUALITY_TONE: Record<NetworkQuality, "success" | "accent" | "warning" | "danger" | "neutral"> = {
  excellent: "success",
  good: "accent",
  fair: "warning",
  poor: "danger",
  unknown: "neutral",
};

export function SystemStatsPanel() {
  const { systemInfo, stats } = useRuntime();
  const gpu = systemInfo?.gpu;
  const net = systemInfo?.network;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted">GPU</span>
          {gpu?.available ? <Badge tone="success">online</Badge> : <Badge tone="neutral">—</Badge>}
        </div>
        <p className="text-sm mt-1 truncate" title={gpu?.name || ""}>
          {gpu?.name || "Unavailable"}
        </p>
        <div className="mono text-lg text-accent mt-1">
          {fmt(gpu?.utilizationPct, "%")}
        </div>
        <p className="text-[11px] text-muted">
          {fmt(gpu?.temperatureC, "°C")} · VRAM {fmt(gpu?.vramMb, "MB")}
        </p>
      </Card>

      <Stat label="CPU" value={fmt(stats?.cpuPct, "%")} sub={systemInfo?.cpu?.model || "—"} />
      <Stat
        label="RAM"
        value={fmt(stats?.ramUsedMb, "MB")}
        sub={`of ${fmt(stats?.ramTotalMb, "MB") || "--"}`}
      />
      <Stat
        label="Storage"
        value={fmt(systemInfo?.storage?.usedMb, "MB")}
        sub={`of ${fmt(systemInfo?.storage?.totalMb, "MB") || "--"}`}
      />
      <Stat
        label="Network"
        value={fmt(net?.pingMs, "ms")}
        sub={
          net?.quality ? (
            <Badge tone={QUALITY_TONE[net.quality as NetworkQuality]}>{net.quality}</Badge>
          ) : (
            "--"
          )
        }
      />
      <Stat label="FPS" value={fmt(stats?.fps)} accent />
      <Stat label="Stream" value={fmt(stats?.latencyMs, "ms")} sub={`${fmt(stats?.bitrateMbps, "Mb")}`} />
      <Stat label="VRAM" value={fmt(stats?.vramUsedMb, "MB")} sub={`of ${fmt(stats?.vramTotalMb, "MB") || "--"}`} />
    </div>
  );
}
