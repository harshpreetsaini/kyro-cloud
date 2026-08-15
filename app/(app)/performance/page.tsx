"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";
import { SystemStatsPanel } from "@/components/SystemStatsPanel";
import { StatsGraphs } from "@/components/Graph";

function Bar({ label, value, suffix = "%", tone = "bg-accent" }: { label: string; value?: number | null; suffix?: string; tone?: string }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="panel p-3">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-muted">{label}</span>
        <span className="mono">{value == null ? "--" : `${Math.round(value)}${suffix}`}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { stats, systemInfo, statsHistory } = useRuntime();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xl">Performance</h2>
      <SystemStatsPanel />
      <StatsGraphs history={statsHistory} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Bar label="GPU" value={stats?.gpuPct} />
        <Bar label="CPU" value={stats?.cpuPct} tone="bg-[#45e0a8]" />
        <Bar
          label="RAM"
          value={stats?.ramTotalMb ? ((stats.ramUsedMb || 0) / stats.ramTotalMb) * 100 : null}
          tone="bg-[#ffc857]"
        />
        <Bar
          label="VRAM"
          value={stats?.vramTotalMb ? ((stats.vramUsedMb || 0) / stats.vramTotalMb) * 100 : null}
          tone="bg-[#ffc857]"
        />
        <Bar label="Stream bitrate" value={stats?.bitrateMbps} suffix=" Mb" tone="bg-accent" />
      </div>
      <p className="text-[11px] text-muted">
        Values are read from the runtime when available. Missing sensors show “--”.
      </p>
    </div>
  );
}
