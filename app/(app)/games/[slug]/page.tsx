"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { Button, Skeleton, Badge } from "@/components/ui";
import { runtimeAction, runtimeRefreshStream, runtimeStore } from "@/lib/runtime/store";
import { isFavorite, toggleFavorite as toggleFavoriteStore } from "@/lib/favorites";
import type { GameEntry, InstallProgress } from "@shared/types";

function makeShareUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

type LaunchState = "idle" | "checking" | "starting_runtime" | "preparing_gpu" | "starting_stream" | "launching_game" | "connecting" | "ready" | "error";

export default function GameDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { launchGame, stopGame, installGame, uninstallGame, cancelInstall, runningGames, session, connected, installProgress, providerLinked, isInstalled, isOwned, steamOwnedApps } = useRuntime();
  const [game, setGame] = useState<GameEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launchState, setLaunchState] = useState<LaunchState>("idle");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [realScreenshots, setRealScreenshots] = useState<string[]>([]);
  const [loadingScreenshots, setLoadingScreenshots] = useState(false);
  const [providerLogin, setProviderLogin] = useState<Record<string, { loggedIn: boolean; username?: string }>>({});

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

  // Fetch which providers the user has connected (so we can show Install vs Connect)
  useEffect(() => {
    fetch("/api/providers/session", { headers: { ...authHeader() } })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.data) {
          const map: Record<string, { loggedIn: boolean; username?: string }> = {};
          for (const [k, v] of Object.entries(j.data)) {
            const p = v as { loggedIn?: boolean; username?: string };
            map[k] = { loggedIn: !!p.loggedIn, username: p.username };
          }
          setProviderLogin(map);
        }
      })
      .catch(() => {});
  }, []);

  // The game needs at least one of its providers connected to install/play
  const neededProvider = (game?.providers?.[0]?.type || "steam") as string;
  const providerConnected = !!providerLogin[neededProvider]?.loggedIn;

  // Fetch real screenshots from Steam API when game loads
  useEffect(() => {
    if (!game) return;
    // Find Steam app ID from providers
    const steamProvider = game.providers?.find((p) => p.name === "Steam" || p.name === "Steam Store");
    const appId = steamProvider?.appId || game.id?.replace(/[^0-9]/g, "");
    if (!appId || !/^\d+$/.test(appId)) {
      // Try to extract numeric ID from game ID
      const numericId = game.id?.replace(/\D/g, "");
      if (numericId && /^\d{3,}$/.test(numericId)) {
        fetchScreenshots(numericId);
      }
      return;
    }
    fetchScreenshots(appId);
  }, [game?.id]);

  const fetchScreenshots = async (appId: string) => {
    setLoadingScreenshots(true);
    try {
      const res = await fetch(`/api/games/screenshots?appId=${appId}`);
      const data = await res.json();
      // API returns { ok: true, data: [...] } with url/thumbnail properties
      const screenshots = data.data || data.screenshots;
      if (screenshots && screenshots.length > 0) {
        setRealScreenshots(screenshots.map((s: any) => s.url || s.path_full || s.thumbnail));
      }
    } catch {
      // Screenshots unavailable, will use hero/cover as fallback
    } finally {
      setLoadingScreenshots(false);
    }
  };

  const handlePlay = useCallback(async () => {
    if (!game) return;
    setLaunchState("checking");
    setLaunchError(null);
    try {
      // The remote desktop renders only when an active stream exists. A stale
      // `STREAMING` session state (e.g. after the cloud PC dropped) can leave
      // us without a stream, so gate on the actual stream, not just session.state.
      const hasActiveStream = () => !!runtimeStore.getSnapshot().stream;
      if (!hasActiveStream()) {
        setLaunchState("starting_runtime");
        await runtimeAction("start");
        await waitForStream(120000);
      }
      setLaunchState("launching_game");
      launchGame(game.id);
      setLaunchState("connecting");
      await waitForGameRunning(game.id, 30000);
      setLaunchState("ready");
      // Reconcile the stream from the backend in case the WS push was missed.
      runtimeRefreshStream();
      setTimeout(() => router.push("/session"), 1500);
    } catch (err) {
      setLaunchState("error");
      setLaunchError(String(err));
    }
  }, [game, session, launchGame, router]);

  const handleInstall = useCallback(() => {
    if (!game) return;
    installGame(game.id);
  }, [game, installGame]);

  const handleUninstall = useCallback(() => {
    if (!game) return;
    uninstallGame(game.id);
  }, [game, uninstallGame]);

  const handleCancelInstall = useCallback(() => {
    if (!game) return;
    cancelInstall(game.id);
  }, [game, cancelInstall]);

  // Favorites (persisted in localStorage) + Share (copies a unique share URL)
  const [favorite, setFavorite] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (game) setFavorite(isFavorite(game.id));
  }, [game?.id]);

  const toggleFavorite = useCallback(() => {
    if (!game) return;
    setFavorite(toggleFavoriteStore(game.id));
  }, [game?.id]);

  const shareGame = useCallback(() => {
    if (!game) return;
    const uid = makeShareUid();
    const url = `${window.location.origin}/games/${game.slug}?uid=${uid}`;
    const done = () => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(done);
    } else {
      done();
    }
  }, [game?.slug]);

  const waitForStream = (timeoutMs: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const iv = setInterval(() => {
        if (Date.now() - start > timeoutMs) { clearInterval(iv); reject(new Error("Timeout waiting for stream")); return; }
        const s = runtimeStore.getSnapshot();
        if (s.stream) { clearInterval(iv); resolve(); }
        if (s.session?.state === "ERROR") { clearInterval(iv); reject(new Error("Runtime failed to start")); }
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
  const install = installProgress[game.id];
  const installState = install?.state;
  const isInstallingNow =
    installState === "requested" ||
    installState === "checking" ||
    installState === "downloading" ||
    installState === "installing" ||
    installState === "verifying";
  const installed = isInstalled(game.id);
  const appId = game.providers?.[0]?.appId;
  const notOwned =
    neededProvider === "steam" &&
    !game.isFree &&
    !!appId &&
    steamOwnedApps.length > 0 &&
    !isOwned(appId);

  const launchSteps = [
    { label: "Cloud runtime", status: (launchState === "starting_runtime" ? "active" : ["preparing_gpu","starting_stream","launching_game","connecting","ready"].includes(launchState) ? "done" : "pending") as "pending"|"active"|"done" },
    { label: "GPU", status: (launchState === "preparing_gpu" ? "active" : ["starting_stream","launching_game","connecting","ready"].includes(launchState) ? "done" : "pending") as "pending"|"active"|"done" },
    { label: "Game environment", status: (launchState === "starting_stream" ? "active" : ["launching_game","connecting","ready"].includes(launchState) ? "done" : "pending") as "pending"|"active"|"done" },
    { label: "Launch game", status: (launchState === "launching_game" ? "active" : ["connecting","ready"].includes(launchState) ? "done" : "pending") as "pending"|"active"|"done" },
    { label: "Connect stream", status: (launchState === "connecting" ? "active" : launchState === "ready" ? "done" : "pending") as "pending"|"active"|"done" },
  ];

  const screenshotsToShow = realScreenshots.length > 0 ? realScreenshots : (game.screenshots?.map(s => s.url) || []);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative h-[350px] rounded-2xl overflow-hidden group animate-fadeIn">
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
              {Array.isArray(game.genres) && game.genres.slice(0, 3).map((g: any, i: number) => (
                <span key={g.id ?? i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 font-medium">{g.name || g}</span>
              ))}
              {game.rating && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">★ {Number(game.rating).toFixed(1)}</span>
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

      {/* Install progress */}
      {(isInstallingNow || installState === "error") && (
        <section className="panel p-6">
          <h3 className="font-semibold text-lg mb-4">
            {installState === "requested" && "Starting installation..."}
            {installState === "checking" && "Checking for updates..."}
            {installState === "downloading" && `Downloading ${game.name}...`}
            {installState === "installing" && `Installing ${game.name}...`}
            {installState === "verifying" && "Verifying installation..."}
          </h3>
          <div className="flex flex-col gap-3">
            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60 transition-all duration-300 ease-out"
                style={{ width: `${install.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-muted">
              <span>{Math.round(install.percent)}%</span>
              {install.speedBytesPerSec > 0 && (
                <span>{formatBytes(install.speedBytesPerSec)}/s</span>
              )}
              {install.etaSeconds > 0 && (
                <span>ETA: {formatTime(install.etaSeconds)}</span>
              )}
              {install.totalBytes > 0 && (
                <span>{formatBytes(install.downloadedBytes)} / {formatBytes(install.totalBytes)}</span>
              )}
            </div>
            {install.state === "error" && (
              <p className="text-sm text-danger">{install.error || "Installation failed"}</p>
            )}
            {/* Cancel button */}
            {(install.state === "checking" || install.state === "downloading" || install.state === "installing" || install.state === "verifying") && (
              <Button variant="danger" size="sm" onClick={handleCancelInstall}>
                Cancel
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Steam account status — linking happens in the Provider section */}
      {neededProvider === "steam" && (
        <section className="panel p-6 mb-6">
          {providerLinked?.steam?.ok ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span>✓ Steam account linked</span>
              <span className="text-muted">·</span>
              <span className="text-text">{providerLinked.steam.username}</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-muted">
                Link your Steam account to install owned games on your cloud PC.
              </p>
              <Link href="/providers" passHref>
                <Button size="sm">Link Steam Account</Button>
              </Link>
            </div>
          )}
          {providerLinked?.steam?.error && (
            <p className="text-sm text-danger mt-2">{providerLinked.steam.error}</p>
          )}
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
              {installed || installState === "ready" ? (
                <Button size="lg" onClick={handlePlay} disabled={isRunning || isLaunching}>
                  {isRunning ? "● Running" : isLaunching ? "Starting..." : "Play"}
                </Button>
              ) : isInstallingNow ? (
                <Button size="lg" variant="secondary" disabled>
                  {installState === "requested" ? "Starting installation..."
                    : installState === "checking" ? "Checking for updates..."
                    : installState === "downloading" ? `Downloading... ${Math.round(install?.percent || 0)}%`
                    : installState === "installing" ? "Installing..."
                    : "Verifying installation..."}
                </Button>
              ) : game.isFree ? (
                <Button size="lg" onClick={handleInstall}>
                  Install
                </Button>
              ) : providerConnected ? (
                <Button size="lg" onClick={handleInstall}>
                  Install
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={handleInstall}>
                    Install
                  </Button>
                  <Link href="/providers" passHref>
                    <Button size="lg" variant="secondary">
                      Connect {neededProvider === "epic" ? "Epic" : neededProvider === "gog" ? "GOG" : "Account"}
                    </Button>
                  </Link>
                </>
              )}
              {isRunning && (
                <Button size="lg" variant="danger" onClick={() => { stopGame(game.id); setLaunchState("idle"); }}>
                  Stop Game
                </Button>
              )}
              {(installed || installState === "ready") && !isRunning && install?.state !== "uninstalling" && (
                <Button size="lg" variant="secondary" onClick={handleUninstall}>
                  Uninstall
                </Button>
              )}
              {install?.state === "uninstalling" && (
                <Button size="lg" variant="secondary" disabled>
                  Uninstalling...
                </Button>
              )}
            </div>
            {neededProvider === "steam" && !providerLinked?.steam?.ok && (
              <p className="text-xs text-muted mt-3">
                Tip: link your Steam account in the Provider section so games install under your login.
              </p>
            )}
            {notOwned && (
              <p className="text-xs text-yellow-400 mt-2">
                This game isn&apos;t in your linked Steam library — installation may fail if you don&apos;t own it.
              </p>
            )}
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
          {(loadingScreenshots || screenshotsToShow.length > 0) && (
            <div className="mb-6 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
              <h2 className="text-lg font-semibold mb-3">Screenshots</h2>
              {loadingScreenshots ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-video rounded-lg bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 stagger-children">
                  {screenshotsToShow.slice(0, 4).map((url, i) => (
                    <div key={i} className="aspect-video rounded-lg bg-secondary overflow-hidden hover:scale-[1.02] transition-transform duration-300 cursor-pointer">
                      <img src={url} alt={`${game.name} screenshot ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* System Requirements */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">System Requirements</h2>
            <div className="panel p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted mb-1">Minimum</p>
                  <p className="text-xs">OS: Windows 10 64-bit</p>
                  <p className="text-xs">Processor: Intel Core i5-8400 / AMD Ryzen 5 2600</p>
                  <p className="text-xs">Memory: 16 GB RAM</p>
                  <p className="text-xs">Graphics: NVIDIA GTX 1070 / AMD RX 580</p>
                  <p className="text-xs">Storage: {game.downloadSize || "80 GB"} available space</p>
                </div>
                <div>
                  <p className="text-muted mb-1">Recommended</p>
                  <p className="text-xs">OS: Windows 10/11 64-bit</p>
                  <p className="text-xs">Processor: Intel Core i7-10700K / AMD Ryzen 7 3800X</p>
                  <p className="text-xs">Memory: 32 GB RAM</p>
                  <p className="text-xs">Graphics: NVIDIA RTX 3070 / AMD RX 6800</p>
                  <p className="text-xs">Storage: {game.downloadSize || "80 GB"} SSD</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0 animate-slideInRight">
          <div className="panel p-4">
            <h3 className="text-sm font-semibold mb-3">Game Information</h3>
            <div className="flex flex-col gap-2 text-sm">
              {Array.isArray(game.genres) && game.genres.length > 0 && <InfoRow label="Genre" value={game.genres.map((g: any) => g.name || g).join(", ")} />}
              {game.releaseDate && <InfoRow label="Release" value={new Date(game.releaseDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />}
              {game.developer && <InfoRow label="Developer" value={game.developer} />}
              {game.publisher && <InfoRow label="Publisher" value={game.publisher} />}
              {typeof game.rating === "number" && !isNaN(game.rating) && <InfoRow label="Rating" value={`★ ${game.rating.toFixed(1)}`} />}
              {game.metacritic && <InfoRow label="Metacritic" value={String(game.metacritic)} />}
            </div>
          </div>

          <div className="panel p-4">
            <h3 className="text-sm font-semibold mb-3">Cloud Gaming</h3>
            <div className="flex flex-col gap-2 text-sm">
              <InfoRow label="Resolution" value="Up to 1080p" />
              <InfoRow label="Target FPS" value="60" />
              <InfoRow label="Controller" value={game.controllerSupport === "full" ? "Full Support" : game.controllerSupport === "none" ? "Not Supported" : "Partial"} />
              <InfoRow label="Status" value={installed || installState === "ready" ? "✓ Installed" : isInstallingNow ? "⟳ Installing" : "○ Not Installed"} />
              <InfoRow label="Size" value={game.downloadSize || "— GB"} />
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

          <div className="panel p-4">
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              <Button variant={favorite ? "primary" : "secondary"} size="sm" className="w-full" onClick={toggleFavorite}>
                {favorite ? "♥ Favorited" : "♡ Add to Favorites"}
              </Button>
              <Button variant="secondary" size="sm" className="w-full" onClick={shareGame}>
                {shareCopied ? "✓ Link copied!" : "Share"}
              </Button>
            </div>
          </div>
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
