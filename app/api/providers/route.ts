import { NextRequest, NextResponse } from "next/server";
import { getManager } from "@/lib/runtime/manager.mjs";

const PROVIDER_STATE: Record<string, { loggedIn: boolean; username?: string; gameCount?: number; games?: any[] }> = {};

// GET /api/providers — list all providers and their status
export async function GET() {
  const providers = [
    { id: "steam", name: "Steam", installMethod: "steamcmd" },
    { id: "epic", name: "Epic Games", installMethod: "legendary" },
    { id: "gog", name: "GOG", installMethod: "lgogdownloader" },
    { id: "ubisoft", name: "Ubisoft Connect", installMethod: "ubisoft" },
    { id: "ea", name: "EA App", installMethod: "ea" },
    { id: "xbox", name: "Xbox / Game Pass", installMethod: "xbox" },
    { id: "battle", name: "Battle.net", installMethod: "battle" },
    { id: "riot", name: "Riot Client", installMethod: "riot" },
  ];

  const result = providers.map((p) => ({
    ...p,
    loggedIn: PROVIDER_STATE[p.id]?.loggedIn || false,
    username: PROVIDER_STATE[p.id]?.username,
    gameCount: PROVIDER_STATE[p.id]?.gameCount,
  }));

  return NextResponse.json({ ok: true, data: result });
}
