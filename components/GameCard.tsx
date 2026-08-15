"use client";

import type { GameEntry } from "@shared/types";
import { Badge, Button } from "@/components/ui";

const COMPAT_TONE: Record<string, "success" | "accent" | "warning" | "danger"> = {
  SUPPORTED: "success",
  PARTIAL: "accent",
  UNKNOWN: "warning",
  UNSUPPORTED: "danger",
};

export function GameCard({ game, onLaunch }: { game: GameEntry; onLaunch: (id: string) => void }) {
  return (
    <div className="panel p-4 flex flex-col gap-3 hover:border-accent/40 transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{game.name}</p>
          <p className="text-[11px] text-muted">{game.launcher || "standalone"}</p>
        </div>
        <Badge tone={COMPAT_TONE[game.compatibility]}>{game.compatibility}</Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted">{game.installed ? "Installed" : "Not installed"}</span>
        <Button onClick={() => onLaunch(game.id)} variant="ghost" className="!py-1 !px-3 text-xs">
          {game.installed ? "Launch" : "Install / Launch"}
        </Button>
      </div>
    </div>
  );
}
