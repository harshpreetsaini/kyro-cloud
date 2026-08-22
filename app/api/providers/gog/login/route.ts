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

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    layout: "client2",
    state: "gog",
  });

  return NextResponse.redirect(
    `https://auth.gog.com/auth?${params.toString()}`
  );
}
