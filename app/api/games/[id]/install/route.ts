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

  // Determine which provider/installer to use
  const provider = game.providers?.[0];
  const installMethod = provider?.type === "steam" ? "steamcmd" :
    provider?.name === "Epic Games" ? "legendary" :
    provider?.name === "GOG" ? "lgogdownloader" : "steamcmd";

  const appId = (provider as any)?.appId || game.id?.replace(/\D/g, "");

  // Send install command to the runtime agent
  if (manager.sendToAgent) {
    manager.sendToAgent({
      type: "game.install",
      payload: {
        id: game.id,
        name: game.name,
        installMethod,
        provider: provider?.type || "steam",
        providerName: provider?.name || "Steam",
        appId: appId,
        steamAppId: appId,
      },
    });
  }

  manager.notify(`Installing ${game.name}...`, "info");

  return NextResponse.json({
    ok: true,
    data: {
      id: game.id,
      name: game.name,
      status: "installing",
      message: `Installation started for ${game.name} via ${installMethod}`,
    },
  });
}
