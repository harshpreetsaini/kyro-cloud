"use client";

import { useState, useEffect } from "react";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { SkeletonCard, EmptyState, Button } from "@/components/ui";
import type { GameEntry } from "@shared/types";
import Link from "next/link";
import { loadFavorites } from "@/lib/favorites";

export default function FavoritesPage() {
  const { launchGame, stopGame, runningGames } = useRuntime();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => setGames(j.data || []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadFavorites().then(setFavIds).catch(() => {});
  }, []);

  const favoriteGames = games.filter((g) => favIds.includes(g.id));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold">Favorites</h2>
        <p className="text-sm text-muted mt-0.5">
          {loading ? "Loading..." : `${favoriteGames.length} games saved`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : favoriteGames.length === 0 ? (
        <EmptyState
          icon="♥"
          title="NO FAVORITES YET"
          description="Save games you want to play later."
          action={<Link href="/games"><Button variant="secondary">Browse Games</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {favoriteGames.map((game) => (
            <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} />
          ))}
        </div>
      )}
    </div>
  );
}
