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
  method: "oauth" | "coming";
  installMethod: string;
}

const PROVIDERS: Omit<Provider, "loggedIn" | "username" | "gameCount" | "method" | "installMethod">[] = [
  { id: "steam", name: "Steam", icon: "🎮", description: "Valve's gaming platform — 50,000+ games", color: "from-blue-600 to-blue-800" },
  { id: "epic", name: "Epic Games", icon: "🎯", description: "Epic Games Store — exclusives + free weekly games", color: "from-gray-700 to-gray-900" },
  { id: "gog", name: "GOG", icon: "💎", description: "DRM-free games — you own what you buy", color: "from-purple-600 to-purple-800" },
  { id: "ubisoft", name: "Ubisoft Connect", icon: "🌀", description: "Assassin's Creed, Far Cry, Rainbow Six", color: "from-blue-500 to-cyan-600" },
  { id: "ea", name: "EA App", icon: "🏆", description: "FIFA, Battlefield, Need for Speed, Jedi", color: "from-blue-700 to-indigo-800" },
  { id: "xbox", name: "Xbox / Game Pass", icon: "🟢", description: "Game Pass library — hundreds of games", color: "from-green-600 to-green-800" },
  { id: "battle", name: "Battle.net", icon: "⚔️", description: "Diablo, WoW, Overwatch, StarCraft", color: "from-blue-600 to-blue-700" },
  { id: "riot", name: "Riot Client", icon: "🔥", description: "League of Legends, Valorant, TFT", color: "from-red-600 to-red-800" },
];

export default function ProvidersPage() {
  const { connected, linkProvider, providerLinked } = useRuntime();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [steamUser, setSteamUser] = useState("");
  const [steamPass, setSteamPass] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (providerLinked?.steam) setLinking(false);
  }, [providerLinked?.steam]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success) {
      setLoginSuccess(success);
      setTimeout(() => setLoginSuccess(null), 5000);
    }
    if (error) setLoginError(`Authentication failed: ${error}`);
    if (success || error) window.history.replaceState({}, "", "/providers");
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const [providersRes, sessionRes] = await Promise.all([
        fetch("/api/providers", { headers: { ...authHeader() } }),
        fetch("/api/providers/session", { headers: { ...authHeader() } }),
      ]);
      const providersData = await providersRes.json();
      const sessionData = await sessionRes.json();

      if (providersData.ok && providersData.data) {
        const sessions = sessionData.ok ? sessionData.data : {};
        const enriched = providersData.data.map((p: Provider) => {
          const session = sessions[p.id];
          if (session?.loggedIn) {
            return { ...p, loggedIn: true, username: session.username || p.username };
          }
          return { ...p, loggedIn: false };
        });
        setProviders(enriched);
      } else {
        setProviders(PROVIDERS.map((p) => ({ ...p, loggedIn: false, method: "oauth", installMethod: "steamcmd" })));
      }
    } catch {
      setProviders(PROVIDERS.map((p) => ({ ...p, loggedIn: false, method: "oauth", installMethod: "steamcmd" })));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (providerId: string) => {
    setLoginError(null);
    // Redirect to provider's OAuth page via our API route
    window.location.href = `/api/providers/${providerId}/login`;
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
      await fetch("/api/providers/logout", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({ providerId }),
      });
    } catch {}
    fetchProviders();
  };

  const handleLinkSteam = () => {
    if (!steamUser || !steamPass || !connected) return;
    setLinking(true);
    try {
      linkProvider("steam", steamUser, steamPass);
    } catch (e) {
      console.error("linkProvider failed", e);
    }
    setTimeout(() => setLinking(false), 15000);
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

      {loginSuccess && (
        <div className="panel p-4 border border-green-500/20 bg-green-500/5">
          <p className="text-sm text-green-400">✓ {loginSuccess} connected successfully</p>
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
                  <span className="truncate max-w-[140px]">{provider.username}</span>
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
            ) : provider.method === "coming" ? (
              <Button size="sm" variant="secondary" className="w-full" disabled>
                Coming Soon
              </Button>
            ) : (
              <Button size="sm" className="w-full" onClick={() => handleOAuthLogin(provider.id)}>
                Login with {provider.name}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Steam cloud-install account (steamcmd) — required for installing owned games */}
      <div className="panel p-5 flex flex-col gap-3 border-accent/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl">🎮</div>
          <div className="min-w-0">
            <h3 className="font-semibold">Steam Account (for cloud installs)</h3>
            {providerLinked?.steam?.ok ? (
              <p className="text-sm text-green-600">✓ Linked as {providerLinked.steam.username} — installs run under your account</p>
            ) : (
              <p className="text-xs text-muted">Enter your Steam login + password. steamcmd uses them only to install games you own.</p>
            )}
            {providerLinked?.steam?.error && (
              <p className="text-sm text-danger mt-1">{providerLinked.steam.error}</p>
            )}
          </div>
        </div>
        {!providerLinked?.steam?.ok && (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Steam login username"
              value={steamUser}
              onChange={(e) => setSteamUser(e.target.value)}
              className="bg-secondary rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent flex-1"
            />
            <input
              type="password"
              placeholder="Steam password"
              value={steamPass}
              onChange={(e) => setSteamPass(e.target.value)}
              className="bg-secondary rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent flex-1"
            />
            <Button onClick={handleLinkSteam} disabled={!steamUser || !steamPass || linking || !connected}>
              {linking ? "Linking..." : "Link Account"}
            </Button>
          </div>
        )}
        {!connected && (
          <p className="text-xs text-danger">Connect your cloud PC first before linking.</p>
        )}
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
