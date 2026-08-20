import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const providers = ["steam", "epic", "gog"];
  const result: Record<string, { loggedIn: boolean; username?: string }> = {};

  for (const id of providers) {
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
