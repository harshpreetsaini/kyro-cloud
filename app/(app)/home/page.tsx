"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Button, Skeleton, SkeletonRow } from "@/components/ui";
import type { GameEntry } from "@shared/types";

export default function HomePage() {
  const { launchGame, stopGame, runningGames } = useRuntime();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => setGames(j.data || []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  const recentlyPlayed = games.filter((g) => g.lastPlayedAt).sort((a, b) =>
    new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime()
  ).slice(0, 6);

  const popular = [...games].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 12);
  const installed = games.filter((g) => g.installed).slice(0, 6);
  const heroGame = popular[0];

  // Free-to-play games (no steam app required or marked as free)
  const freeGames = games.filter((g) =>
    g.tags?.some((t) => t.toLowerCase().includes("free")) ||
    g.tags?.some((t) => t.toLowerCase().includes("free to play")) ||
    g.description?.toLowerCase().includes("free-to-play") ||
    g.shortDescription?.toLowerCase().includes("free-to-play")
  ).slice(0, 12);

  // Games by platform
  const steamGames = games.filter((g) => g.providers?.some((p) => p.name === "Steam")).slice(0, 8);
  const epicGames = games.filter((g) => g.providers?.some((p) => p.name === "Epic Games")).slice(0, 8);
  const gogGames = games.filter((g) => g.providers?.some((p) => p.name === "GOG")).slice(0, 8);
  const xboxGames = games.filter((g) => g.providers?.some((p) => p.name?.includes("Xbox"))).slice(0, 8);
  const psGames = games.filter((g) => g.providers?.some((p) => p.name?.includes("PlayStation"))).slice(0, 8);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        {/* Hero skeleton */}
        <div className="relative h-[380px] rounded-2xl overflow-hidden bg-secondary/40 animate-pulse">
          <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col gap-3">
            <div className="h-4 w-48 rounded bg-secondary/60 animate-pulse" />
            <div className="h-10 w-80 rounded bg-secondary/60 animate-pulse" />
            <div className="h-4 w-96 rounded bg-secondary/60 animate-pulse" />
          </div>
        </div>
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      {heroGame && (
        <section className="relative h-[380px] rounded-2xl overflow-hidden group">
          {heroGame.heroImage ? (
            <img src={heroGame.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : heroGame.coverImage ? (
            <img src={heroGame.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-40" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-secondary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                {heroGame.genres?.slice(0, 3).map((g) => (
                  <span key={g.id} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 font-medium">{g.name}</span>
                ))}
                {heroGame.rating && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">★ {Number(heroGame.rating).toFixed(1)}</span>
                )}
              </div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{heroGame.name}</h1>
              <p className="text-white/60 mb-5 line-clamp-2 max-w-lg">{heroGame.shortDescription || heroGame.description}</p>
              <div className="flex items-center gap-3">
                <Link href={`/games/${heroGame.slug}`}>
                  <Button size="lg">View Details</Button>
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
            <h2 className="text-lg font-semibold">Continue Playing</h2>
            <Link href="/library" className="text-sm text-accent hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {recentlyPlayed.map((game) => (
              <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} />
            ))}
          </div>
        </section>
      )}

      {/* Popular */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Popular Now</h2>
          <Link href="/games" className="text-sm text-accent hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {popular.slice(0, 12).map((game) => (
            <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} />
          ))}
        </div>
      </section>

      {/* Installed */}
      {installed.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Library</h2>
            <Link href="/library" className="text-sm text-accent hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {installed.map((game) => (
              <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} />
            ))}
          </div>
        </section>
      )}

      {/* Browse */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Browse Games</h2>
          <Link href="/games" className="text-sm text-accent hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {games.slice(0, 12).map((game) => (
            <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} />
          ))}
        </div>
      </section>

      {/* Free to Play */}
      {freeGames.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Free to Play</h2>
            <span className="text-xs text-muted bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">No purchase needed</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {freeGames.map((game) => (
              <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} />
            ))}
          </div>
        </section>
      )}

      {/* By Platform */}
      {steamGames.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Steam Collection</h2>
            <Link href="/games" className="text-sm text-accent hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {steamGames.map((game) => (
              <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} />
            ))}
          </div>
        </section>
      )}

      {epicGames.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Epic Games</h2>
            <Link href="/providers" className="text-sm text-accent hover:underline">Connect Epic</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {epicGames.map((game) => (
              <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} />
            ))}
          </div>
        </section>
      )}

      {psGames.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">PlayStation PC</h2>
            <Link href="/games" className="text-sm text-accent hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {psGames.map((game) => (
              <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} />
            ))}
          </div>
        </section>
      )}

      {xboxGames.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Xbox / Game Pass</h2>
            <Link href="/providers" className="text-sm text-accent hover:underline">Connect Xbox</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {xboxGames.map((game) => (
              <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} />
            ))}
          </div>
        </section>
      )}

      {/* Connect Providers CTA */}
      <section className="panel p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">Connect Your Gaming Accounts</h3>
          <p className="text-sm text-muted mt-1">Link Steam, Epic, GOG, Xbox and more to access your full game library</p>
        </div>
        <Link href="/providers">
          <Button>Connect Providers</Button>
        </Link>
      </section>
    </div>
  );
}
