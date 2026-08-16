import { NextRequest, NextResponse } from "next/server";
import { signSession, SESSION_COOKIE } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {}

  const user = process.env.LUNA_USER || "owner";
  const pass = process.env.LUNA_PASSWORD || "change-me";
  if (body.username !== user || body.password !== pass) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }
  const token = await signSession(user);
  const res = NextResponse.json({ ok: true, data: { user, token } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
