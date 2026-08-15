import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "luna-cloud", time: Date.now() });
}
