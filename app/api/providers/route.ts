import { NextResponse } from "next/server";

const PROVIDER_STATE: Record<string, { loggedIn: boolean; username?: string; gameCount?: number }> = {};

// GET /api/providers — list all providers and their status
export async function GET() {
  const providers = [
    { id: "steam", name: "Steam", installMethod: "steamcmd", method: "oauth" },
    { id: "epic", name: "Epic Games", installMethod: "legendary", method: "oauth" },
    { id: "gog", name: "GOG", installMethod: "lgogdownloader", method: "oauth" },
    { id: "ubisoft", name: "Ubisoft Connect", installMethod: "ubisoft", method: "coming" },
    { id: "ea", name: "EA App", installMethod: "ea", method: "coming" },
    { id: "xbox", name: "Xbox / Game Pass", installMethod: "xbox", method: "coming" },
    { id: "battle", name: "Battle.net", installMethod: "battle", method: "coming" },
    { id: "riot", name: "Riot Client", installMethod: "riot", method: "coming" },
  ];

  const result = providers.map((p) => ({
    ...p,
    loggedIn: PROVIDER_STATE[p.id]?.loggedIn || false,
    username: PROVIDER_STATE[p.id]?.username,
    gameCount: PROVIDER_STATE[p.id]?.gameCount,
  }));

  return NextResponse.json({ ok: true, data: result });
}
