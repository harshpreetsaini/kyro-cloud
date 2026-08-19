"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Button, Skeleton, Badge } from "@/components/ui";
import { runtimeAction } from "@/lib/runtime/store";
import type { GameEntry } from "@shared/types";

type LaunchState = "idle" | "checking" | "starting_runtime" | "preparing_gpu" | "starting_stream" | "launching_game" | "connecting" | "ready" | "error";

export default function GameDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { launchGame, stopGame, runningGames, session, connected } = useRuntime();
  const [game, setGame] = useState<GameEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launchState, setLaunchState] = useState<LaunchState>("idle");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const slug = params.slug as string;
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => {
        const found = (j.data || []).find((g: GameEntry) => g.slug === slug || g.id === slug);
        found ? setGame(found) : setError("Game not found");
      })
      .catch(() => setError("Failed to load game"))
      .finally(() => setLoading(false));
  }, [params.slug]);

  const handlePlay = useCallback(async () => {
    if (!game) return;
    setLaunchState("checking");
    setLaunchError(null);
    try {
      const isOffline = !session || session.state === "OFFLINE" || session.state === "STOPPED" || session.state === "DISCONNECTED";
      if (isOffline) {
        setLaunchState("starting_runtime");
        await runtimeAction("start");
        await waitForState("STREAMING", 120000);
      }
      setLaunchState("launching_game");
      launchGame(game.id);
      setLaunchState("connecting");
      await waitForGameRunning(game.id, 30000);
      setLaunchState("ready");
      setTimeout(() => router.push("/session"), 1500);
    } catch (err) {
      setLaunchState("error");
      setLaunchError(String(err));
    }
  }, [game, session, launchGame, router]);

  const waitForState = (targetState: string, timeoutMs: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const iv = setInterval(() => {
        if (Date.now() - start > timeoutMs) { clearInterval(iv); reject(new Error("Timeout waiting for runtime")); return; }
        if (session?.state === targetState) { clearInterval(iv); resolve(); }
        if (session?.state === "ERROR") { clearInterval(iv); reject(new Error("Runtime failed to start")); }
      }, 1000);
    });
  };

  const waitForGameRunning = (gameId: string, timeoutMs: number): Promise<void> => {
    return new Promise((resolve) => {
      const start = Date.now();
      const iv = setInterval(() => {
        if (Date.now() - start > timeoutMs || runningGames.includes(gameId)) { clearInterval(iv); resolve(); }
      }, 500);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="relative h-[350px] rounded-2xl overflow-hidden bg-secondary/40 animate-pulse" />
        <div className="flex flex-col gap-4 max-w-3xl">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted text-lg">{error || "Game not found"}</p>
        <Link href="/games"><Button variant="secondary">Back to Games</Button></Link>
      </div>
    );
  }

  const primaryProvider = game.providers?.[0];
  const isRunning = runningGames.includes(game.id);
  const isLaunching = launchState !== "idle" && launchState !== "ready" && launchState !== "error";

  const launchSteps = [
    { label: "Cloud runtime", status: (launchState === "starting_runtime" ? "active" : ["preparing_gpu","starting_stream","launching_game","connecting","ready"].includes(launchState) ? "done" : "pending") as "pending"|"active"|"done" },
    { label: "GPU", status: (launchState === "preparing_gpu" ? "active" : ["starting_stream","launching_game","connecting","ready"].includes(launchState) ? "done" : "pending") as "pending"|"active"|"done" },
    { label: "Game environment", status: (launchState === "starting_stream" ? "active" : ["launching_game","connecting","ready"].includes(launchState) ? "done" : "pending") as "pending"|"active"|"done" },
    { label: "Launch game", status: (launchState === "launching_game" ? "active" : ["connecting","ready"].includes(launchState) ? "done" : "pending") as "pending"|"active"|"done" },
    { label: "Connect stream", status: (launchState === "connecting" ? "active" : launchState === "ready" ? "done" : "pending") as "pending"|"active"|"done" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative h-[350px] rounded-2xl overflow-hidden group">
        {game.heroImage && !imgError ? (
          <img src={game.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : game.coverImage && !imgError ? (
          <img src={game.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-40" onError={() => setImgError(true)} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-secondary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              {game.genres?.slice(0, 3).map((g) => (
                <span key={g.id} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 font-medium">{g.name}</span>
              ))}
              {game.rating && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">★ {game.rating.toFixed(1)}</span>
              )}
              {game.metacritic && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">MC {game.metacritic}</span>
              )}
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{game.name}</h1>
            <p className="text-white/60 line-clamp-2 max-w-2xl">{game.shortDescription || game.description}</p>
          </div>
        </div>
      </section>

      {/* Launch progress */}
      {isLaunching && (
        <section className="panel p-6">
          <h3 className="font-semibold text-lg mb-4">Starting {game.name}...</h3>
          <div className="flex flex-col gap-2.5">
            {launchSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  step.status === "done" ? "bg-success text-bg" : step.status === "active" ? "bg-accent text-white animate-pulse-soft" : "bg-secondary text-muted"
                }`}>
                  {step.status === "done" ? "✓" : i + 1}
                </span>
                <span className={step.status === "pending" ? "text-muted" : "text-text"}>{step.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Error */}
      {launchState === "error" && (
        <section className="panel p-6 border-danger/30">
          <h3 className="font-semibold text-lg mb-1 text-danger">Launch Failed</h3>
          <p className="text-sm text-muted mb-4">{launchError || "Failed to launch game"}</p>
          <Button variant="secondary" onClick={() => setLaunchState("idle")}>Try Again</Button>
        </section>
      )}

      {/* Content */}
      <section className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {/* Play/Install */}
          <div className="flex flex-col gap-4 mb-6">
            {primaryProvider && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>Playing through</span>
                <Badge tone="neutral">{primaryProvider.name}</Badge>
              </div>
            )}
            <div className="flex gap-3">
              {game.installed ? (
                <Button size="lg" onClick={handlePlay} disabled={isRunning || isLaunching}>
                  {isRunning ? "● Running" : isLaunching ? "Starting..." : "Play Now"}
                </Button>
              ) : (
                <Button size="lg" variant="secondary" disabled>Install Required</Button>
              )}
              {isRunning && (
                <Button size="lg" variant="danger" onClick={() => { stopGame(game.id); setLaunchState("idle"); }}>
                  Stop Game
                </Button>
              )}
            </div>
          </div>

          {/* About */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">About This Game</h2>
            <p className="text-muted leading-relaxed text-sm">{game.description}</p>
          </div>

          {/* Tags */}
          {game.tags && game.tags.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {game.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Screenshots */}
          {game.screenshots && game.screenshots.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Screenshots</h2>
              <div className="grid grid-cols-2 gap-3">
                {game.screenshots.slice(0, 4).map((s) => (
                  <div key={s.id} className="aspect-video rounded-lg bg-secondary overflow-hidden">
                    <img src={s.url} alt={`${game.name} screenshot`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
          <div className="panel p-4">
            <h3 className="text-sm font-semibold mb-3">Game Information</h3>
            <div className="flex flex-col gap-2 text-sm">
              {game.genres && game.genres.length > 0 && <InfoRow label="Genre" value={game.genres.map((g: { name: string }) => g.name).join(", ")} />}
              {game.releaseDate && <InfoRow label="Release" value={new Date(game.releaseDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />}
              {game.developer && <InfoRow label="Developer" value={game.developer} />}
              {game.publisher && <InfoRow label="Publisher" value={game.publisher} />}
              {game.rating && <InfoRow label="Rating" value={`★ ${game.rating.toFixed(1)}`} />}
              {game.metacritic && <InfoRow label="Metacritic" value={String(game.metacritic)} />}
            </div>
          </div>

          <div className="panel p-4">
            <h3 className="text-sm font-semibold mb-3">Cloud Gaming</h3>
            <div className="flex flex-col gap-2 text-sm">
              <InfoRow label="Resolution" value="Up to 1080p" />
              <InfoRow label="Target FPS" value="60" />
              <InfoRow label="Controller" value={game.controllerSupport === "full" ? "Full Support" : game.controllerSupport === "none" ? "Not Supported" : "Partial"} />
              <InfoRow label="Status" value={game.installed ? "✓ Installed" : "○ Not Installed"} />
            </div>
          </div>

          {primaryProvider && (
            <div className="panel p-4">
              <h3 className="text-sm font-semibold mb-3">Launch Provider</h3>
              <div className="flex flex-col gap-2 text-sm">
                <InfoRow label="Provider" value={primaryProvider.name} />
                <InfoRow label="Status" value={primaryProvider.availability === "available" ? "✓ Available" : "○ Unavailable"} />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
