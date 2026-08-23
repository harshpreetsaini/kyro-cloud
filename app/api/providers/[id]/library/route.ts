import { NextRequest, NextResponse } from "next/server";
import { initDb, getProfile, saveProfile } from "@/lib/db.mjs";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/jwt";

const ALLOWED = new Set(["steam", "epic", "gog"]);

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureInit();
  const { id } = await params;
  if (!ALLOWED.has(id)) {
    return NextResponse.json({ ok: false, error: "Unknown provider" }, { status: 404 });
  }
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value || req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  if (!session || session.userId == null) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const rawGames = Array.isArray(body?.games) ? body.games : [];
  const games = rawGames
    .map((g: any) => ({ appId: String(g?.appId ?? ""), name: String(g?.name ?? `App ${g?.appId ?? ""}`) }))
    .filter((g: any) => g.appId);

  const profile = await getProfile(session.userId);
  const library = { ...(profile.library || {}), [id]: games };
  const next = await saveProfile(session.userId, { library });
  return NextResponse.json({ ok: true, data: { provider: id, count: games.length, library: next.library } });
}
