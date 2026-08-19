import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = new URL(req.url).origin;

  // OAuth providers - redirect to official login pages
  const oauthProviders: Record<string, string> = {
    steam: `https://steamcommunity.com/openid/login?openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.mode=checkid_setup&openid.realm=${encodeURIComponent(origin)}&openid.return_to=${encodeURIComponent(`${origin}/api/providers/steam/callback`)}`,
    epic: `https://www.epicgames.com/id/authorize?client_id=875a544986424806b74309c7c139db15&response_type=code&redirect_uri=${encodeURIComponent(`${origin}/api/providers/epic/callback`)}&scope=basic_profile+identify`,
    gog: `https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=${encodeURIComponent(`${origin}/api/providers/gog/callback`)}&response_type=code&layout=client2`,
  };

  const redirectUrl = oauthProviders[id];

  if (redirectUrl) {
    return NextResponse.json({
      ok: true,
      data: { redirectUrl, provider: id, method: "oauth" },
    });
  }

  // For other providers, return info about the flow
  return NextResponse.json({
    ok: true,
    data: {
      provider: id,
      method: "agent",
      message: `${id} requires agent-based login. Make sure the Colab runtime is connected.`,
    },
  });
}
