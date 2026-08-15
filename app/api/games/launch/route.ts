import { NextRequest, NextResponse } from "next/server";
import { getManager } from "@/lib/runtime/manager.mjs";

export async function POST(req: NextRequest) {
  let body: { id?: string } = {};
  try {
    body = await req.json();
  } catch {}
  if (!body.id) {
    return NextResponse.json({ ok: false, error: "Missing game id" }, { status: 400 });
  }
  const m = getManager();
  const result = m.launchGame(body.id);
  if (result.ok && result.data) m.notify(`Launching ${result.data.name}...`, "info");
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
