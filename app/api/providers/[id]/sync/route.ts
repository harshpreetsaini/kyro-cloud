import { NextRequest, NextResponse } from "next/server";
import { getManager } from "@/lib/runtime/manager.mjs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manager = getManager();

  // Read auth tokens from cookies
  const cookieName = `provider_${id}`;
  const cookieValue = req.cookies.get(cookieName)?.value;
  let authData: Record<string, any> = {};

  if (cookieValue) {
    try {
      authData = JSON.parse(cookieValue);
    } catch {}
  }

  // Send sync command to agent with auth data
  if (manager.sendToAgent) {
    manager.sendToAgent({
      type: "provider.sync",
      payload: {
        provider: id,
        steamId: authData.steamId,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        username: authData.username || authData.displayName || authData.name,
      },
    });
  }

  manager.notify(`Syncing ${id} library...`, "info");

  return NextResponse.json({ ok: true, data: { provider: id, status: "syncing" } });
}
