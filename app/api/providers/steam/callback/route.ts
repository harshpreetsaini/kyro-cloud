import { NextRequest, NextResponse } from "next/server";
import { initDb, setProvider } from "@/lib/db.mjs";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/jwt";

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("openid.mode");
  const identity = searchParams.get("openid.identity");

  if (mode !== "id_res" || !identity) {
    return NextResponse.redirect(new URL("/providers?error=steam_auth_failed", req.url));
  }

  // Server-side verification: re-post to Steam to verify the assertion
  let verified = false;
  try {
    const verifyParams = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      verifyParams.set(key, value);
    }
    verifyParams.set("openid.mode", "check_authentication");

    const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      body: verifyParams,
    });
    const verifyText = await verifyRes.text();
    verified = verifyText.includes("is_valid:true");
  } catch {
    return NextResponse.redirect(new URL("/providers?error=steam_verification_failed", req.url));
  }

  if (!verified) {
    return NextResponse.redirect(new URL("/providers?error=steam_verification_failed", req.url));
  }

  // Extract steamid from identity URL (format: https://steamcommunity.com/openid/id/76561198XXXXXXXX)
  const steamIdMatch = identity.match(/\/id\/(\d+)/);
  const steamId = steamIdMatch?.[1] || "unknown";

  // Fetch Steam profile
  let name = "Steam User";
  let avatar = "";
  try {
    const profileRes = await fetch(`https://steamcommunity.com/profiles/${steamId}?xml=1`);
    const profileXml = await profileRes.text();
    const nameMatch = profileXml.match(/<steamID>(.*?)<\/steamID>/);
    const avatarMatch = profileXml.match(/<avatarMedium>(.*?)<\/avatarMedium>/);
    if (nameMatch) name = nameMatch[1];
    if (avatarMatch) avatar = avatarMatch[1];
  } catch {}

  // Persist durably to Vercel Postgres (the backend source of truth) so the
  // Provider UI shows "Connected" and survives a page refresh / restart.
  try {
    await ensureInit();
    const session = await verifySession(
      req.cookies.get(SESSION_COOKIE)?.value || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""
    );
    if (session && session.userId != null) {
      await setProvider(session.userId, "steam", {
        username: name,
        accountId: steamId,
        linkedAt: Date.now(),
      });
    }
  } catch {}

  const response = NextResponse.redirect(new URL("/providers?success=steam", req.url));
  response.cookies.set(
    "provider_steam",
    JSON.stringify({ steamId, name, avatar, connectedAt: new Date().toISOString() }),
    { httpOnly: true, secure: true, path: "/", maxAge: 86400 * 30 }
  );
  return response;
}
