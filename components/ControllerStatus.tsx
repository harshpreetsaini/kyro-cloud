"use client";

import { useEffect, useState } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Badge } from "@/components/ui";

export function ControllerStatus() {
  const { send } = useRuntime();
  const [connected, setConnected] = useState<string[]>([]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
      setConnected(pads.map((p) => p?.id || "Gamepad"));
      if (t - last > 50 && pads.length) {
        last = t;
        const p = pads[0]!;
        send("gamepad", {
          axes: Array.from(p.axes),
          buttons: p.buttons.map((b) => (b.pressed ? 1 : 0)),
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [send]);

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
