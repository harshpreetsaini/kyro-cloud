"use client";

// One home-page row = one JS chunk + one paginated API slice. Rendered only
// when scrolled near the viewport (see LazyRow in page.tsx).
import { useEffect, useState } from "react";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { SkeletonRow } from "@/components/ui";
import type { GameEntry } from "@shared/types";

export default function GameRow({
  label,
  href,
  query,
  hint = "View All",
  limit = 12,
  runningIds,
  onLaunch,
  onStop,
}: {
  label: string;
  href: string;
  query: string; // e.g. "sort=rating" — appended after ?
  hint?: string;
  limit?: number;
  runningIds: string[];
  onLaunch: (id: string) => void;
  onStop?: (id: string) => void;
}) {
  const [games, setGames] = useState<GameEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(api(`/api/games?${query}${query.includes("?") ? "&" : ""}limit=${limit}&meta=0`), {
      headers: { ...authHeader() },
    })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setGames(j.data || []);
      })
      .catch(() => !cancelled && setGames([]));
    return () => {
      cancelled = true;
    };
  }, [query, limit]);

  if (games === null) return <SkeletonRow />;
  if (games.length === 0) return null;

  return (
    <section className="mb-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{label}</h2>
        <Link href={href} className="text-sm text-accent hover:underline">
          {hint}
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            running={runningIds.includes(game.id)}
            onLaunch={onLaunch}
            onStop={onStop}
          />
        ))}
      </div>
    </section>
  );
}
