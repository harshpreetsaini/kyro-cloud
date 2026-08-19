import { NextRequest, NextResponse } from "next/server";
import { getManager } from "@/lib/runtime/manager.mjs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "Username and password required" }, { status: 400 });
  }

  const manager = getManager();

  // Send login command to the runtime agent on Colab
  if (manager.sendToAgent) {
    manager.sendToAgent({
      type: "provider.login",
      payload: { provider: id, username, password },
    });
  }

  manager.notify(`Logging into ${id}...`, "info");

  return NextResponse.json({
    ok: true,
    data: { provider: id, status: "authenticating", message: `Login command sent to ${id}` },
  });
}
