import { NextRequest, NextResponse } from "next/server";
import { remove } from "@/lib/files/fs.mjs";

export async function DELETE(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("path");
  if (!p) return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });
  const ok = remove(p);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
