import { NextRequest, NextResponse } from "next/server";
import { listDir } from "@/lib/files/fs.mjs";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("path") || "/";
  return NextResponse.json({ ok: true, data: listDir(p) });
}
