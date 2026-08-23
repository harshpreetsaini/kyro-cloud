import { NextRequest, NextResponse } from "next/server";
import { initDb, removeProvider } from "@/lib/db.mjs";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/jwt";

const BACKEND_URL = process.env.BACKEND_URL || "https://kyro-cloud-3fp0.onrender.com";

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

// Disconnect a provider account: deletes the durable Neon record for the
// logged-in user, tells the Render backend to drop its cache + wipe the
// agent's stored credentials, and broadcasts the state change so every open
// UI flips to "Connect … Account" immediately.
export async function POST(req: NextRequest) {
  await ensureInit();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value || req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (!session || session.userId == null) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const providerId = body.providerId;
  if (!providerId || !["steam", "epic", "gog"].includes(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider" }, { status: 400 });
  }

  // 1. Remove from the durable profile store.
  await removeProvider(session.userId, providerId);

  // 2. Backend relay: clear in-memory cache + agent creds + broadcast logout.
  const svc = process.env.BACKEND_SERVICE_KEY;
  let backendOk = true;
  if (svc) {
    try {
      const r = await fetch(`${BACKEND_URL}/api/provider/link?provider=${encodeURIComponent(providerId)}`, {
        method: "DELETE",
        headers: { "x-service-key": svc },
        signal: AbortSignal.timeout(8000),
      });
      backendOk = r.ok;
    } catch {
      backendOk = false; // non-fatal — Neon is already updated and is source of truth
    }
  }

  const response = NextResponse.json({ ok: true, data: { provider: providerId, backendOk } });
  response.cookies.set(`provider_${providerId}`, "", { path: "/", maxAge: 0 });
  return response;
}
