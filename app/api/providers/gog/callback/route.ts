import { NextRequest, NextResponse } from "next/server";

const GOG_CLIENT_ID = "46899977096215655";
const GOG_CLIENT_SECRET = "9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9";

const STORE: Record<string, { userId: string; username: string; accessToken: string; refreshToken: string; games: any[]; connectedAt: string }> = {};

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
  const redirectUri = `${origin}/api/providers/gog/callback`;

  try {
    // Exchange code for token — GOG requires client_secret
    const tokenRes = await fetch("https://auth.gog.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOG_CLIENT_ID,
        client_secret: GOG_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/providers?error=gog_token_exchange_failed", req.url));
    }

    // Fetch user profile
    const profileRes = await fetch("https://embed.gog.com/userData.json", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    const userId = String(profile.user_id || "unknown");
    const username = profile.username || "GOG User";

    // Fetch owned games from GOG library API
    let games: any[] = [];
    try {
      const gamesRes = await fetch("https://embed.gog.com/user/data/games", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const gamesData = await gamesRes.json();
      if (Array.isArray(gamesData)) {
        games = gamesData.map((id: any) => ({ appId: String(id), name: "" }));
      }
    } catch {}

    // Fetch game details to get names
    if (games.length > 0) {
      try {
        const detailsRes = await fetch("https://embed.gog.com/account/getFilteredProducts?mediaType=1&page=1", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const details = await detailsRes.json();
        if (details?.products) {
          const nameMap = new Map<string, string>();
          for (const p of details.products) {
            if (p.id && p.title) nameMap.set(String(p.id), p.title);
          }
          games = games.map(g => ({ ...g, name: nameMap.get(g.appId) || g.name || `Game ${g.appId}` }));
        }
      } catch {}
    }

    STORE[userId] = {
      userId,
      username,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || "",
      games,
      connectedAt: new Date().toISOString(),
    };

    const response = NextResponse.redirect(new URL("/providers?success=gog", req.url));
    response.cookies.set("provider_gog", JSON.stringify(STORE[userId]), {
      httpOnly: false,
      path: "/",
      maxAge: 86400 * 30,
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/providers?error=gog_token_exchange_failed", req.url));
  }
}
