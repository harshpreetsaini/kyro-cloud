import { NextRequest, NextResponse } from "next/server";

// GOG Galaxy OAuth — public client ID (same as lgogdownloader/heroic)
const GOG_CLIENT_ID = "46899977096215655";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/providers/gog/callback`;

  const params = new URLSearchParams({
    client_id: GOG_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    layout: "client2",
  });

  return NextResponse.redirect(
    `https://auth.gog.com/auth?${params.toString()}`
  );
}
