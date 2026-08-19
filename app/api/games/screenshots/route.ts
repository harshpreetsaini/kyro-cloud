import { NextRequest, NextResponse } from "next/server";

// Fetches real screenshots from Steam Store API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const appId = searchParams.get("appId");
  if (!appId) {
    return NextResponse.json({ ok: false, error: "Missing appId" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`, {
      next: { revalidate: 3600 }, // cache 1 hour
    });
    const data = await res.json();
    const gameData = data?.[appId]?.data;
    if (!gameData) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const screenshots = (gameData.screenshots || []).map((s: { id: number; path_full: string; path_thumbnail: string }, i: number) => ({
      id: i,
      url: s.path_full,
      thumbnail: s.path_thumbnail,
      width: 1920,
      height: 1080,
    }));

    return NextResponse.json({ ok: true, data: screenshots });
  } catch {
    return NextResponse.json({ ok: true, data: [] });
  }
}
