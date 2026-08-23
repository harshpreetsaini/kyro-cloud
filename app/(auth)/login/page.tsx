"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/branding";
import { setToken, setSessionCookie } from "@/lib/auth/client";
import { loadFavorites } from "@/lib/favorites";
import { GoogleMark } from "@/components/ProviderLogo";

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
      router.push("/home");
    } else {
      setError("Invalid credentials");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6 animate-fade-in">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-14 h-14 rounded-2xl bg-accent glow-accent shadow-glow-primary flex items-center justify-center text-2xl font-display font-extrabold text-on-accent">
            K
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-muted">{APP_TAGLINE}</p>
        </div>

        <form onSubmit={submit} className="panel !rounded-3xl p-7 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted text-xs font-semibold uppercase tracking-wider">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="clay-inset rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted text-xs font-semibold uppercase tracking-wider">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="clay-inset rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="clay-btn bg-accent text-on-accent rounded-xl py-2.5 font-semibold hover:brightness-105 disabled:opacity-50 transition-all"
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
          className="panel flex items-center justify-center gap-2.5 rounded-xl py-3 font-medium hover:border-white/25 hover:brightness-110 transition-all"
        >
          <GoogleMark />
          Continue with Google
        </a>

        <p className="text-center text-[11px] text-muted">
          Private single-user system. Default credentials are set via environment variables.
        </p>
      </div>
    </div>
  );
}
