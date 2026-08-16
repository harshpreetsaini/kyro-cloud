"use client";

import { useEffect, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { runtimeStore, ensureConnected, runtimeAction, runtimeLaunchGame, runtimeSend, dismiss } from "@/lib/runtime/store";
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
    start: () => runtimeAction("start"),
    stop: () => runtimeAction("stop"),
    restart: () => runtimeAction("restart"),
    launchGame: runtimeLaunchGame,
    dismiss,
    send: runtimeSend,
  };
}
