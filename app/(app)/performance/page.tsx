"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";
import { StatsGraphs } from "@/components/Graph";
import { Card, Badge, StatusDot } from "@/components/ui";
import { useCloudPhase } from "@/components/CloudStates";

function Bar({ label, value, suffix = "%", tone = "bg-accent" }: { label: string; value?: number | null; suffix?: string; tone?: string }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="panel p-3">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-muted">{label}</span>
        <span className="mono text-muted">{value == null ? "Unavailable" : `${Math.round(value)}${suffix}`}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Metric({ label, value, unit, sub }: { label: string; value: string | null; unit?: string; sub?: string }) {
  const isUnavailable = value == null || value === "--";
  return (
    <div className="panel p-4 flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <span className={`mono text-3xl leading-none ${isUnavailable ? "text-muted" : "text-accent"}`}>
        {isUnavailable ? "—" : value}
        {!isUnavailable && unit && <span className="text-base text-muted ml-1">{unit}</span>}
      </span>
      {sub && <span className="text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

function InfoRow({ label, value, badge }: { label: string; value: string | null; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-2">
        {badge && <Badge tone="neutral">{badge}</Badge>}
        <span className="text-sm text-right">{value || "—"}</span>
      </div>
    </div>
  );
}

function GpuCard({ systemInfo }: { systemInfo: any }) {
  const gpu = systemInfo?.gpu;
  if (!gpu) return null;
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
        </div>
        <div>
          <h3 className="font-semibold">GPU</h3>
          <p className="text-xs text-muted">Graphics Processing Unit</p>
        </div>
        {gpu.available && <Badge tone="success">Active</Badge>}
      </div>
      <div className="flex flex-col">
        <InfoRow label="Model" value={gpu.name} badge={gpu.available ? "Detected" : undefined} />
        <InfoRow label="VRAM" value={gpu.vramMb ? `${(gpu.vramMb / 1024).toFixed(1)} GB` : null} />
        <InfoRow label="VRAM Used" value={gpu.usedMb ? `${(gpu.usedMb / 1024).toFixed(1)} GB` : null} />
        <InfoRow label="VRAM Free" value={gpu.freeMb ? `${(gpu.freeMb / 1024).toFixed(1)} GB` : null} />
        <InfoRow label="Driver" value={gpu.driver} />
        <InfoRow label="Temperature" value={gpu.temperatureC != null ? `${gpu.temperatureC}°C` : null} badge={gpu.temperatureC != null && gpu.temperatureC > 80 ? "Hot" : undefined} />
        <InfoRow label="Utilization" value={gpu.utilizationPct != null ? `${gpu.utilizationPct}%` : null} />
        <InfoRow label="Memory Utilization" value={gpu.memoryUtilPct != null ? `${gpu.memoryUtilizationPct}%` : null} />
      </div>
    </div>
  );
}

function CpuCard({ systemInfo }: { systemInfo: any }) {
  const cpu = systemInfo?.cpu;
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
        <div>
          <h3 className="font-semibold">CPU</h3>
          <p className="text-xs text-muted">Central Processing Unit</p>
        </div>
      </div>
      <div className="flex flex-col">
        <InfoRow label="Model" value={cpu?.model} />
        <InfoRow label="Cores" value={cpu?.cores != null ? `${cpu.cores} threads` : null} />
        <InfoRow label="Utilization" value={cpu?.utilizationPct != null ? `${cpu.utilizationPct}%` : null} />
      </div>
    </div>
  );
}

function RamCard({ systemInfo, stats }: { systemInfo: any; stats: any }) {
  const ram = systemInfo?.ram;
  const usedMb = stats?.ramUsedMb || ram?.usedMb;
  const totalMb = stats?.ramTotalMb || ram?.totalMb;
  const pct = totalMb ? ((usedMb || 0) / totalMb) * 100 : null;
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
        <div>
          <h3 className="font-semibold">Memory</h3>
          <p className="text-xs text-muted">System RAM</p>
        </div>
      </div>
      <div className="flex flex-col">
        <InfoRow label="Total" value={totalMb ? `${(totalMb / 1024).toFixed(1)} GB` : null} />
        <InfoRow label="Used" value={usedMb ? `${(usedMb / 1024).toFixed(1)} GB` : null} />
        <InfoRow label="Free" value={totalMb && usedMb ? `${((totalMb - usedMb) / 1024).toFixed(1)} GB` : null} />
        <InfoRow label="Usage" value={pct != null ? `${pct.toFixed(1)}%` : null} />
      </div>
      {pct != null && (
        <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function StorageCard({ systemInfo }: { systemInfo: any }) {
  const storage = systemInfo?.storage;
  const usedPct = storage?.totalMb && storage?.usedMb ? (storage.usedMb / storage.totalMb) * 100 : null;
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
        </div>
        <div>
          <h3 className="font-semibold">Storage</h3>
          <p className="text-xs text-muted">Disk Usage</p>
        </div>
        {storage?.mounted && <Badge tone="success">Mounted</Badge>}
      </div>
      <div className="flex flex-col">
        <InfoRow label="Total" value={storage?.totalMb ? `${(storage.totalMb / 1024).toFixed(1)} GB` : null} />
        <InfoRow label="Used" value={storage?.usedMb ? `${(storage.usedMb / 1024).toFixed(1)} GB` : null} />
        <InfoRow label="Free" value={storage?.totalMb && storage?.usedMb ? `${((storage.totalMb - storage.usedMb) / 1024).toFixed(1)} GB` : null} />
        <InfoRow label="Usage" value={usedPct != null ? `${usedPct.toFixed(1)}%` : null} />
      </div>
      {usedPct != null && (
        <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full transition-all ${usedPct > 90 ? "bg-red-500" : usedPct > 70 ? "bg-yellow-500" : "bg-purple-500"}`} style={{ width: `${usedPct}%` }} />
        </div>
      )}
    </div>
  );
}

function NetworkCard({ systemInfo, stats }: { systemInfo: any; stats: any }) {
  const net = systemInfo?.network;
  const qualityColors: Record<string, string> = {
    excellent: "text-green-400",
    good: "text-blue-400",
    fair: "text-yellow-400",
    poor: "text-red-400",
    unknown: "text-muted",
  };
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
        </div>
        <div>
          <h3 className="font-semibold">Network</h3>
          <p className="text-xs text-muted">Connection Quality</p>
        </div>
        <Badge tone={net?.quality === "excellent" || net?.quality === "good" ? "success" : net?.quality === "fair" ? "warning" : "neutral"}>
          {net?.quality || "unknown"}
        </Badge>
      </div>
      <div className="flex flex-col">
        <InfoRow label="Latency" value={stats?.latencyMs != null ? `${Math.round(stats.latencyMs)} ms` : net?.pingMs != null ? `${Math.round(net.pingMs)} ms` : null} />
        <InfoRow label="Bitrate" value={stats?.bitrateMbps != null ? `${stats.bitrateMbps.toFixed(1)} Mbps` : null} />
        <InfoRow label="Upload" value={net?.upBps ? `${(net.upBps / 1024 / 1024).toFixed(1)} Mbps` : null} />
        <InfoRow label="Download" value={net?.downBps ? `${(net.downBps / 1024 / 1024).toFixed(1)} Mbps` : null} />
        <InfoRow label="State" value={net?.state} />
        <InfoRow label="Quality" value={net?.quality} />
      </div>
    </div>
  );
}

function StreamCard({ stats, systemInfo }: { stats: any; systemInfo: any }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        </div>
        <div>
          <h3 className="font-semibold">Stream</h3>
          <p className="text-xs text-muted">Video Stream Performance</p>
        </div>
        {stats?.streaming && <Badge tone="success">Active</Badge>}
      </div>
      <div className="flex flex-col">
        <InfoRow label="FPS" value={stats?.fps != null ? String(Math.round(stats.fps)) : null} />
        <InfoRow label="Frame Time" value={stats?.frameTimeMs != null ? `${stats.frameTimeMs.toFixed(1)} ms` : null} />
        <InfoRow label="Latency" value={stats?.latencyMs != null ? `${stats.latencyMs.toFixed(1)} ms` : null} badge={stats?.latencySource || undefined} />
        <InfoRow label="Bitrate" value={stats?.bitrateMbps != null ? `${stats.bitrateMbps.toFixed(1)} Mbps` : null} />
        <InfoRow label="Resolution" value="Up to 1080p" />
        <InfoRow label="Target FPS" value="60" />
      </div>
    </div>
  );
}

function SystemInfoCard({ systemInfo }: { systemInfo: any }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
          <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </div>
        <div>
          <h3 className="font-semibold">System</h3>
          <p className="text-xs text-muted">Operating System</p>
        </div>
      </div>
      <div className="flex flex-col">
        <InfoRow label="OS" value={systemInfo?.os} />
        <InfoRow label="Hostname" value={systemInfo?.hostname} />
        <InfoRow label="Runtime" value={systemInfo?.simulated ? "Simulated" : "Live"} badge={systemInfo?.simulated ? "Mock" : "Real"} />
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { stats, systemInfo, statsHistory } = useRuntime();
  const phase = useCloudPhase();

  const hasTelemetry = stats?.gpuPct != null || stats?.cpuPct != null || stats?.ramUsedMb != null;

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
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-xl">Performance</h2>

      {/* Quick metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="FPS" value={stats?.fps != null ? String(Math.round(stats.fps)) : "--"} sub={systemInfo?.gpu?.name ? "GPU online" : "—"} />
        <Metric label="GPU" value={stats?.gpuPct != null ? `${Math.round(stats.gpuPct)}%` : "--"} sub={systemInfo?.gpu?.name || "—"} />
        <Metric label="Latency" value={stats?.latencyMs != null ? `${Math.round(stats.latencyMs)}` : "--"} unit="ms" sub={systemInfo?.network?.quality || "—"} />
        <Metric label="VRAM" value={stats?.vramUsedMb != null ? `${(stats.vramUsedMb / 1024).toFixed(1)}` : "--"} unit="GB" sub={`of ${stats?.vramTotalMb ? (stats.vramTotalMb / 1024).toFixed(1) : "--"} GB`} />
      </div>

      {!hasTelemetry && (
        <Card className="flex items-center gap-3">
          <StatusDot tone="starting" pulse />
          <div>
            <p className="font-medium">Waiting for runtime telemetry</p>
            <p className="text-sm text-muted">The Colab agent will begin sending metrics shortly.</p>
          </div>
        </Card>
      )}

      {/* Hardware details */}
      <h3 className="font-semibold text-lg">System Hardware</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <GpuCard systemInfo={systemInfo} />
        <CpuCard systemInfo={systemInfo} />
        <RamCard systemInfo={systemInfo} stats={stats} />
        <StorageCard systemInfo={systemInfo} />
        <NetworkCard systemInfo={systemInfo} stats={stats} />
        <StreamCard stats={stats} systemInfo={systemInfo} />
        <SystemInfoCard systemInfo={systemInfo} />
      </div>

      {/* Usage bars */}
      <h3 className="font-semibold text-lg">Real-Time Usage</h3>
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
        <Bar label="GPU" value={stats?.gpuPct} tone="bg-green-500" />
        <Bar label="Stream bitrate" value={stats?.bitrateMbps} suffix=" Mb" tone="bg-accent" />
        <Bar
          label="Storage"
          value={systemInfo?.storage?.totalMb ? ((systemInfo.storage.usedMb || 0) / systemInfo.storage.totalMb) * 100 : null}
          tone="bg-purple-500"
        />
      </div>

      {/* Charts */}
      <h3 className="font-semibold text-lg">Performance History</h3>
      <StatsGraphs history={statsHistory} />
    </div>
  );
}
