"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { RemoteDesktop } from "@/components/RemoteDesktop";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Button } from "@/components/ui";
import { fmt } from "@/components/ui";

function HUD() {
  const { stats, stream, systemInfo } = useRuntime();
  const items = [
    ["FPS", stats?.fps != null ? String(Math.round(stats.fps)) : "--"],
    ["GPU", stats?.gpuPct != null ? `${Math.round(stats.gpuPct)}%` : "--"],
    ["VRAM", stats?.vramUsedMb != null ? `${Math.round(stats.vramUsedMb)}MB` : "--"],
    ["RES", stream?.resolution || "--"],
    ["LAT", stats?.latencyMs != null ? `${Math.round(stats.latencyMs)}ms` : "--"],
    ["NET", stats?.bitrateMbps != null ? `${Math.round(stats.bitrateMbps)}Mb` : "--"],
  ];
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 panel px-3 py-1.5 mono text-[11px] flex gap-3 z-30 pointer-events-none bg-black/60 backdrop-blur-sm">
      {items.map(([k, v]) => (
        <span key={k} className="flex gap-1">
          <span className="text-muted">{k}</span>
          <span className="text-accent">{v}</span>
        </span>
      ))}
    </div>
  );
}

function GameControls({ onExit }: { onExit: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 animate-fade-in">
      {showConfirm ? (
        <div className="panel p-4 flex flex-col items-center gap-3 bg-black/80 backdrop-blur-sm">
          <p className="text-sm font-medium">Exit Game?</p>
          <p className="text-xs text-muted">Your game will be stopped.</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="!py-1.5 !px-3 text-xs" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="!py-1.5 !px-3 text-xs" onClick={onExit}>
              Exit Game
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Link href="/home">
            <Button variant="ghost" className="!py-1.5 !px-3 text-xs">
              Library
            </Button>
          </Link>
          <Button variant="danger" className="!py-1.5 !px-3 text-xs" onClick={() => setShowConfirm(true)}>
            Exit Game
          </Button>
        </div>
      )}
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
        <GameControls onExit={() => window.location.href = "/home"} />
      )}

      {/* Toggle HUD button - always visible */}
      <button
        onClick={() => setHud((v) => !v)}
        className="absolute top-3 right-3 panel px-2 py-1 text-[10px] text-muted hover:text-text z-50 transition-opacity"
        style={{ opacity: controls ? 1 : 0.5 }}
      >
        {hud ? "Hide HUD" : "Show HUD"}
      </button>
    </div>
  );
}
