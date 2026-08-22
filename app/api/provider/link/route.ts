import { NextRequest, NextResponse } from "next/server";
import { initDb, getProfile, saveProfile, setProvider } from "@/lib/db.mjs";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/jwt";

const SERVICE_KEY = process.env.BACKEND_SERVICE_KEY || "";
const BACKEND_URL = process.env.BACKEND_URL || "https://kyro-cloud-3fp0.onrender.com";

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

async function relayToBackend(record: any) {
  try {
    await fetch(`${BACKEND_URL}/api/provider/link`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-service-key": SERVICE_KEY },
      body: JSON.stringify(record),
    });
  } catch (e) {
    console.error("[provider/link] backend relay failed:", (e as any)?.message);
  }
}

// Per-user provider links, stored in Vercel Postgres.
//  - Authenticated user POST: store under their account, then relay to the
//    Render backend so the cloud agent can install under that account.
//  - Backend service POST (x-service-key): persist under the `userId` the
//    backend supplies (the active WS user), without re-relaying.
export async function POST(req: NextRequest) {
  await ensureInit();
  const serviceKey = req.headers.get("x-service-key") || "";
  const isService = SERVICE_KEY && serviceKey === SERVICE_KEY;

  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  if (!body || !body.provider) {
    return NextResponse.json({ ok: false, error: "Missing provider" }, { status: 400 });
  }

  if (isService) {
    const userId = body.userId != null ? Number(body.userId) : null;
    if (userId == null) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    const record = {
      username: body.username || "",
      password: body.password || "",
      accountId: body.accountId || "",
      accessToken: body.accessToken || "",
      refreshToken: body.refreshToken || "",
      error: body.error || "",
      linkedAt: Date.now(),
    };
    await setProvider(userId, body.provider, record);
    return NextResponse.json({ ok: true });
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value || req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (!session || session.userId == null) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const record = {
    username: body.username || "",
    password: body.password || "",
    accountId: body.accountId || "",
    accessToken: body.accessToken || "",
    refreshToken: body.refreshToken || "",
    error: body.error || "",
    linkedAt: Date.now(),
  };
  await setProvider(session.userId, body.provider, record);
  // Relay to the cloud agent (backend) for this session's installs.
  await relayToBackend({ ...record, provider: body.provider });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  await ensureInit();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value || req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (!session || session.userId == null) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const providers = (await getProfile(session.userId)).providers || {};
  const provider = req.nextUrl.searchParams.get("provider");
  if (provider) {
    const rec = (providers as any)[provider];
    return NextResponse.json({
      ok: true,
      data: rec ? { username: rec.username, accountId: rec.accountId, linkedAt: rec.linkedAt, error: rec.error } : null,
    });
  }
  const publicView: Record<string, any> = {};
  for (const [k, v] of Object.entries(providers)) {
    if (v) publicView[k] = { username: (v as any).username, accountId: (v as any).accountId, linkedAt: (v as any).linkedAt, error: (v as any).error };
  }
  return NextResponse.json({ ok: true, data: publicView });
}
