"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
import { authHeader, setToken } from "@/lib/auth/client";
import { GameCard } from "@/components/GameCard";
import { Button, Card, Stat, Badge, EmptyState, SkeletonCard, SectionTitle } from "@/components/ui";
import { ProviderLogo } from "@/components/ProviderLogo";
import {
  FavoritesIcon, LibraryIcon, KeyIcon, CheckIcon,
} from "@/components/icons";
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
  { id: "steam", label: "Steam" },
  { id: "epic", label: "Epic Games" },
  { id: "gog", label: "GOG" },
];

function initials(name?: string | null, email?: string | null) {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

// Preset profile frames — pure CSS gradients, no assets needed.
const FRAMES: { id: string; label: string; cls: string }[] = [
  { id: "none", label: "None", cls: "" },
  { id: "ember", label: "Ember", cls: "bg-gradient-to-br from-orange-400 via-red-500 to-rose-600" },
  { id: "aurora", label: "Aurora", cls: "bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500" },
  { id: "royal", label: "Royal", cls: "bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-600" },
  { id: "neon", label: "Neon", cls: "bg-gradient-to-br from-pink-500 via-fuchsia-500 to-indigo-500" },
  { id: "frost", label: "Frost", cls: "bg-gradient-to-br from-sky-300 via-blue-400 to-indigo-500" },
];

// Downscale any picked image to a centered 256px JPEG data URL (small enough
// to live inside the profile's settings JSONB).
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("canvas unavailable");
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
        resolve(c.toDataURL("image/jpeg", 0.85));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const { launchGame, stopGame, runningGames, installedGames } = useRuntime();
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
  // Installed = live runtime map ∪ durable profile.installed_games (survives refresh).
  const installedIds = useMemo(() => {
    const persisted = (profile as any)?.installed_games || {};
    return Array.from(new Set([...Object.keys(installedGames || {}), ...Object.keys(persisted)]));
  }, [installedGames, profile]);
  const installedList = useMemo(() => {
    const byId = new Map(games.map((g) => [g.id, g]));
    const list = installedIds.map((id) => byId.get(id)).filter(Boolean) as typeof games;
    // Synced-only ids that aren't in the catalog still count toward the total.
    return list;
  }, [games, installedIds]);
  const connectedCount = useMemo(
    () => PROVIDERS.filter((p) => profile?.providers?.[p.id]?.username || profile?.providers?.[p.id]?.accountId).length,
    [profile]
  );

  async function logout() {
    setLoggingOut(true);
    try {
      // Clear every local cache tied to the previous identity.
      try { localStorage.removeItem("luna_token"); } catch {}
      try { localStorage.removeItem("kyro_steam_linked"); } catch {}
      try { localStorage.removeItem("kyro_favorites_cache"); } catch {}
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setToken(null);
    router.push("/login");
  }

  const customAvatar: string | null = profile?.settings?.avatar || null;
  const frameId: string = profile?.settings?.avatarFrame || "none";
  const frameCls = FRAMES.find((f) => f.id === frameId)?.cls || "";

  async function saveAppearance(patch: Record<string, unknown>) {
    setSavingAppearance(true);
    try {
      const nextSettings = { ...(profile?.settings || {}), ...patch };
      setProfile((p) => (p ? { ...p, settings: nextSettings } : p));
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({ settings: nextSettings }),
      });
      if (res.ok) {
        const j = await res.json().catch(() => null);
        if (j?.ok && j.data) setProfile((p) => (p ? { ...p, ...j.data } : p));
      }
    } finally {
      setSavingAppearance(false);
    }
  }

  async function onAvatarPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(f);
      await saveAppearance({ avatar: dataUrl });
    } catch {}
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
  const avatar = customAvatar || user?.avatar;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <Card className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-5">
        <div
          className={`w-[88px] h-[88px] rounded-full p-[3px] shrink-0 ${frameCls || "bg-white/10"}`}
        >
          <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center overflow-hidden ring-1 ring-black/20">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-accent">{initials(user?.name, user?.email)}</span>
            )}
          </div>
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h2 className="text-xl font-semibold truncate">{displayName}</h2>
          <p className="text-sm text-muted truncate">{user?.email || "Local owner account"}</p>
          <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
            {user?.method === "google" ? (
              <Badge tone="accent" className="inline-flex items-center gap-1"><CheckIcon className="w-3 h-3" /> Signed in with Google</Badge>
            ) : (
              <Badge tone="neutral" className="inline-flex items-center gap-1"><KeyIcon className="w-3 h-3" /> Password account</Badge>
            )}
          </div>
        </div>
        <Button variant="secondary" onClick={logout} disabled={loggingOut}>
          {loggingOut ? "Signing out…" : "Sign out"}
        </Button>
      </Card>

      {/* Avatar & frame customization */}
      <section className="flex flex-col gap-3">
        <SectionTitle hint={savingAppearance ? <span className="text-xs text-muted">Saving…</span> : undefined}>
          Customize Profile
        </SectionTitle>
        <Card className="p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              Upload Avatar
            </Button>
            {customAvatar && (
              <Button variant="ghost" size="sm" onClick={() => saveAppearance({ avatar: null })}>
                Remove
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatarPicked} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted w-full sm:w-auto">Profile Frame</span>
            {FRAMES.map((f) => (
              <button
                key={f.id}
                title={f.label}
                aria-label={`Frame: ${f.label}`}
                onClick={() => saveAppearance({ avatarFrame: f.id })}
                disabled={savingAppearance}
                className={`w-9 h-9 rounded-full p-[2.5px] transition-transform hover:scale-105 ${
                  f.cls || "bg-white/10"
                } ${frameId === f.id ? "ring-2 ring-accent ring-offset-2 ring-offset-surface scale-105" : ""}`}
              >
                <span className="block w-full h-full rounded-full bg-secondary" />
              </button>
            ))}
          </div>
        </Card>
      </section>

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
                    <ProviderLogo id={p.id} className="w-4.5 h-4.5 w-[18px] h-[18px]" />
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
            icon={<FavoritesIcon className="w-7 h-7" />}
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
            icon={<LibraryIcon className="w-7 h-7" />}
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
