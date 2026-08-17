"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Button, Skeleton, EmptyState } from "@/components/ui";
import type { GameEntry } from "@shared/types";

export default function GamesPage() {
  const { launchGame, stopGame, runningGames } = useRuntime();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => setGames(j.data || []))
      .finally(() => setLoading(false));
  }, []);

  const installed = games.filter((g) => g.installed).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Game Library</h2>
        <span className="text-xs text-muted">{loading ? "Loading…" : `${installed} installed`}</span>
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
      ) : games.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon="▶"
            title="NO GAMES INSTALLED"
            description="Install a supported game to see it in your library."
            action={
              <Link href="/applications">
                <Button variant="secondary">Open Applications</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {games.map((g) => (
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
