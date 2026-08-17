"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";

export function PerfOverlay({ visible }: { visible: boolean }) {
  const { stats, systemInfo, stream } = useRuntime();
  if (!visible) return null;
  const rows: [string, string, boolean][] = [
    ["FPS", stats?.fps != null ? String(Math.round(stats.fps)) : "--", true],
    ["GPU", stats?.gpuPct != null ? `${Math.round(stats.gpuPct)}%` : "--", true],
    ["Latency", stats?.latencyMs != null ? `${Math.round(stats.latencyMs)}ms` : "--", true],
    ["GPU °C", stats?.gpuTempC != null ? `${Math.round(stats.gpuTempC)}°` : "--", false],
    ["VRAM", stats?.vramUsedMb != null ? `${Math.round(stats.vramUsedMb)}MB` : "--", false],
    ["CPU", stats?.cpuPct != null ? `${Math.round(stats.cpuPct)}%` : "--", false],
    ["RAM", stats?.ramUsedMb != null ? `${Math.round(stats.ramUsedMb)}MB` : "--", false],
    ["Bitrate", stats?.bitrateMbps != null ? `${Math.round(stats.bitrateMbps)}Mb` : "--", false],
    ["Res", stream?.resolution || systemInfo?.gpu?.name ? (stream?.resolution || "--") : "--", false],
  ];
  return (
    <div className="absolute top-3 left-3 panel px-3 py-2 mono text-[11px] leading-5 z-20 pointer-events-none min-w-[140px]">
      {rows.map(([k, v, key]) => (
        <div key={k} className="flex justify-between gap-4">
          <span className="text-muted">{k}</span>
          <span className={key ? "text-accent font-medium" : "text-text"}>{v}</span>
        </div>
      ))}
    </div>
  );
}
