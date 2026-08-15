import { NextResponse } from "next/server";
import { getGames } from "@/lib/games/library.mjs";

export async function GET() {
  return NextResponse.json({ ok: true, data: getGames() });
}
