"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  RuntimeState,
  SessionInfo,
  SystemInfo,
  SystemStats,
  StreamClientConfig,
  WSEvent,
} from "@shared/types";
import { api, wsUrl } from "@/lib/config/api";
import { getToken, authHeader } from "@/lib/auth/client";

export interface Notification {
  id: string;
  message: string;
  level: "info" | "success" | "warning" | "error";
}

interface RuntimeContextValue {
  connected: boolean;
  session: SessionInfo | null;
  systemInfo: SystemInfo | null;
  stats: SystemStats | null;
  stream: StreamClientConfig | null;
  notifications: Notification[];
  statsHistory: SystemStats[];
  start: () => void;
  stop: () => void;
  restart: () => void;
  launchGame: (id: string) => void;
  dismiss: (id: string) => void;
  send: (type: string, payload: unknown) => void;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [stream, setStream] = useState<StreamClientConfig | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [statsHistory, setStatsHistory] = useState<SystemStats[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const retry = useRef<number>(0);

  const dismiss = useCallback((id: string) => {
    setNotifications((n) => n.filter((x) => x.id !== id));
  }, []);

  const pushNotification = useCallback((message: string, level: Notification["level"]) => {
    const id = Math.random().toString(36).slice(2);
    setNotifications((n) => [...n.slice(-4), { id, message, level }]);
    setTimeout(() => dismiss(id), 6000);
  }, [dismiss]);

  useEffect(() => {
    const pathname = usePathname();
    const router = useRouter();
    if (!getToken() && pathname !== "/login") {
      router.replace("/login");
    }
  }, []);

  useEffect(() => {
    let closed = false;
    const connect = () => {
      const token = getToken();
      const ws = new WebSocket(wsUrl("/ws") + (token ? `?token=${encodeURIComponent(token)}` : ""));
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        retry.current = 0;
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          retry.current += 1;
          setTimeout(connect, Math.min(1000 * retry.current, 5000));
        }
      };
      ws.onmessage = (ev) => {
        let event: WSEvent;
        try {
          event = JSON.parse(ev.data);
        } catch {
          return;
        }
        switch (event.type) {
          case "runtime.status":
            setSession(event.payload as SessionInfo);
            break;
          case "runtime.progress":
            setSession((s) => (s ? { ...s, progress: event.payload as SessionInfo["progress"] } : s));
            break;
          case "system.info":
            setSystemInfo(event.payload as SystemInfo);
            break;
          case "system.stats":
            setStats(event.payload as SystemStats);
            setStatsHistory((h) => [...h.slice(-59), event.payload as SystemStats]);
            break;
          case "stream.status":
            setStream(event.payload as StreamClientConfig);
            break;
          case "notification":
            pushNotification(
              (event.payload as { message: string }).message,
              (event.payload as { level: Notification["level"] }).level
            );
            break;
          default:
            break;
        }
      };
    };
    connect();
    return () => {
      closed = true;
      wsRef.current?.close();
    };
  }, [pushNotification]);

  const action = useCallback(async (path: string) => {
    await fetch(api(`/api/runtime/${path}`), {
      method: "POST",
      headers: { ...authHeader() },
    });
  }, []);

  const start = useCallback(() => action("start"), [action]);
  const stop = useCallback(() => action("stop"), [action]);
  const restart = useCallback(() => action("restart"), [action]);

  const launchGame = useCallback((id: string) => {
    fetch(api("/api/games/launch"), {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeader() },
      body: JSON.stringify({ id }),
    });
  }, []);

  const send = useCallback((type: string, payload: unknown) => {
    wsRef.current?.send(JSON.stringify({ type, payload, ts: Date.now() }));
  }, []);

  return (
    <RuntimeContext.Provider
      value={{
        connected,
        session,
        systemInfo,
        stats,
        stream,
        notifications,
        statsHistory,
        start,
        stop,
        restart,
        launchGame,
        dismiss,
        send,
      }}
    >
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime() {
  const ctx = useContext(RuntimeContext);
  if (!ctx) throw new Error("useRuntime must be used within RuntimeProvider");
  return ctx;
}
