import { NextRequest, NextResponse } from "next/server";
import { getGames, searchGames, getGamesBySort, getUniqueGenres, getUniqueProviders, getUniqueTags } from "@/lib/games/library.mjs";
import type { GameEntry } from "@shared/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const sort = searchParams.get("sort");
  const genre = searchParams.get("genre");
  const provider = searchParams.get("provider");
  const installed = searchParams.get("installed");
  const tags = searchParams.get("tags");
  const free = searchParams.get("free");
  const linux = searchParams.get("linux");

  let games = getGames();

  // Search
  if (q) games = searchGames(q);

  // Filter by genre
  if (genre) games = games.filter((g) => g.genres?.some((gr: { name: string }) => gr.name.toLowerCase() === genre.toLowerCase()));

  // Filter by provider
  if (provider) games = games.filter((g) => g.providers?.some((p) => p.name.toLowerCase() === provider.toLowerCase()));

  // Filter by installed
  if (installed === "true") games = games.filter((g) => g.installed);

  // Filter by free-to-play
  if (free === "true" || free === "1") games = games.filter((g: any) => g.isFree);

  // Filter by Linux compatibility
  if (linux === "true" || linux === "1") games = games.filter((g: any) => g.linuxCompatible);

  // Filter by tags
  if (tags) {
    const tagList = tags.split(",").map((t: string) => t.toLowerCase());
    games = games.filter((g) => tagList.every((t: string) => g.tags?.some((gt: string) => gt.toLowerCase() === t)));
  }

  // Sort
  if (sort) games = getGamesBySort(sort, games);

  const grandTotal = games.length;

  // Pagination — lets pages stream slices instead of shipping the whole
  // 250-title catalog at once.
  const limitNum = parseInt(searchParams.get("limit") || "", 10);
  const offsetNum = parseInt(searchParams.get("offset") || "0", 10);
  const paged = Number.isFinite(limitNum) && limitNum > 0;
  if (paged || offsetNum > 0) {
    const off = Number.isFinite(offsetNum) && offsetNum > 0 ? offsetNum : 0;
    games = paged ? games.slice(off, off + limitNum) : games.slice(off);
  }

  return NextResponse.json({
    ok: true,
    data: games,
    meta: {
      total: games.length,
      ...(paged ? { grandTotal } : {}),
      // Facet lists are only needed by the browse page — home-page row slices
      // pass meta=0 to keep payloads tiny.
      ...(searchParams.get("meta") === "0"
        ? {}
        : { genres: getUniqueGenres(), providers: getUniqueProviders(), tags: getUniqueTags() }),
    },
  });
}
