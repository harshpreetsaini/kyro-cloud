"use client";

import { useState, useEffect, useRef } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { authHeader } from "@/lib/auth/client";
import { Button, Badge } from "@/components/ui";
import { ProviderLogo } from "@/components/ProviderLogo";
import {
  SyncIcon, DisconnectIcon, ConnectIcon, SuccessIcon, ErrorIcon, WarningIcon,
} from "@/components/icons";

interface Provider {
  id: string;
  name: string;
  description: string;
  color: string;
  loggedIn: boolean;
  username?: string;
  gameCount?: number;
  method: "oauth" | "coming";
  installMethod: string;
}

const PROVIDERS: Omit<Provider, "loggedIn" | "username" | "gameCount" | "method" | "installMethod" | "icon">[] = [
  { id: "steam", name: "Steam", description: "Valve's gaming platform — 50,000+ games", color: "from-blue-600 to-blue-800" },
  { id: "epic", name: "Epic Games", description: "Epic Games Store — exclusives + free weekly games", color: "from-gray-700 to-gray-900" },
  { id: "gog", name: "GOG", description: "DRM-free games — you own what you buy", color: "from-purple-600 to-purple-800" },
  { id: "ubisoft", name: "Ubisoft Connect", description: "Assassin's Creed, Far Cry, Rainbow Six", color: "from-blue-500 to-cyan-600" },
  { id: "ea", name: "EA App", description: "FIFA, Battlefield, Need for Speed, Jedi", color: "from-blue-700 to-indigo-800" },
  { id: "xbox", name: "Xbox / Game Pass", description: "Game Pass library — hundreds of games", color: "from-green-600 to-green-800" },
  { id: "battle", name: "Battle.net", description: "Diablo, WoW, Overwatch, StarCraft", color: "from-blue-600 to-blue-700" },
  { id: "riot", name: "Riot Client", description: "League of Legends, Valorant, TFT", color: "from-red-600 to-red-800" },
];

const CONNECT_LABEL: Record<string, string> = {
  steam: "Connect Steam Account",
  epic: "Connect Epic Games Account",
  gog: "Connect GOG Account",
};

