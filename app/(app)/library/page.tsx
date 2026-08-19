"use client";

import { useState, useEffect, useMemo } from "react";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Skeleton, EmptyState, Button } from "@/components/ui";
import type { GameEntry } from "@shared/types";
import Link from "next/link";

type FilterType = "all" | "ready" | "recent";

export default function LibraryPage() {
  const { launchGame, stopGame, runningGames } = useRuntime();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => setGames(j.data || []))
      .finally(() => setLoading(false));
  }, []);

  const installedGames = useMemo(() => {
    let result = games.filter((g) => g.installed);

    switch (filter) {
      case "ready":
        result = result.filter((g) => g.availability === "available" || g.availability === "ready");
        break;
      case "recent":
        result = result.filter((g) => g.lastPlayedAt).sort((a, b) => 
          new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime()
        );
        break;
    }

    return result;
  }, [games, filter]);

  const runningCount = games.filter((g) => runningGames.includes(g.id)).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">Library</h2>
          <p className="text-sm text-muted">
            {loading ? "Loading..." : `${installedGames.length} games installed${runningCount > 0 ? ` · ${runningCount} running` : ""}`}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "ready", "recent"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              filter === f
                ? "bg-accent text-white"
                : "bg-secondary text-muted hover:text-text"
            }`}
          >
            {f === "all" ? "All Installed" : f === "ready" ? "Ready to Play" : "Recently Played"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel overflow-hidden flex flex-col">
              <Skeleton className="h-40 rounded-none" />
              <div className="p-3 flex flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : installedGames.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon="▶"
            title="NO GAMES INSTALLED"
            description="Browse the game catalog to find games to install."
            action={
              <Link href="/games">
                <Button variant="secondary">Browse Games</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {installedGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              running={runningGames.includes(game.id)}
              onLaunch={launchGame}
              onStop={stopGame}
              showPlayButton
            />
          ))}
        </div>
      )}
    </div>
  );
}
