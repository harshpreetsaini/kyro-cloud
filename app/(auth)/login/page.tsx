"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/branding";

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
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
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
            L
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
        <p className="text-center text-[11px] text-muted">
          Private single-user system. Default credentials are set via environment variables.
        </p>
      </div>
    </div>
  );
}
