import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const providerId = body.providerId;

  if (!providerId || !["steam", "epic", "gog"].includes(providerId)) {
    return NextResponse.json({ ok: false, error: "Invalid provider" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(`provider_${providerId}`, "", { path: "/", maxAge: 0 });
  return response;
}
