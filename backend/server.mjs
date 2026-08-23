// Standalone KYRO CLOUD backend server (NO Next.js).
// Runs on Render. Exposes REST API + WebSocket control plane only.
// Reuses the existing Node-compatible lib/*.mjs modules.
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { setupWebSocket } from "../lib/ws/server.mjs";
import { getManager } from "../lib/runtime/manager.mjs";
import {
  listDir,
  createFolder,
  remove,
  rename,
  writeFile,
  readFile,
} from "../lib/files/fs.mjs";
import { getGames } from "../lib/games/library.mjs";
import { verifySession, SESSION_COOKIE } from "../lib/auth/jwt.mjs";

const FRONTEND_URL = (process.env.FRONTEND_URL || "https://kyro-cloud.vercel.app").trim();
const PORT = parseInt(process.env.PORT || "3000", 10);

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ---------- helpers ----------
function safeEq(a, b) {
  const ab = Buffer.from(String(a ?? ""));
  const bb = Buffer.from(String(b ?? ""));
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function corsHeaders(req) {
  // Strict origin check — never reflect an arbitrary origin with credentials.
  const origin = req.headers.origin;
  const allow = FRONTEND_URL || "*";
  const value = !origin || origin === FRONTEND_URL ? allow : FRONTEND_URL;
  return {
    "Access-Control-Allow-Origin": value,
    "Access-Control-Allow-Credentials": value !== "*" ? "true" : undefined,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}

function sendJson(req, res, status, body, extra = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    ...corsHeaders(req),
    ...extra,
  });
  res.end(data);
}

