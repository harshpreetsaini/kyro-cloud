"use client";

import { useState, useEffect } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { Button } from "@/components/ui";

export default function SteamGuardModal() {
  const { installGuard, submitGuard } = useRuntime();
  const [code, setCode] = useState("");

  useEffect(() => {
    if (installGuard) setCode("");
  }, [installGuard]);

  if (!installGuard) return null;

  const submit = () => {
    if (!code) return;
    submitGuard(code);
    setCode("");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="panel p-6 w-full max-w-md border-accent/40">
        <h3 className="font-semibold text-lg mb-1">Steam Guard code required</h3>
        <p className="text-sm text-muted mb-4">
          Steam sent a Guard code to your email / authenticator. Enter it below to continue.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Steam Guard code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bg-secondary rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <Button onClick={submit} disabled={!code}>
            Submit Code
          </Button>
        </div>
      </div>
    </div>
  );
}
