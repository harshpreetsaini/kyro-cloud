"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Button, Skeleton } from "@/components/ui";
import type { GameEntry } from "@shared/types";

// Gradient colors for game art placeholders
const GRADIENTS = [
  "from-purple-900/80 to-blue-900/80",
  "from-blue-900/80 to-cyan-900/80",
  "from-green-900/80 to-teal-900/80",
  "from-orange-900/80 to-red-900/80",
  "from-pink-900/80 to-purple-900/80",
  "from-indigo-900/80 to-violet-900/80",
];

function getGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export default function HomePage() {
  const { launchGame, stopGame, runningGames } = useRuntime();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => setGames(j.data || []))
      .finally(() => setLoading(false));
  }, []);

  const recentlyPlayed = games.filter((g) => g.lastPlayedAt).sort((a, b) => 
    new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime()
  ).slice(0, 6);

  const popular = [...games].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);
  
  const installed = games.filter((g) => g.installed).slice(0, 6);

  // Hero game - use the highest rated game
  const heroGame = popular[0];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[400px] rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero Section */}
      {heroGame && (
        <section className="relative h-[400px] rounded-xl overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(heroGame.id)}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                {heroGame.genres?.slice(0, 3).map((g) => (
                  <span key={g.id} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                    {g.name}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">{heroGame.name}</h1>
              <p className="text-white/70 mb-4 line-clamp-2">{heroGame.shortDescription || heroGame.description}</p>
              <div className="flex items-center gap-3">
                <Link href={`/games/${heroGame.slug}`}>
                  <Button size="lg" className="bg-accent hover:bg-accent/90">
                    View Details
                  </Button>
                </Link>
                {heroGame.installed && (
                  <Button 
                    size="lg" 
                    variant="secondary"
                    onClick={() => launchGame(heroGame.id)}
                    disabled={runningGames.includes(heroGame.id)}
                  >
                    {runningGames.includes(heroGame.id) ? "Running" : "Play Now"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Continue Playing */}
      {recentlyPlayed.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Continue Playing</h2>
            <Link href="/library" className="text-sm text-accent hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {recentlyPlayed.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                running={runningGames.includes(game.id)}
                onLaunch={launchGame}
                onStop={stopGame}
              />
            ))}
          </div>
        </section>
      )}

      {/* Popular Games */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Popular Now</h2>
          <Link href="/games" className="text-sm text-accent hover:underline">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {popular.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              running={runningGames.includes(game.id)}
              onLaunch={launchGame}
              onStop={stopGame}
            />
          ))}
        </div>
      </section>

      {/* Installed Games */}
      {installed.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Library</h2>
            <Link href="/library" className="text-sm text-accent hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {installed.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                running={runningGames.includes(game.id)}
                onLaunch={launchGame}
                onStop={stopGame}
              />
            ))}
          </div>
        </section>
      )}

      {/* Browse All */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Browse Games</h2>
          <Link href="/games" className="text-sm text-accent hover:underline">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {games.slice(0, 6).map((game) => (
            <GameCard
              key={game.id}
              game={game}
              running={runningGames.includes(game.id)}
              onLaunch={launchGame}
              onStop={stopGame}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
