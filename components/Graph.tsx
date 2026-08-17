"use client";

import { SystemStats } from "@shared/types";

function buildPath(values: number[], w: number, h: number): string {
  if (values.length < 2) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function Graph({
  title,
  values,
  color = "#7C5CFF",
  unit = "%",
}: {
  title: string;
  values: number[];
  color?: string;
  unit?: string;
}) {
  const current = values.length ? values[values.length - 1] : null;
  const hasData = values.length >= 2;
  return (
    <div className="panel p-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted">{title}</span>
        <span className="mono">{current == null ? "--" : `${Math.round(current)}${unit}`}</span>
      </div>
      {hasData ? (
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-10">
          <path d={buildPath(values, 100, 30)} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
      ) : (
        <div className="h-10 flex items-center justify-center text-[11px] text-muted/60">No data</div>
      )}
    </div>
  );
}

export function StatsGraphs({ history }: { history: SystemStats[] }) {
  const pick = (f: (s: SystemStats) => number | null | undefined) =>
    history.map((s) => (s ? (f(s) as number) : 0)).filter((v) => v != null);
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <Graph title="GPU" values={pick((s) => s.gpuPct)} />
      <Graph title="CPU" values={pick((s) => s.cpuPct)} color="#45e0a8" />
      <Graph title="RAM" values={pick((s) => s.ramUsedMb)} unit="MB" color="#ffc857" />
      <Graph title="VRAM" values={pick((s) => s.vramUsedMb)} unit="MB" color="#ffc857" />
      <Graph title="FPS" values={pick((s) => s.fps)} color="#7C5CFF" />
      <Graph title="Latency" values={pick((s) => s.latencyMs)} unit="ms" color="#7C5CFF" />
    </div>
  );
}
