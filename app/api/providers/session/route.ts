import { NextRequest, NextResponse } from "next/server";
import { initDb, getProfile } from "@/lib/db.mjs";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/jwt";

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

// The Render backend is the runtime source of truth for linked provider
// accounts — it persists them to disk immediately on a successful link
// (independent of the browser session). Fall back to it so the UI shows
// "Linked" even when the Neon write hasn't happened yet (or activeUserId
// was not attributed at link time).
const BACKEND_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://kyro-cloud-3fp0.onrender.com").replace(/^ws/, "http");

async function backendLinked(id: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};
    const svc = process.env.BACKEND_SERVICE_KEY;
    if (svc) headers["x-service-key"] = svc;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`${BACKEND_BASE}/api/provider/link?provider=${encodeURIComponent(id)}`, { headers, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    const d = j.data;
    if (d && (d.username || d.accountId)) return d.username || d.accountId;
  } catch {}
  return null;
}

export async function GET(req: NextRequest) {
  await ensureInit();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value || req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  const providers = ["steam", "epic", "gog"];
  const result: Record<string, { loggedIn: boolean; username?: string }> = {};

  if (session && session.userId != null) {
    try {
      const profile = await getProfile(session.userId);
      const stored = (profile.providers || {}) as Record<string, any>;
      for (const id of providers) {
        const acc = stored[id];
        result[id] = acc && (acc.username || acc.accountId)
          ? { loggedIn: true, username: acc.username || acc.accountId }
          : { loggedIn: false };
      }
      // Backend fallback for any provider not found in Neon.
      await Promise.all(
        providers.map(async (id) => {
          if (!result[id].loggedIn) {
            const u = await backendLinked(id);
            if (u) result[id] = { loggedIn: true, username: u };
          }
        })
      );
      return NextResponse.json({ ok: true, data: result });
    } catch {}
  }

  // Fallback: provider web-session cookies (OAuth providers that set one).
  for (const id of providers) {
    const cookie = req.cookies.get(`provider_${id}`);
    if (cookie?.value) {
      try {
        const s = JSON.parse(cookie.value);
        result[id] = { loggedIn: true, username: s.displayName || s.username || s.name || s.steamId || id };
      } catch {
        result[id] = { loggedIn: false };
      }
    } else {
      result[id] = { loggedIn: false };
    }
  }
  // Backend fallback when no Neon session is available.
  await Promise.all(
    providers.map(async (id) => {
      if (!result[id].loggedIn) {
        const u = await backendLinked(id);
        if (u) result[id] = { loggedIn: true, username: u };
      }
    })
  );
  return NextResponse.json({ ok: true, data: result });
}
