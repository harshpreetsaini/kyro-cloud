"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Card, Badge, Button } from "@/components/ui";
import type { AppEntry, AppState } from "@/lib/runtime/store";

interface StaticApp extends AppEntry {
  to?: string;
}

const STATIC: StaticApp[] = [
  { id: "steam", name: "Steam", category: "game-store", note: "Game launcher", supported: true },
  { id: "epic", name: "Epic Games", category: "game-store", note: "Epic Games / GOG via the Heroic Games Launcher.", supported: true },
  { id: "lutris", name: "Lutris", category: "game-store", note: "Game launcher for Epic, GOG, Battle.net and more.", supported: true },
  { id: "firefox", name: "Firefox", category: "browser", note: "Web browser" },
  { id: "terminal", name: "Terminal", category: "system", note: "Shell access", to: "/terminal" },
  { id: "files", name: "File Manager", category: "system", note: "Browse files", to: "/files" },
  { id: "settings", name: "System Settings", category: "system", note: "Desktop config", to: "/settings" },
];

function toneFor(state?: AppState): "success" | "warning" | "neutral" | "danger" {
  switch (state) {
    case "RUNNING":
    case "INSTALLED":
      return "success";
    case "STARTING":
    case "STOPPING":
    case "INSTALLING":
    case "FAILED":
      return "warning";
    case "UNSUPPORTED":
      return "danger";
    default:
      return "neutral";
  }
}

function labelFor(state?: AppState): string {
  switch (state) {
    case "RUNNING":
      return "● Running";
    case "INSTALLED":
      return "● Installed";
    case "NOT_INSTALLED":
      return "○ Not installed";
    case "STARTING":
      return "◌ Starting…";
    case "STOPPING":
      return "◌ Stopping…";
    case "FAILED":
      return "✕ Failed";
    case "UNSUPPORTED":
      return "✕ Unsupported";
    default:
      return "○ Unknown";
  }
}

export default function ApplicationsPage() {
  const { apps, launchApp, stopApp, fetchApps, session, stream } = useRuntime();

  const online = !!stream && ["STREAMING", "ONLINE", "DESKTOP_READY"].includes(session?.state || "");

  useEffect(() => {
    if (online) fetchApps();
  }, [online, fetchApps]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Applications</h2>
        <span className="text-xs text-muted">
          {Object.values(apps).filter((a) => a.state === "RUNNING" || a.state === "INSTALLED").length} available
        </span>
      </div>

      {!online && (
        <p className="text-sm text-warning">Start the Cloud PC to detect and launch applications.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {STATIC.map((a) => {
          const live = apps[a.id];
          const state = live?.state;
          const note = live?.note || a.note;
          const isRunning = state === "RUNNING";
          const supported = a.supported !== false && live?.supported !== false;
          return (
            <Card key={a.id} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                {a.id === "steam" ? "🎮" : a.id === "epic" ? "🎯" : a.id === "firefox" ? "🦊" : a.id === "terminal" ? "›_" : a.id === "files" ? "🗀" : "⚙"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{a.name}</p>
                <p className="text-[11px] text-muted truncate">{note}</p>
                <div className="mt-1">
                  <Badge tone={toneFor(state)}>
                    {supported ? labelFor(state) : "Unsupported"}
                  </Badge>
                </div>
              </div>
              {a.to ? (
                <Link href={a.to}>
                  <Button variant="secondary" className="!py-1 !px-3 text-xs">Open</Button>
                </Link>
              ) : isRunning ? (
                <Button variant="ghost" className="!py-1 !px-3 text-xs" onClick={() => stopApp(a.id)} disabled={!online}>
                  Stop
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="!py-1 !px-3 text-xs"
                  onClick={() => launchApp(a.id)}
                  disabled={!online || state === "STARTING" || state === "STOPPING" || !supported}
                >
                  {state === "NOT_INSTALLED" ? "Install / Open" : "Open"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
