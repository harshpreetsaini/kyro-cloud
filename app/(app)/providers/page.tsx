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
  method: "auth_code" | "coming";
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
  const { connected } = useRuntime();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authModal, setAuthModal] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [authInstructions, setAuthInstructions] = useState<{ title: string; steps: string[]; note?: string } | null>(null);
  const [authSaving, setAuthSaving] = useState(false);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success) {
      setAuthSuccess(success);
      setTimeout(() => setAuthSuccess(null), 3000);
    }
    if (error) setLoginError(`Authentication failed: ${error}`);
    if (success || error) window.history.replaceState({}, "", "/providers");
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/providers", { headers: { ...authHeader() } });
      const data = await res.json();
      if (data.ok && data.data) {
        const enriched = data.data.map((p: Provider) => {
          const cookieName = `provider_${p.id}`;
          const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
          if (cookieMatch) {
            try {
              const session = JSON.parse(decodeURIComponent(cookieMatch[1]));
              return { ...p, loggedIn: true, username: session.displayName || session.username || session.name || session.steamId || p.username };
            } catch {}
          }
          return { ...p, loggedIn: false };
        });
        setProviders(enriched);
      } else {
        setProviders(PROVIDERS.map((p) => ({ ...p, loggedIn: false, method: "auth_code", installMethod: "steamcmd" })));
      }
    } catch {
      setProviders(PROVIDERS.map((p) => ({ ...p, loggedIn: false, method: "auth_code", installMethod: "steamcmd" })));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (providerId: string) => {
    setLoginError(null);
    setAuthCode("");
    try {
      const res = await fetch(`/api/providers/${providerId}/login`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        if (data.data.instructions) {
          setAuthInstructions(data.data.instructions);
        }
        setAuthModal(providerId);
      }
    } catch {
      setLoginError("Connection failed");
    }
  };

  const handleSubmitAuthCode = async () => {
    if (!authModal || !authCode.trim()) return;
    setAuthSaving(true);
    try {
      const res = await fetch(`/api/providers/${authModal}/login`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({ authCode: authCode.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        // Save session cookie
        const sessionData = { displayName: authCode.trim(), connectedAt: new Date().toISOString() };
        document.cookie = `provider_${authModal}=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; max-age=${86400 * 30}`;
        setAuthModal(null);
        setAuthSuccess(authModal);
        fetchProviders();
      } else {
        setLoginError(data.error || "Failed to save auth code");
      }
    } catch {
      setLoginError("Failed to save auth code");
    } finally {
      setAuthSaving(false);
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
    document.cookie = `provider_${providerId}=; path=/; max-age=0`;
    fetchProviders();
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

      {authSuccess && (
        <div className="panel p-4 border border-green-500/20 bg-green-500/5">
          <p className="text-sm text-green-400">✓ {authSuccess} connected successfully</p>
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
                  <span className="truncate max-w-[120px]">{provider.username}</span>
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
              <Button size="sm" className="w-full" onClick={() => handleLogin(provider.id)}>
                Login with {provider.name}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Auth Code Modal */}
      {authModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="panel p-6 w-full max-w-lg mx-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">{authInstructions?.title || `Login to ${authModal}`}</h3>
              <button onClick={() => setAuthModal(null)} className="text-muted hover:text-white text-lg">✕</button>
            </div>

            {authInstructions?.steps && (
              <div className="text-sm text-muted space-y-2">
                {authInstructions.steps.map((step, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-accent font-mono">{i + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}

            {authInstructions?.note && (
              <p className="text-xs text-muted/70 italic">{authInstructions.note}</p>
            )}

            <div>
              <label className="text-sm text-muted mb-1 block">Paste your auth code / Steam ID:</label>
              <input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder={authModal === "steam" ? "76561198012345678" : "Paste auth code here"}
                className="w-full bg-muted/10 border border-muted/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => setAuthModal(null)}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1" onClick={handleSubmitAuthCode} disabled={!authCode.trim() || authSaving}>
                {authSaving ? "Saving..." : "Connect"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="panel p-5">
        <h3 className="font-semibold mb-3">How Provider Login Works</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted">
          <div className="flex flex-col gap-2">
            <span className="text-accent font-mono">01</span>
            <p>Click Login and follow the instructions to get your auth code from the provider</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-accent font-mono">02</span>
            <p>Paste the auth code and click Connect — your session is saved</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-accent font-mono">03</span>
            <p>Click Sync Library to fetch your games — then install from the Library tab</p>
          </div>
        </div>
      </div>
    </div>
  );
}
