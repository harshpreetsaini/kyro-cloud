import { NextRequest, NextResponse } from "next/server";

// Epic Games OAuth — uses their public client ID
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/providers/epic/callback`;

  const params = new URLSearchParams({
    client_id: "875a544986424806b74309c7c139db15",
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "basic_profile identify",
  });

  return NextResponse.redirect(
    `https://www.epicgames.com/id/authorize?${params.toString()}`
  );
}
