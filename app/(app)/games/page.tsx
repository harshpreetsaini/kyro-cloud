"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Button, Skeleton, EmptyState } from "@/components/ui";
import type { GameEntry } from "@shared/types";

type FilterType = "all" | "installed" | "running";

export default function GamesPage() {
  const { launchGame, stopGame, runningGames } = useRuntime();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => setGames(j.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filteredGames = useMemo(() => {
    let result = games;

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.id.toLowerCase().includes(q)
      );
    }

    // Apply type filter
    switch (filter) {
      case "installed":
        result = result.filter((g) => g.installed);
        break;
      case "running":
        result = result.filter((g) => runningGames.includes(g.id));
        break;
    }

    return result;
  }, [games, search, filter, runningGames]);

  const installed = games.filter((g) => g.installed).length;
  const running = games.filter((g) => runningGames.includes(g.id)).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Game Library</h2>
        <span className="text-xs text-muted">
          {loading ? "Loading…" : `${installed} installed${running > 0 ? ` · ${running} running` : ""}`}
        </span>
      </div>

      {/* Search and filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary rounded-lg px-3 py-2 pl-8 text-sm outline-none focus:ring-1 focus:ring-accent"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex gap-1">
          {(["all", "installed", "running"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                filter === f
                  ? "bg-accent text-white"
                  : "bg-secondary text-muted hover:text-text"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted max-w-2xl">
        Compatibility reflects the Linux compatibility layer (Steam + Proton/Wine). Windows-only titles without a
        supported path are marked accordingly — no Windows support is faked.
      </p>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel overflow-hidden flex flex-col">
              <Skeleton className="h-32 rounded-none" />
              <div className="p-3 flex flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-between pt-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon="▶"
            title={search || filter !== "all" ? "NO GAMES MATCH" : "NO GAMES INSTALLED"}
            description={
              search || filter !== "all"
                ? "Try adjusting your search or filter."
                : "Install a supported game to see it in your library."
            }
            action={
              search || filter !== "all" ? (
                <Button variant="secondary" onClick={() => { setSearch(""); setFilter("all"); }}>
                  Clear Filters
                </Button>
              ) : (
                <Link href="/applications">
                  <Button variant="secondary">Open Applications</Button>
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredGames.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              running={runningGames.includes(g.id)}
              onLaunch={launchGame}
              onStop={stopGame}
            />
          ))}
        </div>
      )}
    </div>
  );
}
