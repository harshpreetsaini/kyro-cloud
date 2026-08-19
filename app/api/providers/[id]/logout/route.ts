import { NextRequest, NextResponse } from "next/server";
import { getManager } from "@/lib/runtime/manager.mjs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manager = getManager();

  if (manager.sendToAgent) {
    manager.sendToAgent({
      type: "provider.logout",
      payload: { provider: id },
    });
  }

  manager.notify(`Disconnected from ${id}`, "info");

  return NextResponse.json({ ok: true, data: { provider: id, status: "disconnected" } });
}
