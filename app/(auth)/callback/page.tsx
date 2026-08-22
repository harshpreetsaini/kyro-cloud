"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken, setSessionCookie } from "@/lib/auth/client";
import { loadFavorites } from "@/lib/favorites";
import { APP_NAME } from "@/lib/config/branding";

function GoogleCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    const token = params.get("token");
    const user = params.get("user");
    if (!token) {
      setStatus("Missing session token. Redirecting to sign in…");
      setTimeout(() => router.replace("/login"), 1500);
      return;
    }
    setToken(token);
    setSessionCookie(token);
    loadFavorites()
      .catch(() => {})
      .finally(() => {
        router.replace("/dashboard");
      });
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-accent glow-accent flex items-center justify-center text-2xl font-display font-bold">
          K
        </div>
        <h1 className="font-display text-xl tracking-tight">{APP_NAME}</h1>
        <p className="text-sm text-muted">{status}</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackInner />
    </Suspense>
  );
}
