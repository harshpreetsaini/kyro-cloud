"use client";

import Link from "next/link";
import type { GameEntry } from "@shared/types";
import { Badge, Button } from "@/components/ui";

// Gradient colors for game art placeholders
const GRADIENTS = [
  "from-purple-900/80 to-blue-900/80",
  "from-blue-900/80 to-cyan-900/80",
  "from-green-900/80 to-teal-900/80",
  "from-orange-900/80 to-red-900/80",
  "from-pink-900/80 to-purple-900/80",
  "from-indigo-900/80 to-violet-900/80",
];

function getGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function GameCard({
  game,
  running,
  onLaunch,
  onStop,
  showPlayButton = false,
}: {
  game: GameEntry;
  running?: boolean;
  onLaunch: (id: string) => void;
  onStop?: (id: string) => void;
  showPlayButton?: boolean;
}) {
  const installing = game.installState === "installing" || game.installState === "updating";
  const primaryProvider = game.providers?.[0];
  const gradient = getGradient(game.id);

  return (
    <Link href={`/games/${game.slug}`}>
      <div className="panel flex flex-col overflow-hidden hover:border-accent/40 transition-all hover:scale-[1.02] group cursor-pointer">
        {/* Game Art */}
        <div
          className={`relative h-40 flex items-center justify-center bg-gradient-to-br ${gradient}`}
        >
          {game.coverImage ? (
            <img
              src={game.coverImage}
              alt={game.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="font-display text-5xl text-white/90 drop-shadow">
              {getInitial(game.name)}
            </span>
          )}
          
          {/* Provider badge */}
          {primaryProvider && (
            <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider text-white/80 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
              {primaryProvider.name}
            </span>
          )}
          
          {/* Rating */}
          {game.rating && (
            <span className="absolute top-2 right-2 text-xs text-yellow-400 bg-black/50 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
              ★ {game.rating.toFixed(1)}
            </span>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            {game.installed ? (
              <span className="text-white font-medium px-4 py-2 bg-accent rounded-lg">
                Play
              </span>
            ) : (
              <span className="text-white font-medium px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm">
                View Details
              </span>
            )}
          </div>
        </div>

        {/* Game Info */}
        <div className="p-3 flex flex-col gap-1.5 flex-1">
          <p className="font-medium leading-tight truncate" title={game.name}>
            {game.name}
          </p>
          
          {/* Genres */}
          {game.genres && game.genres.length > 0 && (
            <p className="text-[11px] text-muted truncate">
              {game.genres.slice(0, 2).map((g) => g.name).join(" · ")}
            </p>
          )}

          {/* Status and Actions */}
          <div className="mt-auto flex items-center justify-between pt-1">
            {installing ? (
              <span className="text-[11px] text-muted inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded-full border-2 border-muted/40 border-t-accent animate-spin" />
                Installing
              </span>
            ) : running ? (
              <Badge tone="success">● Running</Badge>
            ) : game.installed ? (
              <Badge tone="success">● Installed</Badge>
            ) : (
              <Badge tone="neutral">○ Not installed</Badge>
            )}

            {showPlayButton && game.installed && !installing && (
              running ? (
                <Button 
                  variant="danger" 
                  className="!py-1 !px-3 text-xs" 
                  onClick={(e) => { e?.preventDefault(); onStop?.(game.id); }}
                >
                  Stop
                </Button>
              ) : (
                <Button 
                  className="!py-1 !px-3 text-xs" 
                  onClick={(e) => { e?.preventDefault(); onLaunch(game.id); }}
                >
                  Play
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
