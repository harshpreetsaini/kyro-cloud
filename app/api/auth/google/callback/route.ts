import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { initDb, upsertUserByGoogle } from "@/lib/db.mjs";
import { signSession, SESSION_COOKIE } from "@/lib/auth/jwt";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function jwks() {
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(GOOGLE_CERTS_URL));
  return _jwks;
}

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function GET(req: NextRequest) {
  await ensureInit();
  const origin = new URL(req.url).origin;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") || "";
  const cookieState = req.cookies.get("google_state")?.value;

  if (!code) {
    return NextResponse.redirect(`${origin}/callback?error=${encodeURIComponent("Missing authorization code from Google.")}`);
  }
  // CSRF state is MANDATORY — an attacker-supplied URL cannot opt out by
  // omitting the parameter.
  if (!cookieState || !state || cookieState !== state) {
    return NextResponse.redirect(`${origin}/callback?error=${encodeURIComponent("Invalid or missing state parameter (possible CSRF).")}`);
  }
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    const tokenJson = await tokenRes.json();
    const idToken = tokenJson.id_token;
    if (!idToken) throw new Error(tokenJson.error_description || "No id_token returned by Google");
    const { payload } = await jwtVerify(idToken, jwks(), {
      issuer: "https://accounts.google.com",
      audience: GOOGLE_CLIENT_ID,
    });
    const u = await upsertUserByGoogle({
      googleSub: String(payload.sub),
      email: (payload.email as string) || "",
      name: (payload.name as string) || "",
      avatar: (payload.picture as string) || "",
    });
    const token = await signSession((payload.email as string) || u.email || "google", u.id);
    const res = NextResponse.redirect(`${origin}/callback?token=${encodeURIComponent(token)}&user=${encodeURIComponent((payload.email as string) || u.email || "google")}`);
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e: any) {
    return NextResponse.redirect(`${origin}/callback?error=${encodeURIComponent("Google sign-in failed: " + (e?.message || "unknown error"))}`);
  }
}
