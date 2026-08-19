import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "kyro-cloud", time: Date.now() });
}
