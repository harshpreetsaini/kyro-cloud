import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { initDb, getUserByEmail, createUserEmail, getOrCreateOwnerUser } from "@/lib/db.mjs";
import { signSession, SESSION_COOKIE } from "@/lib/auth/jwt";
import { hashPassword, verifyPassword, isStrongPassword, isValidEmail } from "@/lib/auth/password";

// Email + password authentication (no OTP): signup creates the central KYRO
// CLOUD account; login verifies against the stored scrypt hash. Both issue
// the exact same session JWT + httpOnly cookie as the Google flow.
let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

// Baseline per-IP rate limit (serverless-instance-local; a speed bump, not a fortress).
const hits = new Map<string, { n: number; reset: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    return false;
  }
  rec.n += 1;
  return rec.n > 10;
}

function pwOf(u: any): string | null {
  return u?.password_hash ?? (u as any)?.passwordHash ?? null;
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many attempts — wait a minute" }, { status: 429 });
  }

  let body: { email?: string; password?: string; intent?: string } = {};
  try {
    body = await req.json();
  } catch {}
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const intent = body.intent === "signup" ? "signup" : "login";

  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address" }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  let user: any = null;

  if (intent === "signup") {
    if (existing) {
      // An account already owns this email. Attaching a password to a
      // Google-registered account without proving ownership would be a
      // one-request account takeover — refuse and point at the real flow.
      return NextResponse.json(
        { ok: false, error: existing.google_sub
          ? "This email is registered with Google — use “Continue with Google”, then set a password in Settings while signed in."
          : "An account with this email already exists — sign in instead." },
        { status: 409 }
      );
    }
    const hash = hashPassword(password);
    user = await createUserEmail({ email, passwordHash: hash });
  } else {
    if (!existing || !pwOf(existing) || !verifyPassword(password, pwOf(existing))) {
      // Same message for unknown email and wrong password.
      return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
    }
    user = existing;
  }

  const token = await signSession(user.email || email, user.id);
  const res = NextResponse.json({
    ok: true,
    data: { token, userId: user.id, email: user.email, name: user.name },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
