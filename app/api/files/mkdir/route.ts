import { NextRequest, NextResponse } from "next/server";
import { createFolder } from "@/lib/files/fs.mjs";

export async function POST(req: NextRequest) {
  let body: { path?: string; name?: string } = {};
  try {
    body = await req.json();
  } catch {}
  if (!body.name) return NextResponse.json({ ok: false, error: "Missing name" }, { status: 400 });
  const ok = createFolder(body.path || "/", body.name);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
