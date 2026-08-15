import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "@/lib/files/fs.mjs";
import path from "path";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const dir = (form.get("path") as string) || "/";
  if (!file || typeof file === "string")
    return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const target = path.posix.join(dir.replace(/\/$/, ""), (file as File).name);
  const ok = writeFile(target, buf);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
