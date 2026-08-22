"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader, setToken } from "@/lib/auth/client";
import { GameCard } from "@/components/GameCard";
import { Button, Card, Stat, Badge, EmptyState, SkeletonCard, SectionTitle } from "@/components/ui";
import type { GameEntry } from "@shared/types";

type ProviderInfo = { username?: string; accountId?: string; linkedAt?: number; error?: string };
type ProfileData = {
  favorites: string[];
  providers: Record<string, ProviderInfo>;
  installed_games: Record<string, any>;
  library: Record<string, any>;
  settings: Record<string, any>;
};
type UserData = {
  id: number;
  email: string | null;
  name: string | null;
  avatar: string | null;
  method: "google" | "password";
};

const PROVIDERS = [
  { id: "steam", label: "Steam", icon: "🟦" },
  { id: "epic", label: "Epic Games", icon: "🟪" },
  { id: "gog", label: "GOG", icon: "🟩" },
];

function initials(name?: string | null, email?: string | null) {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { launchGame, stopGame, runningGames, installedGames } = useRuntime();
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/user/profile", { headers: { ...authHeader() } }).then((r) => r.json()),
      fetch(api("/api/games"), { headers: { ...authHeader() } }).then((r) => r.json()),
    ])
      .then(([prof, cat]) => {
        if (!alive) return;
        setUser(prof.data?.user ?? null);
        setProfile(prof.data?.profile ?? null);
        setGames(cat.data || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const favIds = useMemo(() => profile?.favorites || [], [profile]);
  const favGames = useMemo(() => games.filter((g) => favIds.includes(g.id)), [games, favIds]);
  const installedIds = useMemo(() => Object.keys(installedGames || {}), [installedGames]);
  const installedList = useMemo(() => games.filter((g) => installedIds.includes(g.id)), [games, installedIds]);
  const connectedCount = useMemo(
    () => PROVIDERS.filter((p) => profile?.providers?.[p.id]?.username || profile?.providers?.[p.id]?.accountId).length,
    [profile]
  );

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setToken(null);
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-28 panel rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const displayName = user?.name || user?.email || "Owner";
  const avatar = user?.avatar;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <Card className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-5">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/10">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-accent">{initials(user?.name, user?.email)}</span>
          )}
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h2 className="text-xl font-semibold truncate">{displayName}</h2>
          <p className="text-sm text-muted truncate">{user?.email || "Local owner account"}</p>
          <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
            {user?.method === "google" ? (
              <Badge tone="accent">🔗 Signed in with Google</Badge>
            ) : (
              <Badge tone="neutral">🔑 Password account</Badge>
            )}
          </div>
        </div>
        <Button variant="secondary" onClick={logout} disabled={loggingOut}>
          {loggingOut ? "Signing out…" : "Sign out"}
        </Button>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <Stat label="Favorites" value={favGames.length} accent />
        </Card>
        <Card className="p-4 text-center">
          <Stat label="Installed" value={installedList.length} />
        </Card>
        <Card className="p-4 text-center">
          <Stat label="Providers" value={connectedCount} />
        </Card>
      </div>

      {/* Connected providers */}
      <section className="flex flex-col gap-3">
        <SectionTitle hint={<Link href="/providers" className="text-xs text-accent hover:underline">Manage</Link>}>
          Connected Accounts
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PROVIDERS.map((p) => {
            const info = profile?.providers?.[p.id];
            const linked = !!info?.username || !!info?.accountId;
            return (
              <Card key={p.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <span>{p.icon}</span>
                    {p.label}
                  </span>
                  {linked ? (
                    <Badge tone="success">Linked</Badge>
                  ) : (
                    <Badge tone="neutral">Not linked</Badge>
                  )}
                </div>
                <p className="text-sm text-muted truncate">
                  {info?.error ? (
                    <span className="text-danger">{info.error}</span>
                  ) : linked ? (
                    info.username || info.accountId
                  ) : (
                    "Connect to install from this store"
                  )}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Favorites */}
      <section className="flex flex-col gap-3">
        <SectionTitle hint={<Link href="/favorites" className="text-xs text-accent hover:underline">View all</Link>}>
          Favorites
        </SectionTitle>
        {favGames.length === 0 ? (
          <EmptyState
            icon="♥"
            title="NO FAVORITES YET"
            description="Games you favorite are saved to your account and sync across devices."
            action={<Link href="/games"><Button variant="secondary">Browse Games</Button></Link>}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {favGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                running={runningGames.includes(game.id)}
                onLaunch={launchGame}
                onStop={stopGame}
              />
            ))}
          </div>
        )}
      </section>

      {/* Installed library */}
      <section className="flex flex-col gap-3">
        <SectionTitle hint={<Link href="/library" className="text-xs text-accent hover:underline">View all</Link>}>
          Installed on your Cloud PC
        </SectionTitle>
        {installedList.length === 0 ? (
          <EmptyState
            icon="▣"
            title="NOTHING INSTALLED"
            description="Install games from the library and they'll show up here."
            action={<Link href="/games"><Button variant="secondary">Browse Games</Button></Link>}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {installedList.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                running={runningGames.includes(game.id)}
                onLaunch={launchGame}
                onStop={stopGame}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
