"use client";

import Link from "next/link";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Card, Badge, Button } from "@/components/ui";

interface AppDef {
  name: string;
  note: string;
  icon: string;
  id?: string;
  to?: string;
  installed?: boolean;
}

const APPS: AppDef[] = [
  { name: "Steam", note: "Game launcher", icon: "🎮", id: "steam", installed: true },
  { name: "Epic Games", note: "Game launcher", icon: "🎯", id: "epic", installed: false },
  { name: "Firefox", note: "Web browser", icon: "🦊", id: "firefox", installed: true },
  { name: "Terminal", note: "Shell access", icon: "›_", to: "/terminal", installed: true },
  { name: "File Manager", note: "Browse files", icon: "🗀", to: "/files", installed: true },
  { name: "System Settings", note: "Desktop config", icon: "⚙", to: "/settings", installed: true },
];

export default function ApplicationsPage() {
  const { launchGame } = useRuntime();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Applications</h2>
        <span className="text-xs text-muted">{APPS.filter((a) => a.installed).length} available</span>
      </div>
      <p className="text-sm text-muted max-w-2xl">
        Apps run inside your Cloud PC. Open them once the session is online; unavailable apps show Install.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {APPS.map((a) => (
          <Card key={a.name} className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
              {a.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{a.name}</p>
              <p className="text-[11px] text-muted truncate">{a.note}</p>
              <div className="mt-1">
                {a.installed ? (
                  <Badge tone="success">● Installed</Badge>
                ) : (
                  <Badge tone="neutral">○ Not installed</Badge>
                )}
              </div>
            </div>
            {a.installed ? (
              a.to ? (
                <Link href={a.to}>
                  <Button variant="secondary" className="!py-1 !px-3 text-xs">
                    Open
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" className="!py-1 !px-3 text-xs" onClick={() => a.id && launchGame(a.id)}>
                  Open
                </Button>
              )
            ) : (
              <Button variant="ghost" className="!py-1 !px-3 text-xs" onClick={() => a.id && launchGame(a.id)}>
                Install
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
