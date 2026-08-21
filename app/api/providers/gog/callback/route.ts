import { NextRequest, NextResponse } from "next/server";

const STORE: Record<string, { userId: string; username: string; accessToken: string; refreshToken: string; games: any[]; connectedAt: string }> = {};

export function getGogSession() {
  return STORE;
}

async function relayToBackend(payload: Record<string, unknown>) {
  const backend = process.env.BACKEND_URL || "https://kyro-cloud-3fp0.onrender.com";
  const key = process.env.BACKEND_SERVICE_KEY;
  try {
    await fetch(`${backend}/api/provider/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "x-service-key": key } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // non-fatal: library sync still works via the stored session
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/providers?error=gog_auth_failed", req.url));
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/providers/gog/callback`;
  const clientId = process.env.GOG_CLIENT_ID;
  const clientSecret = process.env.GOG_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/providers?error=gog_not_configured", req.url));
  }

  try {
    const tokenRes = await fetch("https://auth.gog.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/providers?error=gog_token_exchange_failed", req.url));
    }

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

    // Relay the linked account to the cloud agent so games install under this GOG user.
    await relayToBackend({
      provider: "gog",
      accountId: userId,
      username,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || "",
    });

    const response = NextResponse.redirect(new URL("/providers?success=gog", req.url));
    response.cookies.set("provider_gog", JSON.stringify(STORE[userId]), {
      httpOnly: true,
      secure: true,
      path: "/",
      maxAge: 86400 * 30,
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/providers?error=gog_token_exchange_failed", req.url));
  }
}
