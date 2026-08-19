import { NextRequest, NextResponse } from "next/server";
import { getManager } from "@/lib/runtime/manager.mjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resolution, fps, quality, network_quality } = body;

    const manager = getManager();
    const result = manager.adjustQuality({
      resolution,
      fps,
      quality,
      network_quality,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const manager = getManager();
    const quality = manager._currentQuality || null;
    return NextResponse.json({ ok: true, data: quality });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
