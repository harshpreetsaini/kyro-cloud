"use client";

import { useState, useEffect } from "react";
import { Button, Card, Badge, StatusDot } from "@/components/ui";
import { RESOLUTION_OPTIONS, FPS_OPTIONS, QUALITY_OPTIONS } from "@shared/constants";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { adjustQuality } from "@/lib/runtime/store";

const KEY = "luna.settings";

export default function SettingsPage() {
  const { session, systemInfo, connected, stream } = useRuntime();
  const [settings, setSettings] = useState({
    resolution: "1080p",
    fps: 60,
    quality: "balanced",
    autoReconnect: true,
    perfOverlay: false,
    compactMode: false,
    animations: true,
    autoStart: false,
    mouseSensitivity: 1,
    volume: 80,
    muteAudio: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (!saved) return;
    try {
      setSettings((s) => ({ ...s, ...JSON.parse(saved) }));
    } catch {
      // Corrupt settings blob — ignore rather than crash the page.
      localStorage.removeItem(KEY);
    }
  }, []);

  function save() {
    localStorage.setItem(KEY, JSON.stringify(settings));
    // Apply streaming settings to active stream
    if (stream) {
      adjustQuality({
        resolution: settings.resolution,
        fps: typeof settings.fps === "number" ? settings.fps : 60,
        quality: settings.quality,
      });
    }
  }

  function update<K extends keyof typeof settings>(k: K, v: (typeof settings)[K]) {
    setSettings((s) => ({ ...s, [k]: v }));
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h2 className="font-display text-xl">Settings</h2>

      <Card className="flex flex-col gap-4">
        <h3 className="text-sm text-muted uppercase tracking-wider">Streaming</h3>
        <Select label="Resolution" value={settings.resolution} onChange={(v) => update("resolution", v)} options={[...RESOLUTION_OPTIONS]} />
        <Select
          label="Frame Rate"
          value={String(settings.fps)}
          onChange={(v) => update("fps", v === "Auto" ? ("Auto" as any) : Number(v))}
          options={[...FPS_OPTIONS].map(String)}
        />
        <Select label="Quality" value={settings.quality} onChange={(v) => update("quality", v as any)} options={[...QUALITY_OPTIONS]} />
        {stream && (
          <p className="text-[11px] text-muted">
            Changes apply to the active stream immediately.
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-sm text-muted uppercase tracking-wider">Connection</h3>
        <Toggle label="Auto-reconnect" checked={settings.autoReconnect} onChange={(v) => update("autoReconnect", v)} />
        <Toggle label="Auto-start Cloud PC" checked={settings.autoStart} onChange={(v) => update("autoStart", v)} />
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-sm text-muted uppercase tracking-wider">Input & Audio</h3>
        <label className="flex items-center justify-between text-sm">
          <span>Mouse sensitivity</span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={settings.mouseSensitivity}
            onChange={(e) => update("mouseSensitivity", Number(e.target.value))}
            className="accent-[var(--color-accent)]"
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={settings.volume}
            onChange={(e) => update("volume", Number(e.target.value))}
            className="accent-[var(--color-accent)]"
          />
        </label>
        <Toggle label="Mute audio" checked={settings.muteAudio} onChange={(v) => update("muteAudio", v)} />
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-sm text-muted uppercase tracking-wider">Interface</h3>
        <Toggle label="Performance overlay" checked={settings.perfOverlay} onChange={(v) => update("perfOverlay", v)} />
        <Toggle label="Compact mode" checked={settings.compactMode} onChange={(v) => update("compactMode", v)} />
        <Toggle label="Animations" checked={settings.animations} onChange={(v) => update("animations", v)} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm text-muted uppercase tracking-wider">Runtime</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Compute provider</span>
          <Badge tone="neutral">{session?.provider || "—"}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Runtime status</span>
          <span className="flex items-center gap-2">
            <StatusDot tone={connected ? "online" : "offline"} />
            {session?.state || (connected ? "CONNECTED" : "OFFLINE")}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Storage</span>
          <span className="mono">
            {systemInfo?.storage?.usedMb != null
              ? `${Math.round(systemInfo.storage.usedMb / 1024)} / ${Math.round((systemInfo.storage.totalMb || 0) / 1024)} GB`
              : "—"}
          </span>
        </div>
      </Card>

      <div>
        <Button onClick={save}>Save settings</Button>
        <p className="text-[11px] text-muted mt-2">Stored locally in this browser.</p>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-secondary rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent">
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
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
