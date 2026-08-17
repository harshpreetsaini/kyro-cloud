"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";
import { SystemStatsPanel } from "@/components/SystemStatsPanel";
import { StatsGraphs } from "@/components/Graph";
import { Card, Badge, StatusDot } from "@/components/ui";
import { useCloudPhase } from "@/components/CloudStates";
import { fmt } from "@/components/ui";

function Bar({ label, value, suffix = "%", tone = "bg-accent" }: { label: string; value?: number | null; suffix?: string; tone?: string }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="panel p-3">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-muted">{label}</span>
        <span className="mono">{value == null ? "--" : `${Math.round(value)}${suffix}`}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Metric({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="panel p-4 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <span className="mono text-3xl text-accent leading-none">
        {value}
        {unit && <span className="text-base text-muted ml-1">{unit}</span>}
      </span>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

export default function PerformancePage() {
  const { stats, systemInfo, statsHistory } = useRuntime();
  const phase = useCloudPhase();

  if (phase !== "online") {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl">Performance</h2>
        <Card className="flex items-center gap-3">
          <StatusDot tone="offline" />
          <div>
            <p className="font-medium">CLOUD PC OFFLINE</p>
            <p className="text-sm text-muted">Performance metrics will appear when the runtime is connected.</p>
          </div>
        </Card>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 opacity-40 pointer-events-none">
          {["FPS", "GPU", "Latency", "VRAM", "CPU", "RAM", "Bitrate", "Storage"].map((l) => (
            <div key={l} className="panel p-4">
              <span className="text-[11px] uppercase tracking-wider text-muted">{l}</span>
              <p className="mono text-3xl text-muted mt-1">--</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xl">Performance</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="FPS" value={stats?.fps != null ? String(Math.round(stats.fps)) : "--"} sub={systemInfo?.gpu?.name ? "GPU online" : "—"} />
        <Metric label="GPU" value={fmt(stats?.gpuPct, "%")} sub={systemInfo?.gpu?.name || "—"} />
        <Metric label="Latency" value={fmt(stats?.latencyMs, "ms")} sub={systemInfo?.network?.quality || "—"} />
        <Metric label="VRAM" value={fmt(stats?.vramUsedMb, "MB")} sub={`of ${fmt(stats?.vramTotalMb, "MB") || "--"}`} />
      </div>

      <StatsGraphs history={statsHistory} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
        <Bar
          label="Storage"
          value={systemInfo?.storage?.totalMb ? ((systemInfo.storage.usedMb || 0) / systemInfo.storage.totalMb) * 100 : null}
          tone="bg-[#ffc857]"
        />
      </div>
    </div>
  );
}
