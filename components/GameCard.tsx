"use client";

import Link from "next/link";
import { useState } from "react";
import type { GameEntry } from "@shared/types";

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
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const installing = game.installState === "installing" || game.installState === "updating";
  const primaryProvider = game.providers?.[0];

  return (
    <Link href={`/games/${game.slug}`}>
      <div
        className="group relative flex flex-col overflow-hidden rounded-xl bg-surface border border-white/5 hover:border-accent/30 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Cover Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          {game.coverImage && !imgError ? (
            <img
              src={game.coverImage}
              alt={game.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-secondary">
              <span className="text-3xl font-bold text-muted/40">{game.name?.charAt(0)}</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          {/* Provider badge */}
          {primaryProvider && (
            <span className="absolute top-2 left-2 text-[9px] uppercase tracking-wider text-white/90 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm font-medium">
              {primaryProvider.name}
            </span>
          )}

          {/* Rating */}
          {game.rating && (
            <span className="absolute top-2 right-2 text-[11px] text-yellow-400 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm font-medium">
              ★ {game.rating.toFixed(1)}
            </span>
          )}

          {/* Hover play button */}
          {hovered && (
            <div className="absolute inset-0 flex items-center justify-center">
              {game.installed ? (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLaunch(game.id); }}
                  className="bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-2.5 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105"
                >
                  Play
                </button>
              ) : (
                <span className="bg-white/20 backdrop-blur-sm text-white font-medium px-5 py-2 rounded-lg">
                  View Details
                </span>
              )}
            </div>
          )}

          {/* Status indicator */}
          {installing && (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-accent animate-spin" />
                <span className="text-[10px] text-white/80">Installing</span>
              </div>
            </div>
          )}
          {running && !installing && (
            <div className="absolute bottom-2 left-2">
              <span className="text-[10px] bg-success/90 text-white px-2 py-0.5 rounded font-medium">● Running</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 flex flex-col gap-1">
          <p className="font-medium text-sm leading-tight truncate" title={game.name}>{game.name}</p>
          {game.genres && game.genres.length > 0 && (
            <p className="text-[11px] text-muted truncate">{game.genres.slice(0, 2).map((g) => g.name).join(" · ")}</p>
          )}
          <div className="flex items-center justify-between mt-1">
            {installing ? (
              <span className="text-[10px] text-muted">Installing...</span>
            ) : running ? (
              <span className="text-[10px] text-success font-medium">● Running</span>
            ) : game.installed ? (
              <span className="text-[10px] text-success">● Installed</span>
            ) : (
              <span className="text-[10px] text-muted">Not installed</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
