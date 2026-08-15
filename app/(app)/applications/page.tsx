"use client";

import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Card, Badge } from "@/components/ui";

const APPS = [
  { name: "Steam", note: "Game launcher", id: "steam" },
  { name: "Epic Games", note: "Game launcher", id: "epic" },
  { name: "Firefox", note: "Browser", id: "firefox" },
  { name: "Terminal", note: "Shell", id: null },
  { name: "File Manager", note: "Files", id: null },
  { name: "System Settings", note: "Desktop config", id: null },
];

export default function ApplicationsPage() {
  const { launchGame } = useRuntime();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xl">Applications</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {APPS.map((a) => (
          <Card key={a.name} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-[11px] text-muted">{a.note}</p>
            </div>
            {a.id ? (
              <Badge tone="accent" className="cursor-pointer" >
                <span onClick={() => launchGame(a.id!)}>Launch</span>
              </Badge>
            ) : (
              <Badge tone="neutral">—</Badge>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
