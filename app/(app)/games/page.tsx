"use client";

import { useState, useEffect } from "react";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import type { GameEntry } from "@shared/types";

export default function GamesPage() {
  const { launchGame } = useRuntime();
  const [games, setGames] = useState<GameEntry[]>([]);

  useEffect(() => {
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => setGames(j.data || []));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xl">Game Library</h2>
      <p className="text-sm text-muted max-w-2xl">
        Compatibility reflects the Linux compatibility layer (Steam + Proton/Wine). Windows-only titles without a
        supported path are marked accordingly — no Windows support is faked.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {games.map((g) => (
          <GameCard key={g.id} game={g} onLaunch={launchGame} />
        ))}
      </div>
    </div>
  );
}
