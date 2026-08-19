import { NextRequest, NextResponse } from "next/server";
import { getManager } from "@/lib/runtime/manager.mjs";
import { getGame } from "@/lib/games/library.mjs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) {
    return NextResponse.json({ ok: false, error: "Game not found" }, { status: 404 });
  }

  const manager = getManager();

  // Send uninstall command to the runtime agent
  if (manager.sendToAgent) {
    manager.sendToAgent({
      type: "game.uninstall",
      payload: {
        id: game.id,
        name: game.name,
        provider: game.providers?.[0]?.type || "steam",
        providerAppId: (game.providers?.[0] as any)?.appId,
      },
    });
  }

  manager.notify(`Uninstalling ${game.name}...`, "info");

  return NextResponse.json({
    ok: true,
    data: { id: game.id, name: game.name, status: "uninstalling" },
  });
}
