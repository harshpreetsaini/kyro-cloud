import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { initDb, getOrCreateOwnerUser } from "@/lib/db.mjs";
import { signSession, SESSION_COOKIE } from "@/lib/auth/jwt";

// Password login for the single owner account. Issues a session JWT whose
// `userId` references the owner row in Vercel Postgres, so profiles/favorites
// are shared with the rest of the account system.
let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

function safeEqStr(a: string, b: string): boolean {
  const ab = Buffer.from(String(a ?? ""));
  const bb = Buffer.from(String(b ?? ""));
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  let body: { username?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {}
  const user = process.env.LUNA_USER || "owner";
  // Fail closed: without LUNA_PASSWORD set, password login is disabled.
  const pass = process.env.LUNA_PASSWORD || "";
  if (!pass || !safeEqStr(body.username || "", user) || !safeEqStr(body.password || "", pass)) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }
  const owner = await getOrCreateOwnerUser();
  const token = await signSession(user, owner.id);
  const res = NextResponse.json({ ok: true, data: { user, token, userId: owner.id } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
