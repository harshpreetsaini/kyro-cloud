import { NextResponse } from "next/server";
import { getManager } from "@/lib/runtime/manager.mjs";

export async function GET() {
  const m = getManager();
  if (!m.stream) {
    return NextResponse.json({ ok: false, error: "No active stream" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, data: m.stream });
}
