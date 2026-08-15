import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "@/lib/files/fs.mjs";
import path from "path";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("path");
  if (!p) return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });
  const data = readFile(p);
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const name = path.basename(p);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${name}"`,
    },
  });
}
