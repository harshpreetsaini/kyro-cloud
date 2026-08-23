import { NextRequest, NextResponse } from "next/server";

// GOG Galaxy OAuth — uses YOUR registered client (set GOG_CLIENT_ID / GOG_CLIENT_SECRET).
// Register the app at https://gog.com (developer) with the authorized redirect URI:
//   {your-site}/api/providers/epic-gog/callback
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const clientId = process.env.GOG_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/providers?error=gog_not_configured", req.url));
  }
  const redirectUri = `${origin}/api/providers/epic-gog/callback`;

  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    layout: "client2",
    state,
  });

  const res = NextResponse.redirect(
    `https://auth.gog.com/auth?${params.toString()}`
  );
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 600,
  });
  return res;
}