const CONNECTED_LABEL: Record<string, string> = {
  steam: "Steam — Connected",
  epic: "Epic Games — Connected",
  gog: "GOG — Connected",
};

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
  const [showSteamForm, setShowSteamForm] = useState(false);
  const pendingAutoSync = useRef<string | null>(null);

  useEffect(() => {
    if (providerLinked?.steam) setLinking(false);
  }, [providerLinked?.steam]);

  // The backend is the source of truth for the linked Steam account (it
  // persists immediately on a successful link). Derive the "linked" state from
  // BOTH the live WS event and the backend session so the form updates even if
  // the WS push was missed, and so it survives a page refresh.
  const steamProvider = providers.find((p) => p.id === "steam");
  const steamSessionLinked = !!steamProvider?.loggedIn;
  const steamSessionUser = steamProvider?.username;
  const steamLinked = !!providerLinked?.steam?.ok || steamSessionLinked;
  const steamDisplayName = providerLinked?.steam?.username || steamSessionUser;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success) {
      setLoginSuccess(success === "true" ? "Account connected" : success);
      // A provider was just connected via OAuth — auto-sync its library.
      if (success === "epic" || success === "gog") pendingAutoSync.current = success;
      setTimeout(() => setLoginSuccess(null), 5000);
    }
    if (error) setLoginError(`Authentication failed: ${error}`);
    if (success || error) window.history.replaceState({}, "", "/providers");
    fetchProviders();
    // After an OAuth connect, poll briefly so auto-sync fires as soon as the
    // backend session reports the account connected (it may lag the redirect).
    if (pendingAutoSync.current) {
      let tries = 0;
      const iv = setInterval(() => {
        tries += 1;
        fetchProviders();
        if (tries >= 12 || !pendingAutoSync.current) clearInterval(iv);
      }, 2000);
    }
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

        // Auto-sync a provider that was just connected (after OAuth or Steam link).
        if (pendingAutoSync.current) {
          const pid = pendingAutoSync.current;
          const justConnected = enriched.find((p: Provider) => p.id === pid);
          if (justConnected?.loggedIn) {
            pendingAutoSync.current = null;
            handleSyncLibrary(pid);
          }
        }
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
    // Redirect to provider's OAuth page via our API route (Epic/GOG only).
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
    } catch {
    } finally {
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
    // Poll the backend session (source of truth) so the UI flips to "Connected"
    // as soon as the account is persisted — even if the WS push was missed.
    pendingAutoSync.current = "steam";
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      fetchProviders();
      if (tries >= 12) {
        clearInterval(iv);
        setLinking(false);
      }
    }, 2000);
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
        <p className="text-sm text-muted mt-1">Connect your gaming accounts to sync your library</p>
      </div>

      {!connected && (
        <div className="panel p-4 border border-warning/20 bg-warning/5 flex items-center gap-2">
          <WarningIcon className="w-4 h-4 text-warning shrink-0" />
          <p className="text-sm text-warning">Runtime offline — connect your cloud PC first to sync libraries</p>
        </div>
      )}

      {loginError && (
        <div className="panel p-4 border border-danger/20 bg-danger/5 flex items-center gap-2">
          <ErrorIcon className="w-4 h-4 text-danger shrink-0" />
          <p className="text-sm text-danger">{loginError}</p>
        </div>
      )}

      {loginSuccess && (
        <div className="panel p-4 border border-success/20 bg-success/5 flex items-center gap-2">
          <SuccessIcon className="w-4 h-4 text-success shrink-0" />
          <p className="text-sm text-success">{loginSuccess}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => (
          <div key={provider.id} className="panel p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl clay-inset flex items-center justify-center shrink-0">
                <ProviderLogo id={provider.id} className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{provider.name}</h3>
                  {provider.loggedIn ? (
                    <Badge tone="success">{CONNECTED_LABEL[provider.id] || "Connected"}</Badge>
                  ) : provider.method === "coming" ? (
                    <Badge tone="neutral">Coming Soon</Badge>
                  ) : (
                    <Badge tone="neutral">Not Connected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted truncate">{provider.description}</p>
              </div>
            </div>

            {provider.id === "steam" ? (
              // Steam uses one connect flow: steamcmd username/password, which
              // drives both library sync and cloud installs. No separate login.
              provider.loggedIn ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Account</span>
                    <span className="truncate max-w-[140px]">{provider.username || steamDisplayName || "Steam"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Games Owned</span>
                    <span>{provider.gameCount ?? "—"}</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant="secondary" className="flex-1 inline-flex items-center justify-center gap-1.5" onClick={() => handleSyncLibrary(provider.id)} disabled={syncing === provider.id}>
                      <SyncIcon className={`w-3.5 h-3.5 ${syncing === provider.id ? "animate-spin" : ""}`} />
                      {syncing === provider.id ? "Syncing..." : "Sync Library"}
                    </Button>
                    <Button size="sm" variant="danger" className="inline-flex items-center justify-center gap-1.5" onClick={() => handleLogout(provider.id)}>
                      <DisconnectIcon className="w-3.5 h-3.5" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : showSteamForm ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Steam login username"
                    value={steamUser}
                    onChange={(e) => setSteamUser(e.target.value)}
                    className="bg-secondary rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="password"
                    placeholder="Steam password"
                    value={steamPass}
                    onChange={(e) => setSteamPass(e.target.value)}
                    className="bg-secondary rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent"
                  />
                  <Button onClick={handleLinkSteam} disabled={!steamUser || !steamPass || linking || !connected}>
                    {linking ? "Connecting..." : "Connect Account"}
                  </Button>
                  {!connected && <p className="text-xs text-danger">Connect your cloud PC first before connecting.</p>}
                </div>
              ) : (
                <Button size="sm" className="w-full inline-flex items-center justify-center gap-2" onClick={() => setShowSteamForm(true)}>
                  <ConnectIcon className="w-4 h-4" />
                  {CONNECT_LABEL.steam}
                </Button>
              )
            ) : provider.loggedIn ? (
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
                  <Button size="sm" variant="secondary" className="flex-1 inline-flex items-center justify-center gap-1.5" onClick={() => handleSyncLibrary(provider.id)} disabled={syncing === provider.id}>
                    <SyncIcon className={`w-3.5 h-3.5 ${syncing === provider.id ? "animate-spin" : ""}`} />
                    {syncing === provider.id ? "Syncing..." : "Sync Library"}
                  </Button>
                  <Button size="sm" variant="danger" className="inline-flex items-center justify-center gap-1.5" onClick={() => handleLogout(provider.id)}>
                    <DisconnectIcon className="w-3.5 h-3.5" />
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : provider.method === "coming" ? (
              <Button size="sm" variant="secondary" className="w-full" disabled>
                Coming Soon
              </Button>
            ) : (
              <Button size="sm" className="w-full inline-flex items-center justify-center gap-2" onClick={() => handleOAuthLogin(provider.id)}>
                <ConnectIcon className="w-4 h-4" />
                {CONNECT_LABEL[provider.id] || `Connect ${provider.name} Account`}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="panel p-5">
        <h3 className="font-semibold mb-3">How Account Connection Works</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted">
          <div className="flex flex-col gap-2">
            <span className="text-accent font-mono">01</span>
            <p>Click Connect and sign in through the official provider (Steam, Epic, GOG) to link your account to KYRO CLOUD.</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-accent font-mono">02</span>
            <p>Sync your library — all your owned games appear in your Library tab, even before they are downloaded.</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-accent font-mono">03</span>
            <p>Click Install on any owned game — it downloads to your cloud PC while staying in your library.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
