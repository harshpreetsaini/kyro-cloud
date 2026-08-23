"use client";

import { useEffect, useRef } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { wsUrl } from "@/lib/config/api";
import { WebRTCViewer } from "./WebRTCViewer";
import { GStreamerViewer } from "./GStreamerViewer";
import { ClipboardToolbar } from "./ClipboardToolbar";
import { MonitorPlayIcon, MonitorIcon } from "@/components/icons";

export function RemoteDesktop({ className = "" }: { className?: string }) {
  const { stream } = useRuntime();
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);

  useEffect(() => {
    if (!stream || stream.type !== "vnc" || (stream as any).simulated) return;
    let cancelled = false;
    const url = stream.url && /^wss?:\/\//.test(stream.url)
      ? stream.url
      : wsUrl(stream.url || "/ws/stream");
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
      <div className={`flex flex-col items-center justify-center bg-black/60 text-center gap-2 text-muted text-sm px-6 ${className}`}>
        <div className="w-12 h-12 rounded-2xl clay-inset flex items-center justify-center">
          <MonitorPlayIcon className="w-6 h-6" />
        </div>
        <p className="font-medium text-text">No active cloud session</p>
        <p className="max-w-xs">Start your Cloud PC to access your remote desktop.</p>
      </div>
    );
  }

  if ((stream as any).simulated) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-bg text-center gap-3 ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center">
          <MonitorIcon className="w-8 h-8 text-accent" />
        </div>
        <p className="text-text font-medium">Simulated Desktop</p>
        <p className="text-xs text-muted max-w-xs">
          No real display is attached in this mode. Set COMPUTE_PROVIDER=local and install tigervnc + xfce4
          to stream an actual Linux desktop.
        </p>
      </div>
    );
  }

  if (stream.type === "gstreamer") {
    return (
      <div className={`flex flex-col ${className}`}>
        <GStreamerViewer
          streamUrl={stream.url || "/ws/stream"}
          className="flex-1 min-h-0"
        />
        <div className="flex items-center gap-2 px-2 py-1 bg-bg/80 border-t border-white/5">
          <ClipboardToolbar />
        </div>
      </div>
    );
  }

  if (stream.type === "webrtc") {
    return (
      <div className={`flex flex-col ${className}`}>
        <WebRTCViewer
          signalingUrl={stream.signalingUrl || "/ws/signal"}
          room={stream.room || "default"}
          iceServers={stream.iceServers}
          className="flex-1 min-h-0"
        />
        <div className="flex items-center gap-2 px-2 py-1 bg-bg/80 border-t border-white/5">
          <ClipboardToolbar />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div ref={containerRef} className="flex-1 min-h-0 w-full bg-black" />
      <div className="flex items-center gap-2 px-2 py-1 bg-bg/80 border-t border-white/5">
        <ClipboardToolbar />
      </div>
    </div>
  );
}
