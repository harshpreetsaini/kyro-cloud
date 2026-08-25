"use client";

import { useState, useEffect, useRef } from "react";
import { useRuntime } from "@/components/providers/RuntimeProvider";
import { authHeader } from "@/lib/auth/client";
import { Button } from "@/components/ui";

// Shown when the runtime reports a provider login is required to continue a
// download (Epic via legendary). Completing the device link replays the
// blocked install automatically.
export default function EpicLoginModal() {
  const { loginRequired, completeProviderLogin, dismissLoginRequired, connected } = useRuntime();
  const [url, setUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const open = loginRequired === "epic";

  useEffect(() => {
    if (open) {
      setUrl(null);
      setCode("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  // Auto-fetch the device link as soon as the modal opens.
  useEffect(() => {
    if (!open || url || busy) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/providers/epic/devicelink", {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeader() },
          body: JSON.stringify({ action: "start" }),
        });
        const j = await res.json().catch(() => null);
        if (cancelled) return;
        if (j?.ok && j.data?.loginUrl) {
          setUrl(j.data.loginUrl as string);
          window.open(j.data.loginUrl, "_blank", "noopener");
        } else {
          setError(j?.error || "Could not reach the runtime for a login link.");
        }
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    const c = code.trim();
    if (!c) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/providers/epic/devicelink", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeader() },
        body: JSON.stringify({ action: "complete", code: c }),
      });
      const j = await res.json().catch(() => null);
      if (j?.ok) {
        // Clears the prompt and resumes the blocked download.
        completeProviderLogin("epic");
      } else {
        setError(typeof j?.error === "string" ? j.error : "Link failed — check the code and retry.");
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Epic Games login required"
    >
      <div ref={dialogRef} className="panel p-6 w-full max-w-md border-accent/40 flex flex-col gap-3">
        <h3 className="font-semibold text-lg">Connect Epic Games to download</h3>
        {!connected ? (
          <>
            <p className="text-sm text-muted">
              Your Cloud PC is offline. Start it first, then retry the download.
            </p>
            <Button variant="secondary" onClick={dismissLoginRequired}>Close</Button>
          </>
        ) : (
          <>
            <ol className="text-sm text-muted flex flex-col gap-1.5 list-decimal list-inside">
              <li>Sign in at the opened Epic tab.</li>
              <li>
                Copy the <span className="text-accent font-mono text-xs">authorizationCode</span> value shown there.
              </li>
              <li>Paste it below — the download continues automatically.</li>
            </ol>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent text-xs break-all line-clamp-2 underline underline-offset-2">
                Reopen login page ↗
              </a>
            )}
            {error && !url && <p className="text-xs text-danger">{error}</p>}
            {url && (
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <input
                  type="text"
                  placeholder="authorizationCode"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  className="bg-secondary rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent flex-1 font-mono text-sm"
                  autoFocus
                />
                <Button onClick={submit} disabled={!code.trim() || busy}>
                  {busy ? "Linking…" : "Link & Download"}
                </Button>
              </div>
            )}
            {(error || url === null) && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">{busy ? "Contacting your Cloud PC…" : ""}</span>
                <button onClick={() => dismissLoginRequired()} className="text-[11px] text-muted hover:text-accent underline underline-offset-2 ml-auto">
                  Not now
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
