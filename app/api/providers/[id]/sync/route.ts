import { NextRequest, NextResponse } from "next/server";
import { getManager } from "@/lib/runtime/manager.mjs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manager = getManager();

  if (manager.sendToAgent) {
    manager.sendToAgent({
      type: "provider.sync",
      payload: { provider: id },
    });
  }

  manager.notify(`Syncing ${id} library...`, "info");

  return NextResponse.json({ ok: true, data: { provider: id, status: "syncing" } });
}
