"use client";

import { useEffect, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { runtimeStore, ensureConnected, runtimeAction, runtimeLaunchGame, runtimeStopGame, runtimeInstallGame, runtimeUninstallGame, runtimeCancelInstall, runtimeSend, dismiss, runtimeFetchApps, runtimeLaunchApp, runtimeStopApp, runtimeLinkProvider, runtimeSubmitGuard, isInstalled, isOwned, AppEntry } from "@/lib/runtime/store";
import { getToken } from "@/lib/auth/client";

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    ensureConnected();
    if (!getToken() && pathname !== "/login") router.replace("/login");
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
    isInstalled,
    isOwned,
    submitGuard: runtimeSubmitGuard,
    start: () => runtimeAction("start"),
    stop: () => runtimeAction("stop"),
    restart: () => runtimeAction("restart"),
    launchGame: runtimeLaunchGame,
    stopGame: runtimeStopGame,
    installGame: runtimeInstallGame,
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
