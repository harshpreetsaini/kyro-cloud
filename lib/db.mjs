// Shared user-account + per-user profile storage for KYRO CLOUD.
// Runs inside Vercel serverless (and can be imported by the backend too).
// Uses Postgres when DATABASE_URL is set; otherwise an in-memory store so the
// app still boots in dev (data is not durable without a real DB).

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "";

// Vercel Postgres (Neon) and most managed Postgres require TLS. Enable it
// unless the URL explicitly disables ssl via ?sslmode=disable.
const SSL_NEEDED = /^postgres/i.test(DATABASE_URL) && !/sslmode=disable/i.test(DATABASE_URL);

let pool = null;
let useDb = false;
// Set false when init fails so callers/health endpoints can surface the
// degraded state instead of silently serving empty data.
let dbHealthy = true;
if (DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: SSL_NEEDED ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
  useDb = true;
}

// In-memory fallback (single instance, ephemeral).
const mem = {
  usersBySub: new Map(),
  usersById: new Map(),
  profiles: new Map(),
  seq: 1,
};

export async function initDb() {
  if (!useDb && DATABASE_URL) {
    // A previous init failed — allow one retry instead of being stuck in
    // silent in-memory mode forever.
    useDb = true;
    pool = pool || new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: SSL_NEEDED ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }
  if (!useDb) {
    console.log("[db] DATABASE_URL not set — using in-memory user store (not durable).");
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_sub TEXT UNIQUE,
        email TEXT,
        name TEXT,
        avatar TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        favorites JSONB DEFAULT '[]'::jsonb,
        providers JSONB DEFAULT '{}'::jsonb,
        installed_games JSONB DEFAULT '{}'::jsonb,
        library JSONB DEFAULT '{}'::jsonb,
        settings JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_uniq ON users (email) WHERE email IS NOT NULL;
    `);
    console.log("[db] Postgres tables ready.");
  } catch (e) {
    console.error("[db] INIT FAILED — falling back to in-memory store (DATA LOSS RISK):", e.message);
    dbHealthy = false;
    useDb = false;
  }
}

export async function upsertUserByGoogle({ googleSub, email, name, avatar }) {
  if (useDb) {
    const res = await pool.query(
      `INSERT INTO users (google_sub, email, name, avatar)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (google_sub) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name, avatar=EXCLUDED.avatar
       RETURNING id, google_sub, email, name, avatar`,
      [googleSub, email || null, name || null, avatar || null]
    );
    const u = res.rows[0];
    await pool.query(`INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [u.id]);
    return u;
  }
  let u = mem.usersBySub.get(googleSub);
  if (!u) {
    u = { id: mem.seq++, google_sub: googleSub, email, name, avatar };
    mem.usersBySub.set(googleSub, u);
    mem.usersById.set(u.id, u);
    mem.profiles.set(u.id, { favorites: [], providers: {}, installed_games: {}, library: {}, settings: {} });
  } else {
    u.email = email; u.name = name; u.avatar = avatar;
  }
  return u;
}

export async function getUserById(id) {
  const nid = Number(id);
  if (useDb) {
    const res = await pool.query(`SELECT id, google_sub, email, name, avatar FROM users WHERE id=$1`, [nid]);
    return res.rows[0] || null;
  }
  return mem.usersById.get(nid) || null;
}

// ── Email+password accounts (central KYRO account, same profile store) ──
export async function getUserByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  if (useDb) {
    const r = await pool.query(
      `SELECT id, google_sub, email, name, avatar, password_hash, email_verified FROM users WHERE lower(email)=$1 LIMIT 1`,
      [e]
    );
    return r.rows[0] || null;
  }
  for (const u of mem.usersById.values()) {
    if ((u.email || "").toLowerCase() === e) return u;
  }
  return null;
}

