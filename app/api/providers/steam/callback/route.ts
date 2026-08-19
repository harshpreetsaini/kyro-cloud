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
  } catch (e) {
    // fallback
  }

  STORE[steamId] = { steamId, name, avatar, connectedAt: new Date().toISOString() };

  const response = NextResponse.redirect(new URL("/providers?success=steam&steamId=" + steamId, req.url));
  response.cookies.set("provider_steam", JSON.stringify(STORE[steamId]), {
    httpOnly: false,
    path: "/",
    maxAge: 86400 * 30,
  });

  return response;
}
