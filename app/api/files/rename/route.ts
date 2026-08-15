import { NextRequest, NextResponse } from "next/server";
import { rename } from "@/lib/files/fs.mjs";

export async function POST(req: NextRequest) {
  let body: { path?: string; newName?: string } = {};
  try {
    body = await req.json();
  } catch {}
  if (!body.path || !body.newName)
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  const ok = rename(body.path, body.newName);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
