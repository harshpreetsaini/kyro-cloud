"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Button, Skeleton, SkeletonRow } from "@/components/ui";
import type { GameEntry } from "@shared/types";

// Scroll-reveal wrapper: fades + slides content up as it enters the viewport.
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          ob.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

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

  const recentlyPlayed = games
    .filter((g) => g.lastPlayedAt)
    .sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime())
    .slice(0, 6);

  const popular = [...games].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 12);
  const installed = games.filter((g) => g.installed).slice(0, 6);
  const heroGame = popular[0];

  // Auto-sliding hero of the top featured titles.
  const featured = popular.slice(0, 6);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (featured.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % featured.length), 6000);
    return () => clearInterval(t);
  }, [featured.length]);
  const go = (n: number) => setIdx(((n % featured.length) + featured.length) % featured.length);
  const fg = featured[idx];

  // Free-to-play + Linux-compatible free Steam games.
  const freeGames = games
    .filter(
      (g) =>
        g.isFree ||
        g.tags?.some((t) => /free to play/i.test(t)) ||
        g.description?.toLowerCase().includes("free-to-play")
    )
    .slice(0, 12);
  const linuxFree = games.filter((g) => g.linuxCompatible && g.isFree).slice(0, 12);

  const steamGames = games.filter((g) => g.providers?.some((p) => p.name === "Steam")).slice(0, 8);
  const epicGames = games.filter((g) => g.providers?.some((p) => p.name === "Epic Games")).slice(0, 8);
  const gogGames = games.filter((g) => g.providers?.some((p) => p.name === "GOG")).slice(0, 8);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div className="relative h-[380px] rounded-2xl overflow-hidden bg-secondary/40 animate-pulse" />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  const genreName = (g: any, i: number) => (g?.name || g || "");

  const renderGameRow = (list: GameEntry[], label: string, href: string, hint = "View All") => (
    <Reveal>
      <section className="mb-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{label}</h2>
          <Link href={href} className="text-sm text-accent hover:underline">
            {hint}
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {list.map((game) => (
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
    </Reveal>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Auto-sliding Hero */}
      {fg && (
        <section className="relative h-[380px] rounded-2xl overflow-hidden group">
          <div key={fg.id} className="absolute inset-0 animate-fadeIn">
            {fg.heroImage ? (
              <img src={fg.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : fg.coverImage ? (
              <img src={fg.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-40" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-secondary" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                  {Array.isArray(fg.genres) &&
                    fg.genres.slice(0, 3).map((g: any, i: number) => (
                      <span key={g?.id ?? i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 font-medium">
                        {genreName(g, i)}
                      </span>
                    ))}
                  {fg.rating && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">
                      ★ {Number(fg.rating).toFixed(1)}
                    </span>
                  )}
                  {fg.isFree && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">FREE</span>
                  )}
                  {fg.linuxCompatible && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">LINUX</span>
                  )}
                </div>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{fg.name}</h1>
                <p className="text-white/60 mb-5 line-clamp-2 max-w-lg">{fg.shortDescription || fg.description}</p>
                <div className="flex items-center gap-3">
                  <Link href={`/games/${fg.slug}`}>
                    <Button size="lg">View Details</Button>
                  </Link>
                  {fg.installed && (
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={() => launchGame(fg.id)}
                      disabled={runningGames.includes(fg.id)}
                    >
                      {runningGames.includes(fg.id) ? "Running" : "Play Now"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <button
            onClick={() => go(idx - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={() => go(idx + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {featured.map((f, i) => (
              <button
                key={f.id}
                onClick={() => go(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white w-5" : "bg-white/40 hover:bg-white/70"}`}
                aria-label={`Show ${f.name}`}
              />
            ))}
          </div>
        </section>
      )}

      <Reveal>
        {recentlyPlayed.length > 0 && (
          <section className="mb-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Continue Playing</h2>
              <Link href="/library" className="text-sm text-accent hover:underline">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {recentlyPlayed.map((game) => (
                <GameCard key={game.id} game={game} running={runningGames.includes(game.id)} onLaunch={launchGame} onStop={stopGame} />
              ))}
            </div>
          </section>
        )}
      </Reveal>

      {renderGameRow(popular.slice(0, 12), "Popular Now", "/games")}

      {installed.length > 0 && renderGameRow(installed, "Your Library", "/library")}

      {renderGameRow(freeGames, "Free to Play", "/games")}

      {linuxFree.length > 0 &&
        renderGameRow(linuxFree, "Free Steam Games for Linux", "/games?free=1&linux=1", "Browse Linux")}

      {renderGameRow(steamGames, "Steam Collection", "/games")}

      {epicGames.length > 0 && renderGameRow(epicGames, "Epic Games", "/providers", "Connect Epic")}

      {gogGames.length > 0 && renderGameRow(gogGames, "GOG", "/providers", "Connect GOG")}
    </div>
  );
}
