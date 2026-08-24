"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Button, SkeletonRow } from "@/components/ui";
import { StarIcon } from "@/components/icons";
import type { GameEntry } from "@shared/types";

// Each row is its own JS chunk AND fetches only its own slice of the catalog
// when it scrolls into view — nothing below the fold loads up front.
const GameRow = dynamic(() => import("./GameRow"), {
  loading: () => <SkeletonRow />,
  ssr: false,
});

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

// Mounts its child only once scrolled near the viewport — the actual chunk
// (and its API call) never loads for users who don't scroll there.
function LazySection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          ob.disconnect();
        }
      },
      // Start loading one viewport-height before the row appears.
      { rootMargin: "100% 0px" }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return <div ref={ref} className="cv-auto">{visible ? children : <SkeletonRow />}</div>;
}

const ROWS: { key: string; label: string; href: string; query: string; hint?: string; limit?: number }[] = [
  { key: "popular", label: "Popular Now", href: "/games", query: "sort=rating", limit: 12 },
  { key: "installed", label: "Your Library", href: "/library", query: "installed=true", limit: 12 },
  { key: "free", label: "Free to Play", href: "/games?free=1", query: "free=true", limit: 12 },
  { key: "linuxFree", label: "Free Steam Games for Linux", href: "/games?free=1&linux=1", query: "free=true&linux=true", hint: "Browse Linux", limit: 12 },
  { key: "steam", label: "Steam Collection", href: "/games", query: "provider=Steam", limit: 8 },
];

export default function HomePage() {
  const { launchGame, stopGame, runningGames } = useRuntime();

  // Above-the-fold only: six featured titles. Everything else streams in.
  const [pool, setPool] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(api("/api/games?sort=rating&limit=24"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setPool(j.data || []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Daily rotation: the six showcased games shift through the top-rated pool
  // each day, so the page doesn't look identical every visit.
  const featured = useMemo(() => {
    if (pool.length <= 6) return pool;
    const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const start = (doy * 6) % pool.length;
    const out: GameEntry[] = [];
    for (let i = 0; i < 6; i++) out.push(pool[(start + i) % pool.length]);
    return out;
  }, [pool]);

  // Auto-sliding hero.
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (featured.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % featured.length), 6000);
    return () => clearInterval(t);
  }, [featured.length]);
  const go = (n: number) => setIdx(((n % Math.max(featured.length, 1)) + featured.length) % Math.max(featured.length, 1));
  const fg = featured[idx];

  const genreName = (g: any, i: number) => (g?.name || g || "");

  return (
    <div className="flex flex-col gap-8">
      {/* Auto-sliding Hero */}
      {loading ? (
        <div className="relative h-[380px] rounded-2xl overflow-hidden bg-secondary/40 animate-pulse" />
      ) : fg ? (
        <section className="relative h-[380px] rounded-2xl overflow-hidden group">
          <div key={fg.id} className="absolute inset-0 animate-fadeIn">
            {fg.heroImage ? (
              <img src={fg.heroImage} alt="" fetchPriority={idx === 0 ? "high" : "auto"} decoding={idx === 0 ? "sync" : "async"} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : fg.coverImage ? (
              <img src={fg.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-secondary" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent [mask-image:linear-gradient(to_top,black_0%,black_45%,transparent_75%)]" />
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
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-warning/15 text-warning font-medium flex items-center gap-1 w-fit">
                      <StarIcon className="w-2.5 h-2.5 fill-warning" /> {Number(fg.rating).toFixed(1)}
                    </span>
                  )}
                  {fg.isFree && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-success/15 text-success font-medium">FREE</span>
                  )}
                  {fg.linuxCompatible && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-medium">LINUX</span>
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
      ) : (
        <div className="relative h-[380px] rounded-2xl clay flex items-center justify-center p-8 text-center">
          <div>
            <h1 className="font-display text-2xl font-bold mb-2">Welcome to KYRO CLOUD</h1>
            <p className="text-sm text-muted mb-4">Connect a provider and install your first game to fill this shelf.</p>
            <Link href="/providers"><Button>Connect Providers</Button></Link>
          </div>
        </div>
      )}

      {/* Below the fold: each row is an independent lazy chunk */}
      {ROWS.map((row) => (
        <Reveal key={row.key}>
          <LazySection>
            <GameRow
              label={row.label}
              href={row.href}
              query={row.query}
              hint={row.hint}
              limit={row.limit}
              runningIds={runningGames}
              onLaunch={launchGame}
              onStop={stopGame}
            />
          </LazySection>
        </Reveal>
      ))}

      {/* Provider CTAs — cheap static rows, no catalog data needed */}
      <Reveal>
        <section className="mb-2">
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { id: "epic", label: "Epic Games", desc: "Connect your Epic account to sync its library.", cta: "Connect Epic" },
              { id: "gog", label: "GOG", desc: "DRM-free games you own — link your account.", cta: "Connect GOG" },
            ].map((p) => (
              <div key={p.id} className="panel p-5 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-xs text-muted mt-0.5">{p.desc}</p>
                </div>
                <Link href="/providers"><Button size="sm" variant="secondary">{p.cta}</Button></Link>
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
