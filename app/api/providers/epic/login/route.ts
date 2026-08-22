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

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "basic_profile identify",
    state: "epic",
  });

  return NextResponse.redirect(
    `https://www.epicgames.com/id/authorize?${params.toString()}`
  );
}
