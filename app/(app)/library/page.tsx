"use client";

import { useState, useEffect, useMemo } from "react";
import { GameCard } from "@/components/GameCard";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";
import { SkeletonCard, EmptyState, Button } from "@/components/ui";
import { LibraryIcon } from "@/components/icons";
import type { GameEntry } from "@shared/types";
import Link from "next/link";

type FilterType = "all" | "installed" | "downloading" | "notinstalled";

type SyncedGame = Omit<GameEntry, "installState"> & { installState?: "installed" | "downloading" | "notinstalled"; percent?: number };

export default function LibraryPage() {
  const { launchGame, stopGame, runningGames, installedGames: installedMap, providerGames, installApp, installGame, installProgress } = useRuntime();
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  // Durable per-user data from Neon so the library survives refreshes and
  // shows every synced game regardless of download state.
  const [profileLibrary, setProfileLibrary] = useState<Record<string, { appId: string; name: string }[]>>({});
  const [installedFromDb, setInstalledFromDb] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(api("/api/games"), { headers: { ...authHeader() } }).then((r) => r.json()).then((j) => j.data || []),
      fetch(api("/api/user/profile"), { headers: { ...authHeader() } }).then((r) => r.json()).catch(() => null),
    ])
      .then(([catalog, profileRes]) => {
        if (cancelled) return;
        setGames(catalog);
        if (profileRes?.ok && profileRes.data?.profile) {
          setProfileLibrary(profileRes.data.profile.library || {});
          setInstalledFromDb(profileRes.data.profile.installed_games || {});
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Merge the durable synced libraries (Steam/Epic/GOG) with the catalog so
  // every game the user owns appears — installable even if it isn't in the
  // curated catalog. Live providerGames overlay the persisted copy.
  const availableGames = useMemo<SyncedGame[]>(() => {
    const catalogIds = new Set(games.map((g) => g.id));
    const seen = new Set<string>();
    const list: GameEntry[] = [];

    for (const provider of ["steam", "epic", "gog"] as const) {
      const live = providerGames[provider] || [];
      const stored = profileLibrary[provider] || [];
      const glist = live.length ? live : stored;
      for (const g of glist) {
        const match = games.find(
          (c) => c.providers?.[0]?.type === provider && String(c.providers?.[0]?.appId) === g.appId
        );
        if (match && !seen.has(match.id)) {
          seen.add(match.id);
          list.push(match);
        } else if (!match) {
          const id = `${provider}-${g.appId}`;
          if (!seen.has(id)) {
            seen.add(id);
            list.push({
              id,
              name: g.name,
              providers: [{ type: provider, appId: g.appId, name: g.name }],
              availability: "available",
            } as unknown as GameEntry);
          }
        }
      }
    }
    // Include catalog games that are installed but weren't covered above.
    for (const g of games) {
      if (installedMap[g.id] && !seen.has(g.id)) {
        seen.add(g.id);
        list.push(g);
      }
    }

    // Attach live install state so Downloading/Installed reflects correctly.
    return list.map((g) => {
      const ip = installProgress[g.id];
      let state: SyncedGame["installState"] = "notinstalled";
      if (ip?.state === "downloading") state = "downloading";
      else if (installedMap[g.id] || installedFromDb[g.id] || ip?.state === "ready") state = "installed";
      return { ...g, installState: state, percent: ip?.percent };
    });
  }, [games, providerGames, profileLibrary, installedFromDb, installedMap, installProgress]);

  const counts = useMemo(
    () => ({
      all: availableGames.length,
      installed: availableGames.filter((g) => g.installState === "installed").length,
      downloading: availableGames.filter((g) => g.installState === "downloading").length,
      notinstalled: availableGames.filter((g) => g.installState === "notinstalled").length,
    }),
    [availableGames]
  );

  const runningCount = availableGames.filter((g) => runningGames.includes(g.id)).length;
  const hasProviderLink = Object.keys(profileLibrary).some((k) => (profileLibrary[k] || []).length > 0);

  const handleInstall = (id: string) => {
    const g = availableGames.find((x) => x.id === id);
    const prov = g?.providers?.[0];
    if (!g || !prov) return;
    // Catalog game → use its real id; synced-only game → install by appId.
    if (games.some((c) => c.id === g.id)) installGame(g.id);
    else installApp(prov.type, String(prov.appId), g.name);
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case "installed":
        return availableGames.filter((g) => g.installState === "installed");
      case "downloading":
        return availableGames.filter((g) => g.installState === "downloading");
      case "notinstalled":
        return availableGames.filter((g) => g.installState === "notinstalled");
      default:
        return availableGames;
    }
  }, [availableGames, filter]);

  const tabs: { id: FilterType; label: string; count: number }[] = [
    { id: "all", label: "All Games", count: counts.all },
    { id: "installed", label: "Installed", count: counts.installed },
    { id: "downloading", label: "Downloading", count: counts.downloading },
    { id: "notinstalled", label: "Not Installed", count: counts.notinstalled },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold">My Library</h2>
        <p className="text-sm text-muted mt-0.5">
          {loading
            ? "Loading..."
            : `${counts.all} game${counts.all === 1 ? "" : "s"}${runningCount > 0 ? ` · ${runningCount} running` : ""}`}
        </p>
      </div>

      <div className="flex gap-1 bg-secondary/40 rounded-lg p-0.5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-1.5 ${
              filter === t.id ? "bg-accent text-white" : "text-muted hover:text-text"
            }`}
          >
            {t.label}
            <span className={filter === t.id ? "opacity-90" : "opacity-60"}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : availableGames.length === 0 ? (
        <EmptyState
          icon={<LibraryIcon className="w-7 h-7" />}
          title="NO GAMES YET"
          description={hasProviderLink ? "Sync a provider library from the Providers page to see your games here." : "Connect a Steam, Epic, or GOG account to load your games."}
          action={<Link href="/providers"><Button variant="secondary">Connect Providers</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((game) => (
            <GameCard
              key={game.id}
              game={game as GameEntry}
              running={runningGames.includes(game.id)}
              onLaunch={launchGame}
              onStop={stopGame}
              onInstall={handleInstall}
              showPlayButton
            />
          ))}
        </div>
      )}
    </div>
  );
}
