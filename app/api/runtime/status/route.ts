import { NextResponse } from "next/server";
import { getManager } from "@/lib/runtime/manager.mjs";

export async function GET() {
  const m = getManager();
  return NextResponse.json({ ok: true, data: m.sessionInfo() });
}
