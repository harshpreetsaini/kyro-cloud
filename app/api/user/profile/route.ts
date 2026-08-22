import { NextRequest, NextResponse } from "next/server";
import { initDb, getProfile, saveProfile, getUserById } from "@/lib/db.mjs";
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
  if (!session || session.userId == null) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const profile = await getProfile(session.userId);
  const account = await getUserById(session.userId);
  return NextResponse.json({
    ok: true,
    data: {
      user: account
        ? {
            id: account.id,
            email: account.email,
            name: account.name,
            avatar: account.avatar,
            method: account.google_sub ? "google" : "password",
          }
        : null,
      profile,
    },
  });
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value || req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (!session || session.userId == null) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const patch: any = {};
  if (body.favorites !== undefined) patch.favorites = body.favorites;
  if (body.providers !== undefined) patch.providers = body.providers;
  if (body.installedGames !== undefined) patch.installed_games = body.installedGames;
  if (body.library !== undefined) patch.library = body.library;
  if (body.settings !== undefined) patch.settings = body.settings;
  const next = await saveProfile(session.userId, patch);
  return NextResponse.json({ ok: true, data: next });
}