function sendHtmlError(res, message) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>KYRO CLOUD</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0b0f;color:#e5e7eb;display:flex;min-height:100vh;align-items:center;justify-content:center}
.panel{background:#15151c;padding:28px 32px;border-radius:14px;border:1px solid #2a2a33;max-width:460px;text-align:center}
h1{font-size:18px;margin:0 0 10px}button{margin-top:16px;background:#6366f1;color:#fff;border:0;padding:9px 16px;border-radius:9px;cursor:pointer}
a{color:#fff;text-decoration:none}</style></head>
<body><div class="panel"><h1>KYRO CLOUD</h1><p>${message}</p>
<button onclick="location.href='${FRONTEND_URL}'">Back to KYRO CLOUD</button></div></body></html>`;
  res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB — uploads are small config/JSON

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (c) => {
      total += c.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function readJson(req) {
  return readBody(req).then((buf) => {
    if (!buf.length) return {};
    try {
      return JSON.parse(buf.toString("utf8"));
    } catch {
      return {};
    }
  });
}

// ---------- linked provider accounts (per-user, persisted in user profiles) ----------
// Steam/Epic/GOG credentials are encrypted at rest (AES-256-GCM, key derived
// from RUNTIME_AUTH_SECRET) so a leak of the database never discloses plaintext
// credentials. The source of truth is each user's profile row; we keep a small
// in-memory cache of the active user's linked accounts for fast agent relay.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
let _keyWarned = false;
function _secretKey() {
  // Dedicated credential key first; falls back to shared secrets that are
  // provisioned on BOTH sides (backend + Vercel) — order must match
  // app/api/provider/link/route.ts exactly.
  const secret =
    process.env.CREDENTIAL_SECRET ||
    process.env.BACKEND_SERVICE_KEY ||
    process.env.RUNTIME_AUTH_SECRET ||
    "";
  if (!secret && !_keyWarned) {
    _keyWarned = true;
    console.error("[creds] No CREDENTIAL_SECRET/BACKEND_SERVICE_KEY/RUNTIME_AUTH_SECRET set — storing provider credentials obfuscated only. Set a secret to enable AES-256-GCM at rest.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}
function encryptSecret(plain) {
  const s = String(plain ?? "");
  if (!s) return "";
  try {
    const key = _secretKey();
    if (!process.env.CREDENTIAL_SECRET && !process.env.RUNTIME_AUTH_SECRET && !process.env.BACKEND_SERVICE_KEY) {
      // Reversible obfuscation fallback (never plaintext) when no key material exists.
      return "obf:" + Buffer.from(s, "utf8").toString("base64");
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(s, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
  } catch {
    return "";
  }
}
function decryptSecret(cipher) {
  const c = String(cipher || "");
  if (!c) return "";
  try {
    if (c.startsWith("obf:")) return Buffer.from(c.slice(4), "base64").toString("utf8");
    const [ivH, tagH, encH] = c.split(":");
    if (!ivH || !tagH || !encH) return "";
    const key = _secretKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivH, "hex"));
    decipher.setAuthTag(Buffer.from(tagH, "hex"));
    const dec = Buffer.concat([decipher.update(Buffer.from(encH, "hex")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}
// Stored record -> wire form for the cloud agent (decrypts creds at the edge).
function toWireProvider(rec) {
  if (!rec) return rec;
  const out = { ...rec };
  if (out.passwordEnc) { out.password = decryptSecret(out.passwordEnc); delete out.passwordEnc; }
  if (out.accessTokenEnc) { out.accessToken = decryptSecret(out.accessTokenEnc); delete out.accessTokenEnc; }
  if (out.refreshTokenEnc) { out.refreshToken = decryptSecret(out.refreshTokenEnc); delete out.refreshTokenEnc; }
  return out;
}
// Incoming record (plaintext creds from agent) -> stored form (ciphertext).
function toStoredProvider(rec) {
  if (!rec) return rec;
  const out = { ...rec };
  if (out.password) { out.passwordEnc = encryptSecret(out.password); delete out.password; }
  if (out.accessToken) { out.accessTokenEnc = encryptSecret(out.accessToken); delete out.accessToken; }
  if (out.refreshToken) { out.refreshTokenEnc = encryptSecret(out.refreshToken); delete out.refreshToken; }
  return out;
}

// Active-user linked cache (per the currently authenticated WS client). Used to
// feed the cloud agent after restarts without exposing other users' creds.
let activeLinked = {};
globalThis.__getActiveLinked = () => activeLinked;
globalThis.__setActiveLinked = (v) => { activeLinked = v || {}; };

// Durable backend store for linked provider accounts (survives backend
// restarts without depending on the browser being connected or Vercel).
// Written atomically (tmp+rename) and encrypted at rest.
const LINKS_FILE = path.join(DATA_DIR, "provider_links.json");
function loadLinked() {
  try {
    const raw = fs.readFileSync(LINKS_FILE, "utf8");
    const d = JSON.parse(raw);
    if (d && typeof d === "object") {
      // Decrypt into the in-memory (plaintext, agent-facing) cache.
      for (const [p, rec] of Object.entries(d)) {
        try { activeLinked[p] = toWireProvider(rec); } catch {}
      }
    }
  } catch (e) {
    if (e && e.code !== "ENOENT") {
      console.error("[provider/link] failed to load links file:", e && e.message ? e.message : e);
    }
  }
}
function saveLinked() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const stored = {};
    for (const [p, rec] of Object.entries(activeLinked)) {
      try { stored[p] = toStoredProvider(rec); } catch { stored[p] = { ...rec }; }
    }
    const tmp = LINKS_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(stored));
    fs.renameSync(tmp, LINKS_FILE);
  } catch (e) {
    console.error("[provider/link] failed to persist links file:", e && e.message ? e.message : e);
  }
}
loadLinked();

// Persist a linked account into the durable Vercel Postgres store (via the
// frontend's /api/provider/link service-key endpoint). Used so provider links
// survive backend restarts. Skipped when the call already came FROM Vercel
// (service key) to avoid a relay loop.
async function persistLinkedToVercel(provider, record, userId) {
  const svc = process.env.BACKEND_SERVICE_KEY;
  const base = FRONTEND_URL;
  if (!svc || !base) return;
  try {
    await fetch(`${base}/api/provider/link`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-service-key": svc },
      body: JSON.stringify({ ...record, provider, userId }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.error("[provider/link] persist to Vercel failed:", e && e.message ? e.message : e);
  }
}

// Read a linked account from the durable Vercel store (used when our
// in-memory cache is empty, e.g. after a backend restart) so the cloud agent
// can keep installing under the user's account without a re-link.
async function fetchLinkedFromVercel(provider) {
  const svc = process.env.BACKEND_SERVICE_KEY;
  const base = FRONTEND_URL;
  const userId = getManager().activeUserId ?? "owner";
  if (!svc || !base) return null;
  try {
    const r = await fetch(
      `${base}/api/provider/link?provider=${encodeURIComponent(provider)}&userId=${userId}`,
      { headers: { "x-service-key": svc }, signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j.data || null;
  } catch (e) {
    console.error("[provider/link] read from Vercel failed:", e && e.message ? e.message : e);
    return null;
  }
}

// Minimal multipart/form-data parser (handles text fields + binary files).
function parseMultipart(buffer, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!m) return null;
  const boundary = "--" + (m[1] || m[2]).trim();
  const parts = [];
  let idx = buffer.indexOf(boundary);
  if (idx === -1) return null;
  idx += boundary.length;
  while (idx < buffer.length) {
    if (buffer[idx] === 0x2d && buffer[idx + 1] === 0x2d) break; // closing "--"
    if (buffer[idx] === 0x0d) idx += 2; // skip leading \r\n
    const headerEnd = buffer.indexOf("\r\n\r\n", idx);
    if (headerEnd === -1) break;
    const headerStr = buffer.toString("utf8", idx, headerEnd);
    const contentStart = headerEnd + 4;
    const next = buffer.indexOf(boundary, contentStart);
    if (next === -1) break;
    let contentEnd = next;
    if (buffer[contentEnd - 2] === 0x0d && buffer[contentEnd - 1] === 0x0a) contentEnd -= 2;
    const content = buffer.subarray(contentStart, contentEnd);
    const cd = /content-disposition:[^\r\n]*/i.exec(headerStr);
    const name = /name="([^"]+)"/i.exec(cd ? cd[0] : "");
    const filename = /filename="([^"]+)"/i.exec(cd ? cd[0] : "");
    parts.push({
      name: name ? name[1] : "",
      filename: filename ? filename[1] : null,
      content,
    });
    idx = next + boundary.length;
  }
  return parts;
}

async function getSessionUser(req) {
  const auth = req.headers["authorization"];
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return await verifySession(auth.slice(7).trim());
  }
  const cookie = req.headers.cookie;
  if (cookie) {
    const m = cookie.match(new RegExp(SESSION_COOKIE + "=([^;]+)"));
    if (m) return await verifySession(decodeURIComponent(m[1]));
  }
  return null;
}

async function requireAuth(req, res) {
  const user = await getSessionUser(req);
  if (!user) {
    sendJson(req, res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }
  return user;
}

// ---------- request handling ----------
async function handleApi(req, res, url) {
  const p = url.pathname;
  const method = req.method;

  // public
  if (p === "/api/health" || p === "/health") {
    return sendJson(req, res, 200, { ok: true, service: "kyro-cloud-backend", time: Date.now() });
  }
  // NOTE: Authentication (password + Google OAuth) and all user-account data
  // (profiles, favorites, provider links) are owned by the Vercel frontend
  // (Next.js serverless + Vercel Postgres). This backend is the runtime/agent
  // relay only and never touches the user database.


  // Linked provider accounts — relay-only cache for the cloud agent.
  // The durable, per-user store lives in Vercel Postgres (frontend). This
  // backend keeps the active user's linked creds in memory so it can relay
  // them to the agent for installs within the session.
  if (p === "/api/provider/link") {
    const svcKey = process.env.BACKEND_SERVICE_KEY;
    const agentToken = req.headers["x-agent-token"];
    const secret = process.env.RUNTIME_AUTH_SECRET;
    const authedByService = !!svcKey && safeEq(req.headers["x-service-key"], svcKey);
    const authedByAgent = !!secret && !!agentToken && safeEq(agentToken, secret);
    let authedBySession = false;
    if (!authedByService && !authedByAgent) {
      const u = await requireAuth(req, res);
      if (!u) return;
      authedBySession = true;
    }
    const mgr = getManager();

    if (method === "POST") {
      const body = await readJson(req);
      if (!body || !body.provider) return sendJson(req, res, 400, { ok: false, error: "Missing provider" });
      const provider = body.provider;
      const record = {
        username: body.username || "",
        password: body.password || "",
        accountId: body.accountId || "",
        accessToken: body.accessToken || "",
        refreshToken: body.refreshToken || "",
        error: body.error || "",
        linkedAt: Date.now(),
      };
      // Runtime cache for agent relay (plaintext, in-memory only).
      activeLinked[provider] = record;
      saveLinked();
      if (mgr.activeUserId == null) {
        const tok = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
        const u = await verifySession(tok);
        if (u && u.userId != null) mgr.activeUserId = u.userId;
      }
      // Persist to Vercel Postgres (durable) unless this call already came from
      // Vercel (service key), which would create a relay loop. Fall back to the
      // owner account when no browser WS session has attributed an activeUserId
      // yet, so links survive backend restarts regardless of client timing.
      if (!authedByService) {
        const uid = mgr.activeUserId != null ? mgr.activeUserId : "owner";
        persistLinkedToVercel(provider, record, uid).catch(() => {});
      }
      mgr.broadcast({
        type: "provider.login.result",
        payload: { provider, ok: true, username: body.username || undefined, error: body.error || undefined },
        ts: Date.now(),
      });
      if (provider === "steam") {
        mgr.broadcast({
          type: "provider.entitlement",
          payload: { provider: "steam", username: body.username, appIds: [] },
          ts: Date.now(),
        });
      }
      // Relay to the cloud agent so installs run under this account.
      mgr.sendToAgent({ type: "provider.linked", payload: record });
      return sendJson(req, res, 200, { ok: true });
    }
    if (method === "GET") {
      const provider = url.searchParams.get("provider");
      // Secrets are only for the agent/service paths. A plain session user
      // gets a redacted record (username/accountId/linkedAt only).
      const redact = (rec) => {
        if (!rec || !authedBySession) return rec;
        const { password, accessToken, refreshToken, ...rest } = rec;
        return rest;
      };
      if (provider) {
        let rec = activeLinked[provider] || null;
        if (!rec && !authedBySession) {
          // Durable fallback: the in-memory cache is gone (backend restart),
          // but the link was persisted to Vercel — recover it for the agent.
          try {
            const durable = await fetchLinkedFromVercel(provider);
            if (durable) {
              activeLinked[provider] = durable;
              saveLinked();
              rec = durable;
            }
          } catch {}
        }
        return sendJson(req, res, 200, { ok: true, data: redact(rec) });
      }
      return sendJson(req, res, 200, { ok: true, data: redact(activeLinked) });
    }
    if (method === "DELETE") {
      const provider = url.searchParams.get("provider");
      if (!provider) return sendJson(req, res, 400, { ok: false, error: "Missing provider" });
      delete activeLinked[provider];
      saveLinked();
      // Tell the agent to wipe its local creds for this provider.
      mgr.sendToAgent({ type: "provider.logout", payload: { provider } });
      // Instant UI feedback: the linked state is gone.
      mgr.broadcast({
        type: "provider.login.result",
        payload: { provider, ok: false },
        ts: Date.now(),
      });
      return sendJson(req, res, 200, { ok: true });
    }
    return sendJson(req, res, 405, { ok: false, error: "Method not allowed" });
  }

  // Epic device-link (account linking without a registered Epic OAuth app):
  // start returns legendary's official login URL; complete exchanges the
  // user-pasted authorizationCode via legendary on the agent.
  if (p === "/api/provider/epic/devicelink" && method === "POST") {
    const u = await requireAuth(req, res);
    if (!u) return;
    const body = await readJson(req);
    const mgr = getManager();
    if (body.action === "start") {
      if (!mgr.agentAttached) return sendJson(req, res, 503, { ok: false, error: "Runtime agent not connected" });
      mgr.sendToAgent({ type: "provider.epic.auth.start", payload: {} });
      try {
        const ev = await mgr.waitAgentEvent("provider.epic.auth.url", 30000);
        const url2 = ev?.payload?.url;
        if (!ev?.payload?.ok || !url2) {
          return sendJson(req, res, 502, { ok: false, error: ev?.payload?.error || "agent returned no login URL" });
        }
        return sendJson(req, res, 200, { ok: true, data: { loginUrl: url2 } });
      } catch {
        return sendJson(req, res, 504, { ok: false, error: "Timed out waiting for login URL from the runtime agent" });
      }
    }
    if (body.action === "complete") {
      const code = String(body.code || "").trim();
      if (!code) return sendJson(req, res, 400, { ok: false, error: "Missing code" });
      if (!mgr.agentAttached) return sendJson(req, res, 503, { ok: false, error: "Runtime agent not connected" });
      mgr.sendToAgent({ type: "provider.epic.auth.complete", payload: { code } });
      try {
        const ev = await mgr.waitAgentEvent("provider.link.result", 60000);
        const ok = !!ev?.payload?.ok;
        mgr.broadcast({
          type: "provider.login.result",
          payload: { provider: "epic", ok, username: ev?.payload?.username || undefined, error: ev?.payload?.error },
          ts: Date.now(),
        });
        return sendJson(req, res, ok ? 200 : 400, {
          ok,
          data: { username: ev?.payload?.username || null },
          error: ok ? undefined : ev?.payload?.error || "Epic link failed",
        });
      } catch {
        return sendJson(req, res, 504, { ok: false, error: "Timed out waiting for the Epic link result" });
      }
    }
    return sendJson(req, res, 400, { ok: false, error: "Unknown action" });
  }

  // everything else requires auth
  const user = await requireAuth(req, res);
  if (!user) return;

  const m = getManager();

  if (p === "/api/runtime/status" && method === "GET") {
    return sendJson(req, res, 200, { ok: true, data: m.sessionInfo() });
  }
  if (p === "/api/runtime/start" && method === "POST") {
    const result = await m.start();
    return sendJson(req, res, result.ok ? 200 : 500, result);
  }
  if (p === "/api/runtime/stop" && method === "POST") {
    const result = await m.stop();
    return sendJson(req, res, result.ok ? 200 : 500, result);
  }
  if (p === "/api/runtime/restart" && method === "POST") {
    const result = await m.restart();
    return sendJson(req, res, result.ok ? 200 : 500, result);
  }
  if (p === "/api/system/info" && method === "GET") {
    return sendJson(req, res, 200, { ok: true, data: m.systemInfo });
  }
  if ((p === "/api/system/performance" || p === "/api/system/stats") && method === "GET") {
    return sendJson(req, res, 200, { ok: true, data: m.stats });
  }
  if (p === "/api/games" && method === "GET") {
    return sendJson(req, res, 200, { ok: true, data: getGames() });
  }
  if (p === "/api/games/launch" && method === "POST") {
    const body = await readJson(req);
    if (!body.id) return sendJson(req, res, 400, { ok: false, error: "Missing game id" });
    const result = m.launchGame(body.id);
    if (result.ok && result.data) m.notify(`Launching ${result.data.name}...`, "info");
    return sendJson(req, res, result.ok ? 200 : 404, result);
  }
  if (p === "/api/apps" && method === "GET") {
    return sendJson(req, res, 200, { ok: true, data: m.getApps() });
  }
  if (p === "/api/apps/launch" && method === "POST") {
    const body = await readJson(req);
    if (!body.id) return sendJson(req, res, 400, { ok: false, error: "Missing app id" });
    const result = m.launchApp(body.id);
    return sendJson(req, res, result.ok ? 200 : 400, result);
  }
  if (p === "/api/apps/stop" && method === "POST") {
    const body = await readJson(req);
    if (!body.id) return sendJson(req, res, 400, { ok: false, error: "Missing app id" });
    const result = m.stopApp(body.id);
    return sendJson(req, res, result.ok ? 200 : 400, result);
  }
  // -----------------------------------------------------------------------
  // File operations — proxied to Colab agent when connected, fallback to local
  // -----------------------------------------------------------------------
  async function filesAgent(rid, type, payload) {
    if (!m.agentAttached) return null;
    m.sendToAgent({ type, payload: { ...payload, requestId: rid } });
    try {
      return await m.waitForAgentResult(rid, 15000);
    } catch {
      return null;
    }
  }

  if (p === "/api/files/list" && method === "GET") {
    const dir = url.searchParams.get("path") || "/";
    const rid = "fl-" + uid();
    const result = await filesAgent(rid, "files.list", { path: dir });
    if (result) {
      return sendJson(req, res, result.ok ? 200 : 500, { ok: result.ok, data: result.items, error: result.error });
    }
    // Fallback to local filesystem if agent is not connected
    return sendJson(req, res, 200, { ok: true, data: listDir(dir) });
  }
  if (p === "/api/files/mkdir" && method === "POST") {
    const body = await readJson(req);
    if (!body.name) return sendJson(req, res, 400, { ok: false, error: "Missing name" });
    const dirPath = (body.path || "/").replace(/\/$/, "") + "/" + body.name;
    const rid = "fm-" + uid();
    const result = await filesAgent(rid, "files.mkdir", { path: dirPath });
    if (result) {
      return sendJson(req, res, result.ok ? 200 : 500, { ok: result.ok, error: result.error });
    }
    const ok = createFolder(body.path || "/", body.name);
    return sendJson(req, res, ok ? 200 : 400, { ok });
  }
  if (p === "/api/files/delete" && method === "DELETE") {
    const fp = url.searchParams.get("path");
    if (!fp) return sendJson(req, res, 400, { ok: false, error: "Missing path" });
    const rid = "fd-" + uid();
    const result = await filesAgent(rid, "files.delete", { path: fp });
    if (result) {
      return sendJson(req, res, result.ok ? 200 : 500, { ok: result.ok, error: result.error });
    }
    const ok = remove(fp);
    return sendJson(req, res, ok ? 200 : 400, { ok });
  }
  if (p === "/api/files/rename" && method === "POST") {
    const body = await readJson(req);
    if (!body.path || !body.newName)
      return sendJson(req, res, 400, { ok: false, error: "Missing fields" });
    const rid = "fr-" + uid();
    const result = await filesAgent(rid, "files.rename", { path: body.path, newName: body.newName });
    if (result) {
      return sendJson(req, res, result.ok ? 200 : 500, { ok: result.ok, error: result.error });
    }
    const ok = rename(body.path, body.newName);
    return sendJson(req, res, ok ? 200 : 400, { ok });
  }
  if (p === "/api/files/upload" && method === "POST") {
    const buf = await readBody(req);
    const parts = parseMultipart(buf, req.headers["content-type"]);
    if (!parts) return sendJson(req, res, 400, { ok: false, error: "Bad upload" });
    const filePart = parts.find((pp) => pp.filename != null);
    const dirPart = parts.find((pp) => pp.name === "path");
    if (!filePart)
      return sendJson(req, res, 400, { ok: false, error: "No file" });
    const dir = dirPart ? dirPart.content.toString("utf8") : "/";
    const target = path.posix.join(dir.replace(/\/$/, ""), filePart.filename);
    const rid = "fu-" + uid();
    const result = await filesAgent(rid, "files.write", {
      path: target,
      content: Array.from(filePart.content),
    });
    if (result) {
      return sendJson(req, res, result.ok ? 200 : 500, { ok: result.ok, error: result.error });
    }
    const ok = writeFile(target, filePart.content);
    return sendJson(req, res, ok ? 200 : 400, { ok });
  }
  if (p === "/api/files/download" && method === "GET") {
    const fp = url.searchParams.get("path");
    if (!fp) return sendJson(req, res, 400, { ok: false, error: "Missing path" });
    const rid = "fdl-" + uid();
    const result = await filesAgent(rid, "files.read", { path: fp });
    if (result) {
      if (!result.ok) return sendJson(req, res, 404, { ok: false, error: result.error });
      const buf = Buffer.from(result.data);
      res.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${path.basename(fp)}"`,
        ...corsHeaders(req),
      });
      return res.end(buf);
    }
    const data = readFile(fp);
    if (!data) return sendJson(req, res, 404, { ok: false, error: "Not found" });
    res.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${path.basename(fp)}"`,
      ...corsHeaders(req),
    });
    return res.end(Buffer.from(data));
  }
  // -----------------------------------------------------------------------
  // Clipboard operations — proxied to Colab agent
  // -----------------------------------------------------------------------
  async function clipboardAgent(rid, type, payload) {
    if (!m.agentAttached) return null;
    m.sendToAgent({ type, payload: { ...payload, requestId: rid } });
    try {
      return await m.waitForAgentResult(rid, 10000);
    } catch {
      return null;
    }
  }

  if (p === "/api/clipboard" && method === "GET") {
    const rid = "cg-" + uid();
    const result = await clipboardAgent(rid, "clipboard.get", {});
    if (result) {
      return sendJson(req, res, 200, { ok: result.ok, data: { text: result.text || "" }, error: result.error });
    }
    return sendJson(req, res, 503, { ok: false, error: "Agent not connected" });
  }
  if (p === "/api/clipboard" && method === "POST") {
    const body = await readJson(req);
    const text = typeof body.text === "string" ? body.text : "";
    const rid = "cs-" + uid();
    const result = await clipboardAgent(rid, "clipboard.set", { text });
    if (result) {
      return sendJson(req, res, 200, { ok: result.ok, error: result.error });
    }
    return sendJson(req, res, 503, { ok: false, error: "Agent not connected" });
  }
  if (p === "/api/stream/session" && method === "GET") {
    if (!m.stream) return sendJson(req, res, 409, { ok: false, error: "No active stream" });
    return sendJson(req, res, 200, { ok: true, data: m.stream });
  }

  return sendJson(req, res, 404, { ok: false, error: "Not found" });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(req));
    return res.end();
  }

  // Non-API paths: backend serves no frontend. Return 404 (or health text).
  if (!url.pathname.startsWith("/api/") && url.pathname !== "/health") {
    return sendJson(req, res, 404, {
      ok: false,
      error: "Not found. This is the KYRO CLOUD backend API. Frontend is served from Vercel.",
    });
  }

  handleApi(req, res, url).catch((err) => {
    console.error("[api error]", err);
    if (!res.headersSent) sendJson(req, res, 500, { ok: false, error: "Internal error" });
  });
});

setupWebSocket(server);
getManager(); // initialize runtime manager eagerly

server.listen(PORT, () => {
  console.log(`[kyro-cloud-backend] listening on :${PORT} (frontend: ${FRONTEND_URL || "any"})`);
});
