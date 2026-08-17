"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { RemoteDesktop } from "@/components/RemoteDesktop";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Button } from "@/components/ui";
import { fmt } from "@/components/ui";

function HUD() {
  const { stats, stream } = useRuntime();
  const items = [
    ["FPS", stats?.fps != null ? String(Math.round(stats.fps)) : "--"],
    ["GPU", stats?.gpuPct != null ? `${Math.round(stats.gpuPct)}%` : "--"],
    ["VRAM", stats?.vramUsedMb != null ? `${Math.round(stats.vramUsedMb)}MB` : "--"],
    ["RES", stream?.resolution || "--"],
    ["LAT", stats?.latencyMs != null ? `${Math.round(stats.latencyMs)}ms` : "--"],
  ];
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 panel px-3 py-1.5 mono text-[11px] flex gap-3 z-30 pointer-events-none">
      {items.map(([k, v]) => (
        <span key={k} className="flex gap-1">
          <span className="text-muted">{k}</span>
          <span className="text-accent">{v}</span>
        </span>
      ))}
    </div>
  );
}

export default function SessionPage() {
  const [controls, setControls] = useState(true);
  const [hud, setHud] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function reveal() {
    setControls(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setControls(false), 3000);
  }

  useEffect(() => {
    reveal();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function goFullscreen() {
    document.documentElement.requestFullscreen?.();
  }

  return (
    <div
      className="fixed inset-0 bg-black z-40 select-none"
      onMouseMove={reveal}
    >
      <RemoteDesktop className="absolute inset-0" />
      {hud && <HUD />}

      {controls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-50 animate-fade-in">
          <Button variant="ghost" className="!py-1.5 !px-3 text-xs" onClick={() => setHud((v) => !v)}>
            Performance
          </Button>
          <Button variant="ghost" className="!py-1.5 !px-3 text-xs" onClick={goFullscreen}>
            Fullscreen
          </Button>
          <Link href="/desktop">
            <Button variant="ghost" className="!py-1.5 !px-3 text-xs">
              Desktop
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="danger" className="!py-1.5 !px-3 text-xs">
              Exit Game
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
