"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RemoteDesktop } from "@/components/RemoteDesktop";
import { PerfOverlay } from "@/components/PerfOverlay";
import { Button } from "@/components/ui";

export default function SessionPage() {
  const [overlay, setOverlay] = useState(false);
  const [controls, setControls] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setControls(false), 4000);
    return () => clearTimeout(t);
  }, []);

  function goFullscreen() {
    document.documentElement.requestFullscreen?.();
  }

  return (
    <div className="fixed inset-0 bg-black z-40" onMouseMove={() => setControls(true)}>
      <RemoteDesktop className="absolute inset-0" />
      <PerfOverlay visible={overlay} />
      {controls && (
        <div className="absolute top-3 right-3 flex gap-2 z-50 animate-fade-in">
          <Button variant="ghost" className="!py-1 !px-3 text-xs" onClick={() => setOverlay((v) => !v)}>
            Performance
          </Button>
          <Button variant="ghost" className="!py-1 !px-3 text-xs" onClick={goFullscreen}>
            Fullscreen
          </Button>
          <Link href="/dashboard">
            <Button variant="danger" className="!py-1 !px-3 text-xs">
              Exit
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
