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
  loggedIn: boolean;
  username?: string;
  gameCount?: number;
  method: "oauth" | "coming";
  installMethod: string;
}

const PROVIDERS: Omit<Provider, "loggedIn" | "username" | "gameCount" | "method" | "installMethod">[] = [
  { id: "steam", name: "Steam", description: "Valve's gaming platform — 50,000+ games" },
  { id: "epic", name: "Epic Games", description: "Epic Games Store — exclusives + free weekly games" },
  { id: "gog", name: "GOG", description: "DRM-free games — you own what you buy" },
  { id: "ubisoft", name: "Ubisoft Connect", description: "Assassin's Creed, Far Cry, Rainbow Six" },
  { id: "ea", name: "EA App", description: "FIFA, Battlefield, Need for Speed, Jedi" },
  { id: "xbox", name: "Xbox / Game Pass", description: "Game Pass library — hundreds of games" },
  { id: "battle", name: "Battle.net", description: "Diablo, WoW, Overwatch, StarCraft" },
  { id: "riot", name: "Riot Client", description: "League of Legends, Valorant, TFT" },
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
  const [showDeviceLink, setShowDeviceLink] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [dlUrl, setDlUrl] = useState<string | null>(null);
  const [dlCode, setDlCode] = useState("");
  const [dlError, setDlError] = useState<string | null>(null);
  const pendingAutoSync = useRef<string | null>(null);
  const linkIvRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    let oauthIv: ReturnType<typeof setInterval> | null = null;
    if (pendingAutoSync.current) {
      let tries = 0;
      oauthIv = setInterval(() => {
        tries += 1;
        fetchProviders();
        if (tries >= 12 || !pendingAutoSync.current) {
          if (oauthIv) clearInterval(oauthIv);
          oauthIv = null;
        }
      }, 2000);
    }
    return () => {
      if (oauthIv) clearInterval(oauthIv);
      if (linkIvRef.current) clearInterval(linkIvRef.current);
    };
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
        setProviders(PROVIDERS.map((p) => ({ ...p, loggedIn: false, method: ["steam","epic","gog"].includes(p.id) ? "oauth" as const : "coming" as const, installMethod: p.id === "steam" ? "steamcmd" : p.id === "epic" ? "legendary" : "lgogdownloader" })));
      }
    } catch {
      setProviders(PROVIDERS.map((p) => ({ ...p, loggedIn: false, method: ["steam","epic","gog"].includes(p.id) ? "oauth" as const : "coming" as const, installMethod: p.id === "steam" ? "steamcmd" : p.id === "epic" ? "legendary" : "lgogdownloader" })));
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

  // ── Epic device-link (account linking without an Epic OAuth app) ──
  const deviceLinkStart = async () => {
    setDlBusy(true);
    setDlError(null);
    try {
      const res = await fetch("/api/providers/epic/devicelink", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (data.ok && data.data?.loginUrl) {
        setDlUrl(data.data.loginUrl as string);
        window.open(data.data.loginUrl, "_blank", "noopener");
      } else {
        setDlError(data.error || "Could not get a login link — is your cloud PC connected?");
      }
    } catch {
      setDlError("Network error");
    } finally {
      setDlBusy(false);
    }
  };

  const deviceLinkComplete = async () => {
    if (!dlCode.trim()) return;
    setDlBusy(true);
    setDlError(null);
    try {
      pendingAutoSync.current = "epic";
      const res = await fetch("/api/providers/epic/devicelink", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({ action: "complete", code: dlCode.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowDeviceLink(false);
        setDlUrl(null);
        setDlCode("");
        setLoginSuccess("Epic Games — Connected");
        setTimeout(() => setLoginSuccess(null), 5000);
        // Refresh immediately so the card flips to Connected and the pending
        // auto-sync fires — nothing else polls after a device link.
        fetchProviders();
      } else {
        pendingAutoSync.current = null;
        setDlError(typeof data.error === "string" ? data.error : "Link failed — check the code and retry.");
      }
    } catch {
      pendingAutoSync.current = null;
      setDlError("Network error");
    } finally {
      setDlBusy(false);
    }
  };

  const handleLogout = async (providerId: string) => {
    setSyncing(providerId);
    try {
      const res = await fetch("/api/providers/logout", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({ providerId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setLoginError(j.error || `Disconnect failed (${res.status})`);
      }
    } catch {
      setLoginError("Disconnect failed — network error");
    } finally {
      setSyncing(null);
    }
    fetchProviders();
  };

  const handleLinkSteam = async () => {
    if (!steamUser || !steamPass || linking) return;
    setLinking(true);
    setLoginError(null);
    try {
      // 1) Persist the connection to the KYRO backend FIRST. This works with
      //    or without the cloud PC — the account is durable from this moment.
      const res = await fetch("/api/provider/link", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({ provider: "steam", username: steamUser, password: steamPass }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setLoginError(j?.error || "Could not save the Steam connection.");
        setLinking(false);
        return;
      }
      // 2) If the runtime is attached, run the interactive steamcmd login now
      //    (this triggers Valve's verification email). Otherwise it runs
      //    automatically the next time the Cloud PC boots.
      if (connected) linkProvider("steam", steamUser, steamPass);
      setLoginSuccess(
        connected
          ? "Steam account saved — enter the verification code if prompted."
          : "Steam account saved — it will be verified automatically when your Cloud PC starts."
      );
      setTimeout(() => setLoginSuccess(null), 6000);
      setShowSteamForm(false);
      setSteamUser("");
      setSteamPass("");
      // 3) Poll the backend session (source of truth) so the card flips to
      //    "Connected" immediately — even if the WS push was missed.
      pendingAutoSync.current = "steam";
      let tries = 0;
      if (linkIvRef.current) clearInterval(linkIvRef.current);
      linkIvRef.current = setInterval(() => {
        tries += 1;
        fetchProviders();
        if (tries >= 12) {
          if (linkIvRef.current) clearInterval(linkIvRef.current);
          linkIvRef.current = null;
          setLinking(false);
        }
      }, 2000);
    } catch {
      setLoginError("Network error — could not save the Steam connection.");
      setLinking(false);
    }
  };

  // Epic uses device/account linking as THE connect flow (no OAuth redirect):
  // open the panel and immediately request a login link from the runtime.
  const openEpicDeviceLink = () => {
    setDlError(null);
    setShowDeviceLink(true);
    if (!dlUrl && !dlBusy) deviceLinkStart();
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
          <p className="text-sm text-warning">
            Runtime offline — you can still connect accounts. Libraries sync, verification and installs run once it starts.
          </p>
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
            ) : provider.id === "epic" ? (
              // Epic uses device/account linking — never the OAuth redirect.
              <div className="flex flex-col gap-2">
                <Button size="sm" className="w-full inline-flex items-center justify-center gap-2" onClick={openEpicDeviceLink} disabled={dlBusy}>
                  <ConnectIcon className="w-4 h-4" />
                  {CONNECT_LABEL.epic}
                </Button>
                {showDeviceLink && (
                  <div className="clay-inset rounded-xl p-3 flex flex-col gap-2 text-xs">
                    {!dlUrl ? (
                      <>
                        <p className="text-muted">{dlBusy ? "Opening the Epic device link…" : dlError || "Get a login link from Epic to continue."}</p>
                        <Button size="sm" variant="secondary" onClick={deviceLinkStart} disabled={dlBusy}>
                          {dlBusy ? "Contacting runtime…" : "1. Get Epic Login Link"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-muted">
                          2. Sign in at the opened tab, then copy the{" "}
                          <span className="text-accent font-mono">authorizationCode</span> value Epic shows.
                        </p>
                        <a href={dlUrl} target="_blank" rel="noopener noreferrer" className="text-accent break-all line-clamp-2">
                          Reopen login page ↗
                        </a>
                        <input
                          value={dlCode}
                          onChange={(e) => setDlCode(e.target.value)}
                          placeholder="Paste authorizationCode here"
                          className="bg-bg/60 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent font-mono"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={deviceLinkComplete} disabled={dlBusy || !dlCode.trim()} className="flex-1">
                            {dlBusy ? "Linking…" : "3. Link Account"}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={deviceLinkStart} disabled={dlBusy}>
                            New code
                          </Button>
                        </div>
                      </>
                    )}
                    {dlError && <p className="text-danger">{dlError}</p>}
                  </div>
                )}
                {!connected && (
                  <p className="text-xs text-muted">Your Cloud PC must be running for the device link.</p>
                )}
              </div>
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
                  <Button onClick={handleLinkSteam} disabled={!steamUser || !steamPass || linking}>
                    {linking ? "Connecting..." : "Connect Account"}
                  </Button>
                  {!connected && (
                    <p className="text-xs text-muted">
                      Cloud PC is offline — the account is saved now and verified automatically when it starts.
                    </p>
                  )}
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
              <div className="flex flex-col gap-2">
                <Button size="sm" className="w-full inline-flex items-center justify-center gap-2" onClick={() => handleOAuthLogin(provider.id)}>
                  <ConnectIcon className="w-4 h-4" />
                  {CONNECT_LABEL[provider.id] || `Connect ${provider.name} Account`}
                </Button>
              </div>
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
