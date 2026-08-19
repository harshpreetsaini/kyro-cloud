import { NextRequest, NextResponse } from "next/server";
import { getGames, searchGames, getGamesBySort, getUniqueGenres, getUniqueProviders, getUniqueTags } from "@/lib/games/library.mjs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const sort = searchParams.get("sort");
  const genre = searchParams.get("genre");
  const provider = searchParams.get("provider");
  const installed = searchParams.get("installed");
  const tags = searchParams.get("tags");

  let games = getGames();

  // Search
  if (q) games = searchGames(q);

  // Filter by genre
  if (genre) games = games.filter((g) => g.genres?.some((gr: { name: string }) => gr.name.toLowerCase() === genre.toLowerCase()));

  // Filter by provider
  if (provider) games = games.filter((g) => g.providers?.some((p) => p.name.toLowerCase() === provider.toLowerCase()));

  // Filter by installed
  if (installed === "true") games = games.filter((g) => g.installed);

  // Filter by tags
  if (tags) {
    const tagList = tags.split(",").map((t: string) => t.toLowerCase());
    games = games.filter((g) => tagList.every((t: string) => g.tags?.some((gt: string) => gt.toLowerCase() === t)));
  }

  // Sort
  if (sort) games = getGamesBySort(sort, games);

  return NextResponse.json({
    ok: true,
    data: games,
    meta: {
      total: games.length,
      genres: getUniqueGenres(),
      providers: getUniqueProviders(),
      tags: getUniqueTags(),
    },
  });
}
