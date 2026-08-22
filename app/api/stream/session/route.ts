import { NextRequest, NextResponse } from "next/server";

// Proxy to the Render backend's /api/stream/session. The backend is the source
// of truth for the active stream config; the frontend reconciles its (otherwise
// WS-push-only) stream state from here so the remote desktop renders even when
// the push was missed (e.g. Play while the cloud PC is already running).
export async function GET(req: NextRequest) {
  const backend = process.env.BACKEND_URL || "https://kyro-cloud-3fp0.onrender.com";
  try {
    const r = await fetch(`${backend}/api/stream/session`, {
      headers: {
        ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization") as string } : {}),
        ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie") as string } : {}),
      },
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Backend unreachable" }, { status: 502 });
  }
}
