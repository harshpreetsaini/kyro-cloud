"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Button, Skeleton, SkeletonCard, EmptyState } from "@/components/ui";
import { GamesIcon } from "@/components/icons";
import type { GameEntry } from "@shared/types";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type FilterType = "all" | "installed" | "running" | "linuxF2p";
type SortType = "rating" | "name" | "release" | "metacritic";

function GamesPage() {
  const { launchGame, stopGame, runningGames, isInstalled } = useRuntime();
  const params = useSearchParams();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>(
    params.get("free") === "1" && params.get("linux") === "1" ? "linuxF2p" : "all"
  );
  const [sort, setSort] = useState<SortType>("rating");
  const [genre, setGenre] = useState<string>("");
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => {
        setGames(j.data || []);
        if (j.meta?.genres) setGenres(j.meta.genres);
      })
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredGames = useMemo(() => {
    let result = games;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((g) =>
        g.name.toLowerCase().includes(q) || g.developer?.toLowerCase().includes(q) || g.tags?.some((t: string) => t.toLowerCase().includes(q))
      );
    }
    if (genre) result = result.filter((g) => g.genres?.some((gr) => gr.name.toLowerCase() === genre.toLowerCase()));
    switch (filter) {
      case "installed": result = result.filter((g) => isInstalled(g.id)); break;
      case "running": result = result.filter((g) => runningGames.includes(g.id)); break;
      case "linuxF2p": result = result.filter((g) => g.isFree && g.linuxCompatible); break;
    }
    switch (sort) {
      case "rating": result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case "name": result = [...result].sort((a, b) => a.name.localeCompare(b.name)); break;
      case "release": result = [...result].sort((a, b) => new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime()); break;
      case "metacritic": result = [...result].sort((a, b) => (b.metacritic || 0) - (a.metacritic || 0)); break;
    }
    return result;
  }, [games, search, filter, sort, genre, runningGames]);

  const installed = games.filter((g) => isInstalled(g.id)).length;
  const running = games.filter((g) => runningGames.includes(g.id)).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">All Games</h2>
          <p className="text-sm text-muted mt-0.5">
            {loading ? "Loading..." : `${filteredGames.length} games${installed > 0 ? ` · ${installed} installed` : ""}`}
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search games, developers, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/60 border border-white/5 rounded-lg px-3 py-2 pl-9 text-sm outline-none focus:ring-1 focus:ring-accent focus:border-accent/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter tabs */}
          <div className="flex gap-1 bg-secondary/40 rounded-lg p-0.5">
            {(["all", "installed", "running", "linuxF2p"] as FilterType[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                  filter === f ? "bg-accent text-white" : "text-muted hover:text-text"
                }`}>
                {f === "linuxF2p" ? "Linux F2P" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select value={sort} onChange={(e) => setSort(e.target.value as SortType)}
            className="bg-secondary/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-muted outline-none focus:ring-1 focus:ring-accent">
            <option value="rating">Top Rated</option>
            <option value="name">A–Z</option>
            <option value="release">Newest</option>
            <option value="metacritic">Metacritic</option>
          </select>

          {/* Genre */}
          <select value={genre} onChange={(e) => setGenre(e.target.value)}
            className="bg-secondary/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-muted outline-none focus:ring-1 focus:ring-accent">
            <option value="">All Genres</option>
            {genres.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredGames.length === 0 ? (
        <EmptyState
          icon={<GamesIcon className="w-7 h-7" />}
          title={search || filter !== "all" || genre ? "NO GAMES MATCH" : "NO GAMES FOUND"}
          description={search || filter !== "all" || genre ? "Try adjusting your search or filters." : "Check back later for new games."}
          action={(search || filter !== "all" || genre) ? (
            <Button variant="secondary" onClick={() => { setSearch(""); setFilter("all"); setGenre(""); }}>Clear Filters</Button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 stagger-children">
          {filteredGames.map((g) => (
            <GameCard key={g.id} game={g} running={runningGames.includes(g.id)} onLaunch={launchGame} onStop={stopGame} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GamesPageWrapper() {
  return (
    <Suspense fallback={<div className="flex flex-col gap-5"><div className="h-8 w-40 bg-secondary/40 rounded animate-pulse" /><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">{Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}</div></div>}>
      <GamesPage />
    </Suspense>
  );
}
