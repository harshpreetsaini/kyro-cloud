"use client";

import { useState, useEffect, useMemo } from "react";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { SkeletonCard, EmptyState, Button } from "@/components/ui";
import type { GameEntry } from "@shared/types";
import Link from "next/link";

type FilterType = "all" | "ready" | "recent";

export default function LibraryPage() {
  const { launchGame, stopGame, runningGames, installedGames: installedMap } = useRuntime();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => setGames(j.data || []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  const installedGames = useMemo(() => {
    // Merge the live cloud-install state (from the runtime store) with the
    // catalog so freshly installed games show up without a manual refresh.
    const merged = games.map((g) => ({ ...g, installed: !!installedMap?.[g.id] || g.installed }));
    let result = merged.filter((g) => g.installed);
    switch (filter) {
      case "ready": result = result.filter((g) => g.availability === "available" || g.availability === "ready"); break;
      case "recent": result = result.filter((g) => g.lastPlayedAt).sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime()); break;
    }
    return result;
  }, [games, filter, installedMap]);

  const runningCount = games.filter((g) => runningGames.includes(g.id)).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold">My Library</h2>
        <p className="text-sm text-muted mt-0.5">
          {loading ? "Loading..." : `${installedGames.length} games installed${runningCount > 0 ? ` · ${runningCount} running` : ""}`}
        </p>
      </div>

      <div className="flex gap-1 bg-secondary/40 rounded-lg p-0.5 w-fit">
        {(["all", "ready", "recent"] as FilterType[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${filter === f ? "bg-accent text-white" : "text-muted hover:text-text"}`}>
            {f === "all" ? "All Installed" : f === "ready" ? "Ready to Play" : "Recently Played"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : installedGames.length === 0 ? (
        <EmptyState
          icon="▣"
          title="NO GAMES INSTALLED"
          description="Browse the game catalog and install your first game."
          action={<Link href="/games"><Button variant="secondary">Browse Games</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {installedGames.map((game) => (
            <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} showPlayButton />
          ))}
        </div>
      )}
    </div>
  );
}
