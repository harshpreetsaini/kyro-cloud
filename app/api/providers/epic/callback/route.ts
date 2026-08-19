import { NextRequest, NextResponse } from "next/server";

const STORE: Record<string, { accountId: string; displayName: string; accessToken: string; refreshToken: string; connectedAt: string }> = {};

export function getEpicSession() {
  return STORE;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/providers?error=epic_auth_failed", req.url));
  }

  const origin = new URL(req.url).origin;

  // Exchange code for token (Epic uses a public client - no secret needed)
  try {
    const tokenRes = await fetch("https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: "875a544986424806b74309c7c139db15",
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.access_token) {
      // Fetch user profile
      const profileRes = await fetch("https://account-public-service-prod.ol.epicgames.com/account/api/public/account", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json();

      const accountId = profile.id || "unknown";
      const displayName = profile.displayName || "Epic User";

      STORE[accountId] = {
        accountId,
        displayName,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || "",
        connectedAt: new Date().toISOString(),
      };

      const response = NextResponse.redirect(new URL("/providers?success=epic&accountId=" + accountId, req.url));
      // Store session data including token (non-httpOnly so frontend can read it for sync)
      response.cookies.set("provider_epic", JSON.stringify(STORE[accountId]), {
        httpOnly: false,
        path: "/",
        maxAge: 86400 * 30,
      });

      return response;
    }
  } catch (e) {
    // fallback
  }

  return NextResponse.redirect(new URL("/providers?error=epic_token_exchange_failed", req.url));
}
