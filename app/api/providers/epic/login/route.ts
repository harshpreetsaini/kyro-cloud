import { NextRequest, NextResponse } from "next/server";

// Epic Games OAuth — uses YOUR registered client (set EPIC_CLIENT_ID / EPIC_CLIENT_SECRET).
// Register the app at https://dev.epicgames.com/ with the authorized redirect URI:
//   {your-site}/api/providers/epic-gog/callback
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const clientId = process.env.EPIC_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/providers?error=epic_not_configured", req.url));
  }
  const redirectUri = `${origin}/api/providers/epic-gog/callback`;

  // Generate a random state to prevent CSRF and echo it back in the cookie so
  // the callback can validate it.
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "basic_profile identify",
    state,
  });

  const res = NextResponse.redirect(
    `https://www.epicgames.com/id/authorize?${params.toString()}`
  );
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 600,
  });
  res.cookies.set("oauth_provider", "epic", {
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 600,
  });
  return res;
}
