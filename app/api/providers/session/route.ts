import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const providers = ["steam", "epic", "gog"];
  const result: Record<string, { loggedIn: boolean; username?: string }> = {};

  // Steam links through the cloud agent (not a web cookie), so its linked
  // state lives on the backend. Consult the backend as the source of truth.
  const backend = process.env.BACKEND_URL || "https://kyro-cloud-3fp0.onrender.com";
  const serviceKey = process.env.BACKEND_SERVICE_KEY;
  let backendLinked: Record<string, any> = {};
  if (serviceKey) {
    try {
      const r = await fetch(`${backend}/api/provider/link`, {
        headers: { "x-service-key": serviceKey },
      });
      const j = await r.json();
      if (j.ok && j.data) backendLinked = j.data as Record<string, any>;
    } catch {
      // Backend unreachable — fall back to cookie-only below.
    }
  }

  for (const id of providers) {
    const backendAccount = backendLinked[id];
    if (backendAccount && backendAccount.username) {
      result[id] = { loggedIn: true, username: backendAccount.username };
      continue;
    }
    const cookie = req.cookies.get(`provider_${id}`);
    if (cookie?.value) {
      try {
        const session = JSON.parse(cookie.value);
        result[id] = {
          loggedIn: true,
          username: session.displayName || session.username || session.name || session.steamId || id,
        };
      } catch {
        result[id] = { loggedIn: false };
      }
    } else {
      result[id] = { loggedIn: false };
    }
  }

  return NextResponse.json({ ok: true, data: result });
}
