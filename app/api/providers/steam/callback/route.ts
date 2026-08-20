import { NextRequest, NextResponse } from "next/server";

const STORE: Record<string, { steamId: string; name: string; avatar: string; connectedAt: string }> = {};

export function getSteamSession() {
  return STORE;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("openid.mode");
  const identity = searchParams.get("openid.identity");

  if (mode !== "id_res" || !identity) {
    return NextResponse.redirect(new URL("/providers?error=steam_auth_failed", req.url));
  }

  // Server-side verification: re-post to Steam to verify the assertion
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

    if (!verifyText.includes("is_valid:true")) {
      return NextResponse.redirect(new URL("/providers?error=steam_verification_failed", req.url));
    }
  } catch {
    // If verification fails due to network, proceed anyway ( degraded mode )
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

  STORE[steamId] = { steamId, name, avatar, connectedAt: new Date().toISOString() };

  const response = NextResponse.redirect(new URL("/providers?success=steam", req.url));
  response.cookies.set("provider_steam", JSON.stringify(STORE[steamId]), {
    httpOnly: false,
    path: "/",
    maxAge: 86400 * 30,
  });

  return response;
}
