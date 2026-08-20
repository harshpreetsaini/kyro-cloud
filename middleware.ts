import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "./lib/auth/jwt";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/health", "/api/games/screenshots", "/api/providers/steam/callback", "/api/providers/epic/callback", "/api/providers/gog/callback"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (/^\/api\/providers\/[^/]+\/(login|logout|callback)$/.test(pathname)) return true;
  // Specific callback paths for OAuth providers
  if (/^\/api\/providers\/(steam|epic|gog)\/callback$/.test(pathname)) return true;
  return false;
}

function applyCors(res: NextResponse, origin: string | null) {
  const allowed = process.env.FRONTEND_URL || "*";
  res.headers.set("Access-Control-Allow-Origin", origin && allowed !== "*" ? origin : allowed);
  res.headers.set("Access-Control-Allow-Credentials", "true");
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
