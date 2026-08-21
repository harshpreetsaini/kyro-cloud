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
  const { launchGame, stopGame, runningGames, installedGames: installedMap, providerGames, installApp, installGame, installProgress } = useRuntime();
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

  // Merge synced provider libraries (Steam/Epic/GOG) with the catalog so every
  // game the user owns appears as available — installable even if it isn't in
  // the curated catalog.
  const availableGames = useMemo(() => {
    const catalogIds = new Set(games.map((g) => g.id));
    const seen = new Set<string>();
    const list: GameEntry[] = [];

    for (const [provider, glist] of Object.entries(providerGames)) {
      for (const g of glist) {
        const match = games.find(
          (c) => c.providers?.[0]?.type === provider && String(c.providers?.[0]?.appId) === g.appId
        );
        if (match && !seen.has(match.id)) {
          seen.add(match.id);
          list.push(match);
        } else if (!match) {
          const id = `${provider}-${g.appId}`;
          if (!seen.has(id)) {
            seen.add(id);
            list.push({
              id,
              name: g.name,
              providers: [{ type: provider, appId: g.appId, name: g.name }],
              availability: "available",
            } as unknown as GameEntry);
          }
        }
      }
    }
    // Include catalog games that are installed but weren't covered above.
    for (const g of games) {
      if (installedMap[g.id] && !seen.has(g.id)) {
        seen.add(g.id);
        list.push(g);
      }
    }

    // Attach live install state so progress/cancel shows on the card.
    const withState = list.map((g) => {
      const ip = installProgress[g.id];
      return ip ? ({ ...g, installState: ip.state, percent: ip.percent } as GameEntry) : g;
    });

    switch (filter) {
      case "ready":
        return withState.filter((g) => installedMap[g.id] || g.availability === "available" || g.availability === "ready");
      case "recent":
        return withState
          .filter((g) => (g as any).lastPlayedAt)
          .sort((a, b) => new Date((b as any).lastPlayedAt || 0).getTime() - new Date((a as any).lastPlayedAt || 0).getTime());
      default:
        return withState;
    }
  }, [games, providerGames, installedMap, installProgress, filter]);

  const runningCount = availableGames.filter((g) => runningGames.includes(g.id)).length;
  const hasProviderLink = Object.keys(providerGames).length > 0;

  const handleInstall = (id: string) => {
    const g = availableGames.find((x) => x.id === id);
    const prov = g?.providers?.[0];
    if (!g || !prov) return;
    // Catalog game → use its real id; synced-only game → install by appId.
    if (games.some((c) => c.id === g.id)) installGame(g.id);
    else installApp(prov.type, String(prov.appId), g.name);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold">My Library</h2>
        <p className="text-sm text-muted mt-0.5">
          {loading
            ? "Loading..."
            : `${availableGames.length} game${availableGames.length === 1 ? "" : "s"} available${runningCount > 0 ? ` · ${runningCount} running` : ""}`}
        </p>
      </div>

      <div className="flex gap-1 bg-secondary/40 rounded-lg p-0.5 w-fit">
        {(["all", "ready", "recent"] as FilterType[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${filter === f ? "bg-accent text-white" : "text-muted hover:text-text"}`}>
              {f === "all" ? "All Games" : f === "ready" ? "Ready to Play" : "Recently Played"}
            </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : availableGames.length === 0 ? (
        <EmptyState
          icon="▣"
          title="NO GAMES YET"
          description={hasProviderLink ? "Sync a provider library from the Providers page to see your games here." : "Link a Steam, Epic, or GOG account to load your games."}
          action={<Link href="/providers"><Button variant="secondary">Connect Providers</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {availableGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              running={runningGames.includes(game.id)}
              onLaunch={launchGame}
              onStop={stopGame}
              onInstall={handleInstall}
              showPlayButton
            />
          ))}
        </div>
      )}
    </div>
  );
}
