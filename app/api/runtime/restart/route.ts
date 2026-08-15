import { NextResponse } from "next/server";
import { getManager } from "@/lib/runtime/manager.mjs";

export async function POST() {
  const m = getManager();
  const result = await m.restart();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
