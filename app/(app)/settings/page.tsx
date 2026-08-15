"use client";

import { useState, useEffect } from "react";
import { Button, Card } from "@/components/ui";
import { RESOLUTION_OPTIONS, FPS_OPTIONS, QUALITY_OPTIONS } from "@shared/constants";

const KEY = "luna.settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    resolution: "1080p",
    fps: 60,
    quality: "balanced",
    autoReconnect: true,
    perfOverlay: false,
    compactMode: false,
    mouseSensitivity: 1,
  });

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) setSettings((s) => ({ ...s, ...JSON.parse(saved) }));
  }, []);

  function save() {
    localStorage.setItem(KEY, JSON.stringify(settings));
  }

  function update<K extends keyof typeof settings>(k: K, v: (typeof settings)[K]) {
    setSettings((s) => ({ ...s, [k]: v }));
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h2 className="font-display text-xl">Settings</h2>

      <Card className="flex flex-col gap-4">
        <h3 className="text-sm text-muted uppercase tracking-wider">Streaming</h3>
        <label className="flex items-center justify-between text-sm">
          <span>Resolution</span>
          <select
            value={settings.resolution}
            onChange={(e) => update("resolution", e.target.value)}
            className="bg-secondary rounded-lg px-2 py-1"
          >
            {RESOLUTION_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>Frame Rate</span>
          <select
            value={String(settings.fps)}
            onChange={(e) => update("fps", e.target.value === "Auto" ? ("Auto" as any) : Number(e.target.value))}
            className="bg-secondary rounded-lg px-2 py-1"
          >
            {FPS_OPTIONS.map((o) => (
              <option key={String(o)} value={String(o)}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>Quality</span>
          <select
            value={settings.quality}
            onChange={(e) => update("quality", e.target.value as any)}
            className="bg-secondary rounded-lg px-2 py-1"
          >
            {QUALITY_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-sm text-muted uppercase tracking-wider">Interface & Input</h3>
        <Toggle label="Auto-reconnect" checked={settings.autoReconnect} onChange={(v) => update("autoReconnect", v)} />
        <Toggle label="Performance overlay" checked={settings.perfOverlay} onChange={(v) => update("perfOverlay", v)} />
        <Toggle label="Compact mode" checked={settings.compactMode} onChange={(v) => update("compactMode", v)} />
        <label className="flex items-center justify-between text-sm">
          <span>Mouse sensitivity</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={settings.mouseSensitivity}
            onChange={(e) => update("mouseSensitivity", Number(e.target.value))}
          />
        </label>
      </Card>

      <div>
        <Button onClick={save}>Save settings</Button>
        <p className="text-[11px] text-muted mt-2">Stored locally in this browser for Round 1.</p>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-sm cursor-pointer">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[var(--color-accent)] w-4 h-4" />
    </label>
  );
}
