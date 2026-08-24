import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "./lib/auth/jwt";

// Edge-runtime-safe constant-time comparison (no Node crypto).
function safeEq(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const PUBLIC_PATHS = [
  "/login",
  "/callback",
  "/api/auth/login",
  "/api/auth/email",
  "/api/auth/logout",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/health",
  "/api/games/screenshots",
];

// OAuth callback routes are public but still validated inside their handlers
// (state cookie + provider identity). Keep the list explicit — no wildcard
// regexes that accidentally expose handler families.
const PUBLIC_PATTERNS: RegExp[] = [
  /^\/api\/providers\/(epic|gog)\/login$/, // begins the OAuth redirect (no session data returned)
  /^\/api\/providers\/epic-gog\/callback$/,
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PATTERNS.some((re) => re.test(pathname));
}

// The backend (Render) forwards provider links to this Vercel route with a
// shared service key; allow those without a user session.
function isServiceKeyRequest(req: NextRequest): boolean {
  const key = process.env.BACKEND_SERVICE_KEY;
  if (!key) return false;
  return safeEq(req.headers.get("x-service-key") || "", key);
}

function applyCors(res: NextResponse, origin: string | null) {
  const allowed = process.env.FRONTEND_URL || "";
  const value = origin && allowed && origin === allowed ? allowed : allowed || "*";
  res.headers.set("Access-Control-Allow-Origin", value);
  if (value !== "*") res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
}

function getRequestToken(req: NextRequest): string | undefined {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie) return cookie;
  const header = req.headers.get("authorization");
  if (header && header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return undefined;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    applyCors(res, origin);
    return res;
  }

  const res = NextResponse.next();
  applyCors(res, origin);

  if (isPublicPath(pathname)) return res;

  if (pathname.startsWith("/api/")) {
    // Backend→Vercel service calls (e.g. persisting provider links) are
    // authenticated by a shared service key rather than a user session.
    if (isServiceKeyRequest(req)) return res;
    const session = await verifySession(getRequestToken(req));
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|ws|agent).*)"],
};
