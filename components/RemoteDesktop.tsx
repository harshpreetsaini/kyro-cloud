"use client";

import { useEffect, useRef } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { APP_NAME } from "@/lib/config/branding";

export function RemoteDesktop({ className = "" }: { className?: string }) {
  const { stream } = useRuntime();
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);

  useEffect(() => {
    if (!stream || stream.type !== "vnc" || (stream as any).simulated) return;
    let cancelled = false;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}${stream.url}`;
    import("@novnc/novnc/lib/rfb").then((mod: any) => {
      if (cancelled || !containerRef.current) return;
      const RFB = mod.default || mod;
      const rfb = new RFB(containerRef.current, url, {
        credentials: { password: stream.password || "" },
        shared: true,
      });
      rfb.scaleViewport = true;
      rfb.resizeSession = false;
      rfbRef.current = rfb;
    });
    return () => {
      cancelled = true;
      try {
        rfbRef.current?.disconnect();
      } catch {}
      rfbRef.current = null;
    };
  }, [stream]);

  if (!stream) {
    return (
      <div className={`flex items-center justify-center bg-black/60 text-muted text-sm ${className}`}>
        No active stream. Start a session to see your desktop.
      </div>
    );
  }

  if ((stream as any).simulated) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-bg text-center gap-3 ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center text-2xl">🖥</div>
        <p className="text-text font-medium">Simulated Desktop</p>
        <p className="text-xs text-muted max-w-xs">
          No real display is attached in this mode. Set COMPUTE_PROVIDER=local and install tigervnc + xfce4
          to stream an actual Linux desktop.
        </p>
      </div>
    );
  }

  if (stream.type === "webrtc") {
    return (
      <div className={`flex items-center justify-center bg-black text-center gap-2 text-sm text-muted ${className}`}>
        WebRTC (Selkies) stream — connect the Colab agent to receive signaling.
      </div>
    );
  }

  return <div ref={containerRef} className={`w-full h-full bg-black ${className}`} />;
}
