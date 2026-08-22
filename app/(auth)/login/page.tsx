"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/branding";
import { setToken, setSessionCookie } from "@/lib/auth/client";
import { loadFavorites } from "@/lib/favorites";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    let data: { data?: { token?: string } } = {};
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    try {
      data = await res.json();
    } catch {}
    if (res.ok && data.data?.token) {
      setToken(data.data.token);
      setSessionCookie(data.data.token);
      await loadFavorites();
      router.push("/dashboard");
    } else {
      setError("Invalid credentials");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm flex flex-col gap-6 animate-fade-in">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-accent glow-accent flex items-center justify-center text-2xl font-display font-bold">
            K
          </div>
          <h1 className="font-display text-2xl tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-muted">{APP_TAGLINE}</p>
        </div>

        <form onSubmit={submit} className="panel p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-secondary rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white rounded-lg py-2 font-medium hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="flex items-center gap-3 text-muted text-xs">
          <div className="h-px flex-1 bg-white/10" />
          or
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-2 panel border border-white/10 rounded-lg py-2.5 font-medium hover:border-white/25"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 16.3 4.5 9.7 9 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 43.5c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 34.6 26.7 35.5 24 35.5c-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9.5 39 16.1 43.5 24 43.5z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 35.8 43.5 30.3 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
          </svg>
          Continue with Google
        </a>

        <p className="text-center text-[11px] text-muted">
          Private single-user system. Default credentials are set via environment variables.
        </p>
      </div>
    </div>
  );
}
