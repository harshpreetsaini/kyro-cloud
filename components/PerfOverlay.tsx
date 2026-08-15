"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";

export function PerfOverlay({ visible }: { visible: boolean }) {
  const { stats, systemInfo } = useRuntime();
  if (!visible) return null;
  const rows: [string, string][] = [
    ["FPS", stats?.fps != null ? String(Math.round(stats.fps)) : "--"],
    ["Frame", stats?.frameTimeMs != null ? `${stats.frameTimeMs.toFixed(1)} ms` : "--"],
    ["GPU", stats?.gpuPct != null ? `${Math.round(stats.gpuPct)}%` : "--"],
    ["GPU °C", stats?.gpuTempC != null ? `${Math.round(stats.gpuTempC)}°` : "--"],
    ["VRAM", stats?.vramUsedMb != null ? `${Math.round(stats.vramUsedMb)}MB` : "--"],
    ["CPU", stats?.cpuPct != null ? `${Math.round(stats.cpuPct)}%` : "--"],
    ["RAM", stats?.ramUsedMb != null ? `${Math.round(stats.ramUsedMb)}MB` : "--"],
    ["Latency", stats?.latencyMs != null ? `${Math.round(stats.latencyMs)}ms` : "--"],
    ["Bitrate", stats?.bitrateMbps != null ? `${Math.round(stats.bitrateMbps)}Mb` : "--"],
  ];
  return (
    <div className="absolute top-3 left-3 panel px-3 py-2 mono text-[11px] leading-5 z-20 pointer-events-none">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <span className="text-muted">{k}</span>
          <span className="text-accent">{v}</span>
        </div>
      ))}
    </div>
  );
}
