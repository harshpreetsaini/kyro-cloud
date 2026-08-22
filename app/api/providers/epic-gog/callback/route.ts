import { NextRequest, NextResponse } from "next/server";

// Single combined OAuth callback for Epic + GOG.
// Both providers redirect to: {site}/api/providers/epic-gog/callback
// The `state` param (set by the login routes) selects which provider.
// The backend (Render) is the source of truth for the linked account; we also
// drop a cookie so the browser can trigger library sync.

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
  const state = (searchParams.get("state") || "epic").toLowerCase();
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/providers/epic-gog/callback`;

  if (!code) {
    return NextResponse.redirect(new URL(`/providers?error=${state}_auth_failed`, req.url));
  }

  // ── GOG ──────────────────────────────────────────────────────────────
  if (state === "gog") {
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
            games = games.map((g: any) => ({ ...g, name: nameMap.get(g.appId) || g.name || `Game ${g.appId}` }));
          }
        } catch {}
      }

      await relayToBackend({
        provider: "gog",
        accountId: userId,
        username,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || "",
      });

      const response = NextResponse.redirect(new URL("/providers?success=gog", req.url));
      response.cookies.set("provider_gog", JSON.stringify({ userId, username, connectedAt: new Date().toISOString() }), {
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

  // ── Epic (default) ───────────────────────────────────────────────────
  const clientId = process.env.EPIC_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/providers?error=epic_not_configured", req.url));
  }
  try {
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
    });
    const clientSecret = process.env.EPIC_CLIENT_SECRET || "";
    if (clientSecret) tokenBody.set("client_secret", clientSecret);

    const tokenRes = await fetch("https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/providers?error=epic_token_exchange_failed", req.url));
    }

    const profileRes = await fetch("https://account-public-service-prod.ol.epicgames.com/account/api/public/account", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    const accountId = profile.id || "unknown";
    const displayName = profile.displayName || "Epic User";

    await relayToBackend({
      provider: "epic",
      accountId,
      username: displayName,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || "",
    });

    const response = NextResponse.redirect(new URL("/providers?success=epic", req.url));
    response.cookies.set("provider_epic", JSON.stringify({ accountId, username: displayName, connectedAt: new Date().toISOString() }), {
      httpOnly: true,
      secure: true,
      path: "/",
      maxAge: 86400 * 30,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/providers?error=epic_token_exchange_failed", req.url));
  }
}