export async function createUserEmail({ email, passwordHash }) {
  const e = String(email).trim().toLowerCase();
  const name = e.split("@")[0];
  if (useDb) {
    const res = await pool.query(
      `INSERT INTO users (email, name, password_hash, email_verified) VALUES ($1,$2,$3,TRUE)
       RETURNING id, google_sub, email, name, avatar`,
      [e, name, passwordHash]
    );
    const u = res.rows[0];
    await pool.query(`INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [u.id]);
    return u;
  }
  const u = { id: mem.seq++, google_sub: null, email: e, name, avatar: null, password_hash: passwordHash, email_verified: true };
  mem.usersById.set(u.id, u);
  mem.profiles.set(u.id, { ...DEFAULT_PROFILE });
  return u;
}

export async function setPasswordHash(userId, passwordHash) {
  if (useDb) {
    await pool.query(`UPDATE users SET password_hash=$2 WHERE id=$1`, [Number(userId), passwordHash]);
    return;
  }
  const u = mem.usersById.get(Number(userId));
  if (u) u.password_hash = passwordHash;
}

const DEFAULT_PROFILE = { favorites: [], providers: {}, installed_games: {}, library: {}, settings: {} };

export async function getProfile(userId) {
  const nid = Number(userId);
  if (useDb) {
    const res = await pool.query(
      `SELECT favorites, providers, installed_games, library, settings FROM user_profiles WHERE user_id=$1`,
      [nid]
    );
    if (!res.rows[0]) return { ...DEFAULT_PROFILE };
    const r = res.rows[0];
    return {
      favorites: r.favorites || [],
      providers: r.providers || {},
      installed_games: r.installed_games || {},
      library: r.library || {},
      settings: r.settings || {},
    };
  }
  const p = mem.profiles.get(nid);
  return p ? { ...DEFAULT_PROFILE, ...p } : { ...DEFAULT_PROFILE };
}

export async function saveProfile(userId, patch) {
  const nid = Number(userId);
  if (useDb) {
    // Read-modify-write inside a row-locked transaction: two concurrent
    // writers (e.g. library sync racing installed-games persistence) must
    // never clobber each other's columns.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT user_id FROM user_profiles WHERE user_id=$1 FOR UPDATE`, [nid]);
      const cur = await getProfile(nid);
      const next = {
        favorites: patch.favorites !== undefined ? patch.favorites : cur.favorites,
        providers: patch.providers !== undefined ? patch.providers : cur.providers,
        installed_games: patch.installed_games !== undefined ? patch.installed_games : cur.installed_games,
        library: patch.library !== undefined ? patch.library : cur.library,
        settings: patch.settings !== undefined ? patch.settings : cur.settings,
      };
      await client.query(
        `INSERT INTO user_profiles (user_id, favorites, providers, installed_games, library, settings)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (user_id) DO UPDATE SET
           favorites=EXCLUDED.favorites, providers=EXCLUDED.providers,
           installed_games=EXCLUDED.installed_games, library=EXCLUDED.library,
           settings=EXCLUDED.settings, updated_at=now()`,
        [
          nid,
          JSON.stringify(next.favorites),
          JSON.stringify(next.providers),
          JSON.stringify(next.installed_games),
          JSON.stringify(next.library),
          JSON.stringify(next.settings),
        ]
      );
      await client.query("COMMIT");
      return next;
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally {
      client.release();
    }
  }
  const cur = await getProfile(nid);
  const next = {
    favorites: patch.favorites !== undefined ? patch.favorites : cur.favorites,
    providers: patch.providers !== undefined ? patch.providers : cur.providers,
    installed_games: patch.installed_games !== undefined ? patch.installed_games : cur.installed_games,
    library: patch.library !== undefined ? patch.library : cur.library,
    settings: patch.settings !== undefined ? patch.settings : cur.settings,
  };
  mem.profiles.set(nid, next);
  return next;
}

export function dbEnabled() {
  return useDb;
}

// Health surface for /api/health-style checks: false means the DB init failed
// and the app is running on the ephemeral in-memory fallback.
export function dbHealthyFlag() {
  return dbHealthy;
}

// The owner account (LUNA_USER/LUNA_PASSWORD) is a password account — it has no
// google_sub, so the profile page reports method "password".
export async function getOrCreateOwnerUser() {
  const email = process.env.LUNA_USER || "owner";
  if (useDb) {
    let r = await pool.query(
      `SELECT id, email, name, avatar FROM users WHERE google_sub IS NULL AND name='Owner' LIMIT 1`
    );
    if (r.rows.length === 0) {
      r = await pool.query(
        `INSERT INTO users (email, name) VALUES ($1,$2) RETURNING id, email, name, avatar`,
        [email, "Owner"]
      );
    }
    const u = r.rows[0];
    await pool.query(`INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [u.id]);
    return u;
  }
  for (const u of mem.usersById.values()) {
    if (u.google_sub == null && u.name === "Owner") return u;
  }
  const u = { id: mem.seq++, google_sub: null, email, name: "Owner", avatar: null };
  mem.usersById.set(u.id, u);
  mem.profiles.set(u.id, { favorites: [], providers: {}, installed_games: {}, library: {}, settings: {} });
  return u;
}

// Convenience helpers for the per-user provider-linked accounts.
export async function getProviders(userId) {
  const p = await getProfile(userId);
  return p.providers || {};
}

export async function setProvider(userId, provider, record) {
  const p = await getProfile(userId);
  const providers = { ...(p.providers || {}), [provider]: record };
  await saveProfile(userId, { providers });
  return providers;
}

// Disconnect a provider account: removes the stored record entirely.
export async function removeProvider(userId, provider) {
  const p = await getProfile(userId);
  const providers = { ...(p.providers || {}) };
  delete providers[provider];
  await saveProfile(userId, { providers });
  return providers;
}

export async function getInstalled(userId) {
  const p = await getProfile(userId);
  return p.installed_games || {};
}

export async function setInstalled(userId, installed) {
  await saveProfile(userId, { installed_games: installed });
}
