"use client";

import { useState, useEffect } from "react";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Skeleton, EmptyState, Button } from "@/components/ui";
import type { GameEntry } from "@shared/types";
import Link from "next/link";

export default function FavoritesPage() {
  const { launchGame, stopGame, runningGames } = useRuntime();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => setGames(j.data || []))
      .finally(() => setLoading(false));
  }, []);

  const favoriteGames = games.filter((g) => g.favorite);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">Favorites</h2>
          <p className="text-sm text-muted">
            {loading ? "Loading..." : `${favoriteGames.length} games in favorites`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel overflow-hidden flex flex-col">
              <Skeleton className="h-40 rounded-none" />
              <div className="p-3 flex flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : favoriteGames.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon="♡"
            title="NO FAVORITES YET"
            description="Add games to your favorites for quick access."
            action={
              <Link href="/games">
                <Button variant="secondary">Browse Games</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {favoriteGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              running={runningGames.includes(game.id)}
              onLaunch={launchGame}
              onStop={stopGame}
            />
          ))}
        </div>
      )}
    </div>
  );
}
