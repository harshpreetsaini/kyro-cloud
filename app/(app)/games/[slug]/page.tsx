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

  useEffect(() => {
    const slug = params.slug as string;
    fetch(api("/api/games"), { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => {
        const games = j.data || [];
        const found = games.find((g: GameEntry) => g.slug === slug || g.id === slug);
        if (found) {
          setGame(found);
        } else {
          setError("Game not found");
        }
      })
      .catch(() => setError("Failed to load game"))
      .finally(() => setLoading(false));
  }, [params.slug]);

  const handlePlay = useCallback(async () => {
    if (!game) return;
    
    setLaunchState("checking");
    setLaunchError(null);

    try {
      // Check if runtime is active
      const isOffline = !session || session.state === "OFFLINE" || session.state === "STOPPED" || session.state === "DISCONNECTED";
      
      if (isOffline) {
        // Start the runtime
        setLaunchState("starting_runtime");
        await runtimeAction("start");
        
        // Wait for runtime to be ready (poll session state)
        await waitForState("STREAMING", 120000);
      }

      setLaunchState("launching_game");
      // Launch the game
      launchGame(game.id);
      
      // Wait for game to be running
      setLaunchState("connecting");
      await waitForGameRunning(game.id, 30000);
      
      setLaunchState("ready");
      
      // Redirect to fullscreen session after a short delay
      setTimeout(() => {
        router.push("/session");
      }, 1500);
      
    } catch (err) {
      setLaunchState("error");
      setLaunchError(String(err));
    }
  }, [game, session, launchGame, router]);

  const waitForState = (targetState: string, timeoutMs: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error("Timeout waiting for runtime"));
          return;
        }
        // Check session state
        if (session?.state === targetState) {
          clearInterval(checkInterval);
          resolve();
        }
        if (session?.state === "ERROR") {
          clearInterval(checkInterval);
          reject(new Error("Runtime failed to start"));
        }
      }, 1000);
    });
  };

  const waitForGameRunning = (gameId: string, timeoutMs: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          // Don't reject - game might be running even if we can't detect it
          resolve();
          return;
        }
        if (runningGames.includes(gameId)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[300px] rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted">{error || "Game not found"}</p>
        <Link href="/games">
          <Button variant="secondary">Back to Games</Button>
        </Link>
      </div>
    );
  }

  const primaryProvider = game.providers?.[0];
  const isRunning = runningGames.includes(game.id);
  const isLaunching = launchState !== "idle" && launchState !== "ready" && launchState !== "error";

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Section */}
      <section className="relative h-[300px] rounded-xl overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(game.id)}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              {game.genres?.slice(0, 3).map((g) => (
                <span key={g.id} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                  {g.name}
                </span>
              ))}
              {game.rating && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                  ★ {game.rating.toFixed(1)}
                </span>
              )}
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">{game.name}</h1>
            <p className="text-white/70 line-clamp-2">{game.shortDescription || game.description}</p>
          </div>
        </div>
      </section>

      {/* Launch Status Overlay */}
      {isLaunching && (
        <section className="panel p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-accent/30 border-t-accent animate-spin" />
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-1">
                {launchState === "checking" && "Checking Runtime..."}
                {launchState === "starting_runtime" && "Starting Cloud PC..."}
                {launchState === "preparing_gpu" && "Preparing GPU..."}
                {launchState === "starting_stream" && "Starting Stream..."}
                {launchState === "launching_game" && `Launching ${game.name}...`}
                {launchState === "connecting" && "Connecting to Game..."}
              </h3>
              <p className="text-sm text-muted">
                {launchState === "starting_runtime" && "This may take a minute on first start"}
                {launchState === "launching_game" && "Starting the game through your launcher"}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Launch Error */}
      {launchState === "error" && (
        <section className="panel p-6 border-danger/30">
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-1 text-danger">Launch Failed</h3>
              <p className="text-sm text-muted mb-4">{launchError || "Failed to launch game"}</p>
              <Button variant="secondary" onClick={() => setLaunchState("idle")}>
                Try Again
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Action Section */}
      <section className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          {/* Play Button */}
          <div className="flex flex-col gap-4 mb-6">
            {primaryProvider && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>Available through</span>
                <Badge tone="neutral">{primaryProvider.name}</Badge>
              </div>
            )}
            <div className="flex gap-3">
              {game.installed ? (
                <Button
                  size="lg"
                  onClick={handlePlay}
                  disabled={isRunning || isLaunching}
                  className="bg-accent hover:bg-accent/90"
                >
                  {isRunning ? "Running" : isLaunching ? "Starting..." : "Play Now"}
                </Button>
              ) : (
                <Button size="lg" variant="secondary" disabled>
                  Install Required
                </Button>
              )}
              {isRunning && (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => {
                    stopGame(game.id);
                    setLaunchState("idle");
                  }}
                >
                  Stop Game
                </Button>
              )}
            </div>
          </div>

          {/* About */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">About This Game</h2>
            <p className="text-muted leading-relaxed">{game.description}</p>
          </div>

          {/* Screenshots */}
          {game.screenshots && game.screenshots.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Screenshots</h2>
              <div className="grid grid-cols-2 gap-3">
                {game.screenshots.slice(0, 4).map((screenshot) => (
                  <div
                    key={screenshot.id}
                    className="aspect-video rounded-lg bg-secondary overflow-hidden"
                  >
                    <img
                      src={screenshot.url}
                      alt="Game screenshot"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          {/* Game Info */}
          <div className="panel p-4">
            <h3 className="text-sm font-semibold mb-3">Game Information</h3>
            <div className="flex flex-col gap-2 text-sm">
              {game.genres && game.genres.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Genre</span>
                  <span>{game.genres.map((g) => g.name).join(", ")}</span>
                </div>
              )}
              {game.releaseDate && (
                <div className="flex justify-between">
                  <span className="text-muted">Release</span>
                  <span>{new Date(game.releaseDate).getFullYear()}</span>
                </div>
              )}
              {game.developer && (
                <div className="flex justify-between">
                  <span className="text-muted">Developer</span>
                  <span>{game.developer}</span>
                </div>
              )}
              {game.publisher && (
                <div className="flex justify-between">
                  <span className="text-muted">Publisher</span>
                  <span>{game.publisher}</span>
                </div>
              )}
              {game.platforms && (
                <div className="flex justify-between">
                  <span className="text-muted">Platform</span>
                  <span>{game.platforms.join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cloud Info */}
          <div className="panel p-4">
            <h3 className="text-sm font-semibold mb-3">Cloud Gaming</h3>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Resolution</span>
                <span>1080p</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Target FPS</span>
                <span>60</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Controller</span>
                <span>Supported</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Status</span>
                <Badge tone={game.installed ? "success" : "warning"}>
                  {game.installed ? "Installed" : "Not Installed"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Provider Info */}
          {primaryProvider && (
            <div className="panel p-4">
              <h3 className="text-sm font-semibold mb-3">Launch Provider</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Provider</span>
                  <span>{primaryProvider.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Status</span>
                  <Badge tone={primaryProvider.availability === "available" ? "success" : "warning"}>
                    {primaryProvider.availability === "available" ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
