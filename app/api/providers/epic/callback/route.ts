import { NextRequest, NextResponse } from "next/server";

const STORE: Record<string, { accountId: string; displayName: string; accessToken: string; refreshToken: string; connectedAt: string }> = {};

export function getEpicSession() {
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
    return NextResponse.redirect(new URL("/providers?error=epic_auth_failed", req.url));
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/providers/epic/callback`;
  const clientId = process.env.EPIC_CLIENT_ID;
  const clientSecret = process.env.EPIC_CLIENT_SECRET || "";

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

    STORE[accountId] = {
      accountId,
      displayName,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || "",
      connectedAt: new Date().toISOString(),
    };

    // Relay the linked account to the cloud agent so games install under this Epic user.
    await relayToBackend({
      provider: "epic",
      accountId,
      username: displayName,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || "",
    });

    const response = NextResponse.redirect(new URL("/providers?success=epic", req.url));
    response.cookies.set("provider_epic", JSON.stringify(STORE[accountId]), {
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
