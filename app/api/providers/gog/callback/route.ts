import { NextRequest, NextResponse } from "next/server";

const STORE: Record<string, { userId: string; username: string; accessToken: string; refreshToken: string; connectedAt: string }> = {};

export function getGogSession() {
  return STORE;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/providers?error=gog_auth_failed", req.url));
  }

  const origin = new URL(req.url).origin;

  // Exchange code for token
  try {
    const tokenRes = await fetch("https://embed.gog.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "46899977096215655",
        grant_type: "authorization_code",
        code,
        redirect_uri: `${origin}/api/providers/gog/callback`,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.access_token) {
      // Fetch user profile
      const profileRes = await fetch("https://embed.gog.com/user/info", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profileData = await profileRes.json();

      const userId = profileData.data?.userId || "unknown";
      const username = profileData.data?.username || "GOG User";
      const avatar = profileData.data?.avatar || "";

      STORE[userId] = {
        userId,
        username,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || "",
        connectedAt: new Date().toISOString(),
      };

      const response = NextResponse.redirect(new URL("/providers?success=gog&userId=" + userId, req.url));
      response.cookies.set("provider_gog", JSON.stringify(STORE[userId]), {
        httpOnly: false,
        path: "/",
        maxAge: 86400 * 30,
      });

      return response;
    }
  } catch (e) {
    // fallback
  }

  return NextResponse.redirect(new URL("/providers?error=gog_token_exchange_failed", req.url));
}
