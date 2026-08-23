"use client";

import { useEffect, useRef, useState } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Badge } from "@/components/ui";

// Event-driven controller status: no 60fps rAF loop. Input is forwarded on a
// fixed 50ms cadence only while a pad is actually connected.
export function ControllerStatus() {
  const { send } = useRuntime();
  const [connected, setConnected] = useState<string[]>([]);
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    const scan = () => {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
      setConnected((prev) => {
        const next = pads.map((p) => p?.id || "Gamepad");
        return prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next;
      });
      return pads;
    };

    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval == null) {
        interval = setInterval(() => {
          const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
          const p = pads[0];
          if (!p) return;
          // Only forward when there is actual input activity.
          const active = p.buttons.some((b) => b.pressed) || p.axes.some((a) => Math.abs(a) > 0.08);
          if (!active) return;
          sendRef.current("gamepad", {
            axes: Array.from(p.axes),
            buttons: p.buttons.map((b) => (b.pressed ? 1 : 0)),
          });
        }, 50);
      }
    };
    const stop = () => {
      if (interval != null) {
        clearInterval(interval);
        interval = null;
      }
    };

    scan();
    window.addEventListener("gamepadconnected", () => { scan(); start(); });
    window.addEventListener("gamepaddisconnected", () => { scan(); if (!(navigator.getGamepads ? Array.from(navigator.getGamepads()).some(Boolean) : false)) stop(); });
    // Handle the case where a pad was already connected before mount.
    if (navigator.getGamepads && Array.from(navigator.getGamepads()).some(Boolean)) start();

    return () => stop();
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span>Controller</span>
      {connected.length ? (
        <Badge tone="success">Connected ({connected.length})</Badge>
      ) : (
        <Badge tone="neutral">No Controller Detected</Badge>
      )}
    </div>
  );
}
