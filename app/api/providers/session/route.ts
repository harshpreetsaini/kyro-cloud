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
  return NextResponse.json({ ok: true, data: result });
}
