"use client";

import { useState } from "react";
import { api } from "@/lib/config/api";
import { authHeader } from "@/lib/auth/client";

export function ClipboardToolbar({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState<null | "get" | "set">(null);
  const [lastOp, setLastOp] = useState<string | null>(null);

  async function pullFromRemote() {
    setBusy("get");
    setLastOp(null);
    try {
      const res = await fetch(api("/api/clipboard"), { headers: { ...authHeader() } });
      const json = await res.json();
      if (json.ok && json.data?.text != null) {
        await navigator.clipboard.writeText(json.data.text);
        setLastOp("Pulled from remote");
      } else {
        setLastOp(json.error || "Failed to pull");
      }
    } catch (e) {
      setLastOp("Error: " + String(e));
    } finally {
      setBusy(null);
      setTimeout(() => setLastOp(null), 2000);
    }
  }

  async function pushToRemote() {
    setBusy("set");
    setLastOp(null);
    try {
      const text = await navigator.clipboard.readText();
      const res = await fetch(api("/api/clipboard"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      setLastOp(json.ok ? "Pushed to remote" : json.error || "Failed to push");
    } catch (e) {
      setLastOp("Error: " + String(e));
    } finally {
      setBusy(null);
      setTimeout(() => setLastOp(null), 2000);
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={pullFromRemote}
        disabled={busy !== null}
        className="text-xs px-2 py-1 rounded bg-secondary hover:bg-white/10 disabled:opacity-50 transition-colors"
        title="Pull clipboard from remote"
      >
        {busy === "get" ? "..." : "Paste ←"}
      </button>
      <button
        onClick={pushToRemote}
        disabled={busy !== null}
        className="text-xs px-2 py-1 rounded bg-secondary hover:bg-white/10 disabled:opacity-50 transition-colors"
        title="Push clipboard to remote"
      >
        {busy === "set" ? "..." : "Copy →"}
      </button>
      {lastOp && (
        <span className="text-[11px] text-muted">{lastOp}</span>
      )}
    </div>
  );
}
