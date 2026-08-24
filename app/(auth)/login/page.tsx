"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/branding";
import { setToken, setSessionCookie } from "@/lib/auth/client";
import { loadFavorites } from "@/lib/favorites";
import { GoogleMark } from "@/components/ProviderLogo";

type Mode = "menu" | "email" | "owner";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("menu");
  const [emailSignup, setEmailSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function finish(data: { data?: { token?: string } }) {
    if (data.data?.token) {
      setToken(data.data.token);
      setSessionCookie(data.data.token);
      await loadFavorites();
      router.push("/home");
      return true;
    }
    return false;
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, intent: emailSignup ? "signup" : "login" }),
      });
      const data = await res.json().catch(() => ({}));
      if (await finish(data)) return;
      setError(typeof data.error === "string" ? data.error : res.status === 409 ? "Account exists — switch to Sign In." : "Could not sign in. Check your details.");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function submitOwner(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let data: { data?: { token?: string } } = {};
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      try {
        data = await res.json();
      } catch {}
      if (await finish(data)) return;
      setError("Invalid credentials");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "clay-inset rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-accent w-full";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-5 animate-fade-in">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-14 h-14 rounded-2xl bg-accent glow-accent shadow-glow-primary flex items-center justify-center text-2xl font-display font-extrabold text-on-accent">
            K
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-muted">{APP_TAGLINE}</p>
        </div>

        <div className="panel !rounded-3xl p-7 flex flex-col gap-4">
          {mode === "menu" && (
            <>
              {/* Google */}
              <a
                href="/api/auth/google"
                className="panel flex items-center justify-center gap-2.5 rounded-xl py-3 font-medium hover:border-white/25 hover:brightness-110 transition-all"
              >
                <GoogleMark />
                Continue with Google
              </a>

              {/* Email */}
              <button
                onClick={() => setMode("email")}
                className="clay-btn bg-secondary border border-white/5 rounded-xl py-3 font-medium hover:bg-surface-bright transition-all inline-flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Continue with Email
              </button>

              <button onClick={() => setMode("owner")} className="text-[11px] text-muted hover:text-accent underline underline-offset-2">
                Owner sign-in
              </button>
            </>
          )}

          {mode === "email" && (
            <form onSubmit={submitEmail} className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{emailSignup ? "Create your account" : "Welcome back"}</p>
                <button type="button" onClick={() => setMode("menu")} aria-label="Back" className="text-muted hover:text-text">
                  ←
                </button>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted text-xs font-semibold uppercase tracking-wider">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputCls}
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted text-xs font-semibold uppercase tracking-wider">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={emailSignup ? "At least 8 characters" : "Your password"}
                  autoComplete={emailSignup ? "new-password" : "current-password"}
                  className={inputCls}
                />
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="clay-btn bg-accent text-on-accent rounded-xl py-2.5 font-semibold hover:brightness-105 disabled:opacity-50 transition-all"
              >
                {loading ? "Please wait…" : emailSignup ? "Create Account" : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => { setEmailSignup((v) => !v); setError(""); }}
                className="text-xs text-muted hover:text-accent"
              >
                {emailSignup ? "Already have an account? Sign in" : "New here? Create an account"}
              </button>
            </form>
          )}

          {mode === "owner" && (
            <form onSubmit={submitOwner} className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Owner sign-in</p>
                <button type="button" onClick={() => setMode("menu")} aria-label="Back" className="text-muted hover:text-text">
                  ←
                </button>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted text-xs font-semibold uppercase tracking-wider">Username</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} autoFocus />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted text-xs font-semibold uppercase tracking-wider">Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
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
          )}
        </div>

        <p className="text-center text-[11px] text-muted leading-relaxed">
          Your KYRO CLOUD account is the hub for your library, favorites and connected stores.
        </p>
      </div>
    </div>
  );
}
