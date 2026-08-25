"use client";

import { useEffect, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { runtimeStore, ensureConnected, resetRuntime, runtimeAction, runtimeLaunchGame, runtimeStopGame, runtimeInstallGame, runtimeInstallApp, runtimeUninstallGame, runtimeCancelInstall, runtimeSend, dismiss, runtimeFetchApps, runtimeLaunchApp, runtimeStopApp, runtimeLinkProvider, runtimeSubmitGuard, runtimeCompleteProviderLogin, runtimeDismissLoginRequired, isInstalled, isOwned, AppEntry } from "@/lib/runtime/store";
import { getToken } from "@/lib/auth/client";

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    // Auth check is synchronous/local — never delay it.
    if (!getToken() && pathname !== "/login") router.replace("/login");
    // The WS handshake competes with page data on slow (mobile) radios —
    // start it once the browser is idle instead of on mount.
    const w = window as any;
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(() => ensureConnected(), { timeout: 2000 });
    else setTimeout(ensureConnected, 400);
  }, [pathname, router]);

  return <>{children}</>;
}

export function useRuntime() {
  const s = useSyncExternalStore(runtimeStore.subscribe, runtimeStore.getSnapshot, runtimeStore.getSnapshot);
  return {
    connected: s.connected,
    session: s.session,
    systemInfo: s.systemInfo,
    stats: s.stats,
    stream: s.stream,
    notifications: s.notifications,
    statsHistory: s.statsHistory,
    runningGames: s.runningGames,
    apps: s.apps,
    installProgress: s.installProgress,
    providerLinked: s.providerLinked,
    installGuard: s.installGuard,
    installedGames: s.installedGames,
    steamOwnedApps: s.steamOwnedApps,
    providerGames: s.providerGames,
    loginRequired: s.loginRequired,
    isInstalled,
    isOwned,
    submitGuard: runtimeSubmitGuard,
    completeProviderLogin: runtimeCompleteProviderLogin,
    dismissLoginRequired: runtimeDismissLoginRequired,
    resetRuntime,
    start: () => runtimeAction("start"),
    stop: () => runtimeAction("stop"),
    restart: () => runtimeAction("restart"),
    launchGame: runtimeLaunchGame,
    stopGame: runtimeStopGame,
    installGame: runtimeInstallGame,
    installApp: runtimeInstallApp,
    uninstallGame: runtimeUninstallGame,
    cancelInstall: runtimeCancelInstall,
    linkProvider: runtimeLinkProvider,
    launchApp: runtimeLaunchApp,
    stopApp: runtimeStopApp,
    fetchApps: runtimeFetchApps,
    dismiss,
    send: runtimeSend,
  };
}
