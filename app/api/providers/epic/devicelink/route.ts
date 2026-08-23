import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/jwt";

const BACKEND_URL = process.env.BACKEND_URL || "https://kyro-cloud-3fp0.onrender.com";

// Epic account linking without a registered Epic OAuth application.
// Proxies two actions to the Render backend (which relays to the agent):
//   start    → returns legendary's official Epic login URL
//   complete → exchanges the pasted authorizationCode via legendary
export async function POST(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value || req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (!session || session.userId == null) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body?.action) {
    return NextResponse.json({ ok: false, error: "Missing action" }, { status: 400 });
  }
  const svc = process.env.BACKEND_SERVICE_KEY;
  try {
    const r = await fetch(`${BACKEND_URL}/api/provider/epic/devicelink`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(svc ? { "x-service-key": svc } : {}) },
      body: JSON.stringify({ action: body.action, code: body.code }),
      signal: AbortSignal.timeout(70000),
    });
    const j = await r.json().catch(() => ({ ok: false, error: "Invalid backend response" }));
    return NextResponse.json(j, { status: r.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.name === "TimeoutError" ? "Timed out talking to the runtime" : "Runtime unreachable" },
      { status: 504 }
    );
  }
}
