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
  const installing = (game as any).installState === "installing" || (game as any).installState === "updating";
  const primaryProvider = game.providers?.[0];

  // Estimate download size based on game type
  const getSize = () => {
    if ((game as any).downloadSize) return (game as any).downloadSize;
    const id = game.id || "";
    // Large AAA games
    if (["elden-ring", "cyberpunk-2077", "red-dead-redemption-2", "grand-theft-auto-v", "baldurs-gate-3",
      "starfield", "hogwarts-legacy", "diablo-iv", "cod-mw3", "star-wars-jedi-survivor",
      "forza-horizon-5", "assassins-creed-valhalla", "hitman-3", "assassins-creed-mirage",
      "star-wars-outlaws", "ghost-of-tsushima-directors-cut", "the-last-of-us-part-i",
      "horizon-forbidden-west", "marvels-spider-man-remastered", "marvels-spider-man-2",
      "dead-space", "resident-evil-4", "tekken-8", "street-fighter-6", "monster-hunter-world",
      "no-mans-sky", "kingdom-come-deliverance-ii"].some(g => id.includes(g))) {
      return "80–150 GB";
    }
    // Medium games
    if (["hades", "hollow-knight", "valheim", "subnautica", "terraria", "stardew-valley",
      "celeste", "dead-cells", "cuphead", "ori-and-the-will-of-the-wisps", "dredge",
      "tunic", "animal-well", "balatro", "nms", "raft", "palworld"].some(g => id.includes(g))) {
      return "5–20 GB";
    }
    // Small/indie
    return "1–10 GB";
  };

  const size = getSize();

  return (
    <Link href={`/games/${game.slug}`}>
      <div
        className="group relative flex flex-col overflow-hidden rounded-lg bg-surface border border-white/5 hover:border-accent/30 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Cover Image — 3:4 aspect ratio like Steam */}
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
              <span className="text-4xl font-bold text-muted/30">{game.name?.charAt(0)}</span>
            </div>
          )}

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          {/* Provider badge — top left */}
          {primaryProvider && (
            <span className="absolute top-1.5 left-1.5 text-[8px] uppercase tracking-wider text-white/90 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm font-medium">
              {primaryProvider.name}
            </span>
          )}

          {/* Rating badge — top right */}
          {typeof game.rating === "number" && !isNaN(game.rating) && (
            <span className="absolute top-1.5 right-1.5 text-[10px] text-yellow-400 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm font-medium flex items-center gap-0.5">
              ★ {game.rating.toFixed(1)}
            </span>
          )}

          {/* Hover play button */}
          {hovered && (
            <div className="absolute inset-0 flex items-center justify-center">
              {game.installed ? (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLaunch(game.id); }}
                  className="bg-accent hover:bg-accent/90 text-white font-semibold px-5 py-2 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 text-sm"
                >
                  Play
                </button>
              ) : (
                <span className="bg-white/20 backdrop-blur-sm text-white font-medium px-4 py-1.5 rounded-lg text-sm">
                  View
                </span>
              )}
            </div>
          )}

          {/* Status indicator — bottom */}
          {installing && (
            <div className="absolute bottom-1.5 left-1.5 right-1.5">
              <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-0.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-white/30 border-t-accent animate-spin" />
                <span className="text-[9px] text-white/80">Installing</span>
              </div>
            </div>
          )}
          {running && !installing && (
            <div className="absolute bottom-1.5 left-1.5">
              <span className="text-[9px] bg-success/90 text-white px-1.5 py-0.5 rounded font-medium">● Running</span>
            </div>
          )}
        </div>

        {/* Info — below artwork */}
        <div className="p-2 flex flex-col gap-0.5">
          {/* Title */}
          <p className="font-medium text-xs leading-tight truncate" title={game.name}>{game.name}</p>

          {/* Genres */}
          {Array.isArray(game.genres) && game.genres.length > 0 && (
            <p className="text-[10px] text-muted truncate">{game.genres.slice(0, 2).map((g: any) => g.name || g).join(" · ")}</p>
          )}

          {/* Meta row: platform + size + metacritic */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {game.metacritic && (
              <span className={`text-[9px] px-1 py-0 rounded font-bold ${
                game.metacritic >= 75 ? "bg-green-500/20 text-green-400" :
                game.metacritic >= 50 ? "bg-yellow-500/20 text-yellow-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {game.metacritic}
              </span>
            )}
            <span className="text-[9px] text-muted/60">{size}</span>
            {game.controllerSupport === "full" && (
              <span className="text-[9px] text-muted/60" title="Full controller support">🎮</span>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between mt-0.5">
            {installing ? (
              <span className="text-[9px] text-muted">Installing...</span>
            ) : running ? (
              <span className="text-[9px] text-success font-medium">● Running</span>
            ) : game.installed ? (
              <span className="text-[9px] text-success">● Installed</span>
            ) : (
              <span className="text-[9px] text-muted">Free / Buy</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
