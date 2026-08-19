"use client";

import { useState, useEffect } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { api } from "@/lib/config/api";
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
  installMethod: string;
}

const PROVIDERS: Omit<Provider, "loggedIn" | "username" | "gameCount">[] = [
  { id: "steam", name: "Steam", icon: "🎮", description: "Valve's gaming platform — 50,000+ games", color: "from-blue-600 to-blue-800", installMethod: "steamcmd" },
  { id: "epic", name: "Epic Games", icon: "🎯", description: "Epic Games Store — exclusives + free weekly games", color: "from-gray-700 to-gray-900", installMethod: "legendary" },
  { id: "gog", name: "GOG", icon: "💎", description: "DRM-free games — you own what you buy", color: "from-purple-600 to-purple-800", installMethod: "lgogdownloader" },
  { id: "ubisoft", name: "Ubisoft Connect", icon: "🌀", description: "Assassin's Creed, Far Cry, Rainbow Six", color: "from-blue-500 to-cyan-600", installMethod: "ubisoft" },
  { id: "ea", name: "EA App", icon: "🏆", description: "FIFA, Battlefield, Need for Speed, Jedi", color: "from-blue-700 to-indigo-800", installMethod: "ea" },
  { id: "xbox", name: "Xbox / Game Pass", icon: "🟢", description: "Game Pass library — hundreds of games", color: "from-green-600 to-green-800", installMethod: "xbox" },
  { id: "battle", name: "Battle.net", icon: "⚔️", description: "Diablo, WoW, Overwatch, StarCraft", color: "from-blue-600 to-blue-700", installMethod: "battle" },
  { id: "riot", name: "Riot Client", icon: "🔥", description: "League of Legends, Valorant, TFT", color: "from-red-600 to-red-800", installMethod: "riot" },
];

export default function ProvidersPage() {
  const { connected, installProgress } = useRuntime();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginProvider, setLoginProvider] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch(api("/api/providers"), { headers: { ...authHeader() } });
      const data = await res.json();
      if (data.ok && data.data) {
        setProviders(data.data);
      } else {
        setProviders(PROVIDERS.map((p) => ({ ...p, loggedIn: false })));
      }
    } catch {
      setProviders(PROVIDERS.map((p) => ({ ...p, loggedIn: false })));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (providerId: string) => {
    if (!loginForm.username || !loginForm.password) {
      setLoginError("Username and password are required");
      return;
    }
    setLoginError(null);
    setLoginSuccess(null);

    try {
      const res = await fetch(api(`/api/providers/${providerId}/login`), {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.ok) {
        setLoginSuccess(`Logged into ${providerId} successfully!`);
        setLoginProvider(null);
        setLoginForm({ username: "", password: "" });
        fetchProviders();
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch (e) {
      setLoginError("Connection failed. Is the runtime connected?");
    }
  };

  const handleSyncLibrary = async (providerId: string) => {
    setSyncing(providerId);
    try {
      const res = await fetch(api(`/api/providers/${providerId}/sync`), {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
      });
      const data = await res.json();
      if (data.ok) {
        fetchProviders();
      }
    } catch {
    } finally {
      setSyncing(null);
    }
  };

  const handleLogout = async (providerId: string) => {
    try {
      await fetch(api(`/api/providers/${providerId}/logout`), {
        method: "POST",
        headers: { ...authHeader() },
      });
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
          <p className="text-sm text-yellow-400">⚠ Runtime offline — connect your cloud PC first to log in and sync libraries</p>
        </div>
      )}

      {loginSuccess && (
        <div className="panel p-4 border border-success/20 bg-success/5">
          <p className="text-sm text-success">✓ {loginSuccess}</p>
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
            ) : loginProvider === provider.id ? (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Username / Email"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
                  className="bg-secondary/60 border border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                  className="bg-secondary/60 border border-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
                />
                {loginError && <p className="text-xs text-danger">{loginError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => handleLogin(provider.id)} disabled={!connected}>
                    {connected ? "Login" : "Connect Runtime First"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setLoginProvider(null); setLoginError(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="secondary" className="w-full" onClick={() => { setLoginProvider(provider.id); setLoginError(null); }} disabled={!connected}>
                {connected ? "Connect Account" : "Connect Runtime First"}
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
            <p>Log into your gaming account (Steam, Epic, etc.) through the secure agent on your cloud PC</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-accent font-mono">02</span>
            <p>Sync your library — owned games appear in your Library tab</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-accent font-mono">03</span>
            <p>Click Install on any owned game — it downloads to your cloud PC via the platform client</p>
          </div>
        </div>
      </div>
    </div>
  );
}
