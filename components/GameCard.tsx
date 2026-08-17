"use client";

import type { GameEntry } from "@shared/types";
import { Badge, Button } from "@/components/ui";

const COMPAT_TONE: Record<string, "success" | "accent" | "warning" | "danger"> = {
  SUPPORTED: "success",
  PARTIAL: "accent",
  UNKNOWN: "warning",
  UNSUPPORTED: "danger",
};

function artColors(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const h2 = (h + 40) % 360;
  return [`hsl(${h} 55% 28%)`, `hsl(${h2} 60% 16%)`];
}

export function GameCard({
  game,
  running,
  onLaunch,
  onStop,
}: {
  game: GameEntry;
  running?: boolean;
  onLaunch: (id: string) => void;
  onStop?: (id: string) => void;
}) {
  const unsupported = game.compatibility === "UNSUPPORTED";
  const installing = game.installState === "installing" || game.installState === "updating";
  const [c1, c2] = artColors(game.name);
  const initial = game.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="panel flex flex-col overflow-hidden hover:border-accent/40 transition group">
      <div
        className="relative h-32 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      >
        <span className="font-display text-5xl text-white/90 drop-shadow">{initial}</span>
        <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider text-white/80 bg-black/30 px-2 py-0.5 rounded-full">
          {game.launcher || "standalone"}
        </span>
        <span className="absolute top-2 right-2">
          <Badge tone={COMPAT_TONE[game.compatibility]}>{game.compatibility}</Badge>
        </span>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="font-medium leading-tight truncate" title={game.name}>
            {game.name}
          </p>
          <p className="text-[11px] text-muted truncate">
            {game.lastPlayed ? `Last played ${game.lastPlayed}` : game.launcher || "standalone"}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          {unsupported ? (
            <Badge tone="danger">Unsupported</Badge>
          ) : installing ? (
            <span className="text-[11px] text-muted inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-2 border-muted/40 border-t-accent animate-spin" />
              {game.installState === "updating" ? "Updating" : "Installing"}
            </span>
          ) : running ? (
            <Badge tone="success">● Running</Badge>
          ) : game.installed ? (
            <Badge tone="success">● Installed</Badge>
          ) : (
            <Badge tone="neutral">○ Not installed</Badge>
          )}

          {unsupported ? (
            <Button variant="ghost" className="!py-1 !px-3 text-xs" disabled title="No supported path on Linux">
              Play
            </Button>
          ) : installing ? (
            <Button variant="ghost" className="!py-1 !px-3 text-xs" disabled>
              {game.installState === "updating" ? "Updating" : "Installing"}
            </Button>
          ) : running ? (
            <Button variant="danger" className="!py-1 !px-3 text-xs" onClick={() => onStop?.(game.id)}>
              Stop
            </Button>
          ) : game.installed ? (
            <Button className="!py-1 !px-3 text-xs" onClick={() => onLaunch(game.id)}>
              Play
            </Button>
          ) : (
            <Button variant="secondary" className="!py-1 !px-3 text-xs" onClick={() => onLaunch(game.id)}>
              Install
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
