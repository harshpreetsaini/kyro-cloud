"use client";

import { useState, useEffect } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { authHeader } from "@/lib/auth/client";
import { Button, Badge } from "@/components/ui";

interface Provider {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  loggedIn: boolean;
  username?: string;
  gameCount?: number;
  method: "oauth" | "agent" | "coming";
}

const PROVIDERS: Omit<Provider, "loggedIn" | "username" | "gameCount">[] = [
  { id: "steam", name: "Steam", icon: "🎮", description: "Valve's gaming platform — 50,000+ games", color: "from-blue-600 to-blue-800", method: "oauth" },
  { id: "epic", name: "Epic Games", icon: "🎯", description: "Epic Games Store — exclusives + free weekly games", color: "from-gray-700 to-gray-900", method: "oauth" },
  { id: "gog", name: "GOG", icon: "💎", description: "DRM-free games — you own what you buy", color: "from-purple-600 to-purple-800", method: "oauth" },
  { id: "ubisoft", name: "Ubisoft Connect", icon: "🌀", description: "Assassin's Creed, Far Cry, Rainbow Six", color: "from-blue-500 to-cyan-600", method: "coming" },
  { id: "ea", name: "EA App", icon: "🏆", description: "FIFA, Battlefield, Need for Speed, Jedi", color: "from-blue-700 to-indigo-800", method: "coming" },
  { id: "xbox", name: "Xbox / Game Pass", icon: "🟢", description: "Game Pass library — hundreds of games", color: "from-green-600 to-green-800", method: "coming" },
  { id: "battle", name: "Battle.net", icon: "⚔️", description: "Diablo, WoW, Overwatch, StarCraft", color: "from-blue-600 to-blue-700", method: "coming" },
  { id: "riot", name: "Riot Client", icon: "🔥", description: "League of Legends, Valorant, TFT", color: "from-red-600 to-red-800", method: "coming" },
];

export default function ProvidersPage() {
  const { connected } = useRuntime();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Check URL for OAuth callback results
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success) setLoginError(null);
    if (error) setLoginError(`Authentication failed: ${error}`);

    // Clean URL
    if (success || error) {
      window.history.replaceState({}, "", "/providers");
    }

    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/providers", { headers: { ...authHeader() } });
      const data = await res.json();
      if (data.ok && data.data) {
        // Check cookies for actual login state
        const enriched = data.data.map((p: Provider) => {
          const cookieName = `provider_${p.id}`;
          const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
          if (cookieMatch) {
            try {
              const session = JSON.parse(decodeURIComponent(cookieMatch[1]));
              return {
                ...p,
                loggedIn: true,
                username: session.displayName || session.username || session.name || session.steamId || p.username,
              };
            } catch {}
          }
          return p;
        });
        setProviders(enriched);
      } else {
        setProviders(PROVIDERS.map((p) => ({ ...p, loggedIn: false })));
      }
    } catch {
      setProviders(PROVIDERS.map((p) => ({ ...p, loggedIn: false })));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (providerId: string) => {
    setLoginError(null);
    try {
      const res = await fetch(`/api/providers/${providerId}/login`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok && data.data?.redirectUrl) {
        window.location.href = data.data.redirectUrl;
      } else {
        setLoginError(data.data?.message || "Login failed");
      }
    } catch {
      setLoginError("Connection failed. Is the runtime connected?");
    }
  };

  const handleSyncLibrary = async (providerId: string) => {
    setSyncing(providerId);
    try {
      const res = await fetch(`/api/providers/${providerId}/sync`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
      });
      const data = await res.json();
      if (data.ok) fetchProviders();
    } catch {} finally {
      setSyncing(null);
    }
  };

  const handleLogout = async (providerId: string) => {
    try {
      await fetch(`/api/providers/${providerId}/logout`, {
        method: "POST",
        headers: { ...authHeader() },
      });
      // Clear cookie
      document.cookie = `provider_${providerId}=; path=/; max-age=0`;
      fetchProviders();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl">Game Providers</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel p-5 h-40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl">Game Providers</h2>
        <p className="text-sm text-muted mt-1">Connect your gaming accounts to access your library</p>
      </div>

      {!connected && (
        <div className="panel p-4 border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-sm text-yellow-400">⚠ Runtime offline — connect your cloud PC first to sync libraries</p>
        </div>
      )}

      {loginError && (
        <div className="panel p-4 border border-danger/20 bg-danger/5">
          <p className="text-sm text-danger">✕ {loginError}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => (
          <div key={provider.id} className="panel p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center text-2xl`}>
                {provider.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{provider.name}</h3>
                  {provider.loggedIn ? (
                    <Badge tone="success">Connected</Badge>
                  ) : provider.method === "coming" ? (
                    <Badge tone="neutral">Coming Soon</Badge>
                  ) : (
                    <Badge tone="neutral">Not Connected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted truncate">{provider.description}</p>
              </div>
            </div>

            {provider.loggedIn ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Account</span>
                  <span>{provider.username}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Games Owned</span>
                  <span>{provider.gameCount ?? "—"}</span>
                </div>
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleSyncLibrary(provider.id)} disabled={syncing === provider.id}>
                    {syncing === provider.id ? "Syncing..." : "Sync Library"}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleLogout(provider.id)}>
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : provider.method === "oauth" ? (
              <Button size="sm" className="w-full" onClick={() => handleOAuthLogin(provider.id)}>
                Login with {provider.name}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" className="w-full" disabled>
                Coming Soon
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="panel p-5">
        <h3 className="font-semibold mb-3">How Provider Login Works</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted">
          <div className="flex flex-col gap-2">
            <span className="text-accent font-mono">01</span>
            <p>Click Login and sign in through the official provider page (Steam, Epic, GOG)</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-accent font-mono">02</span>
            <p>Sync your library — owned games appear in your Library tab</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-accent font-mono">03</span>
            <p>Click Install on any owned game — it downloads to your cloud PC</p>
          </div>
        </div>
      </div>
    </div>
  );
}
