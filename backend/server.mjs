// Standalone KYRO CLOUD backend server (NO Next.js).
// Runs on Render. Exposes REST API + WebSocket control plane only.
// Reuses the existing Node-compatible lib/*.mjs modules.
import http from "http";
import path from "path";
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
import { signSession, verifySession, SESSION_COOKIE } from "../lib/auth/jwt.mjs";

const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ---------- helpers ----------
function corsHeaders(req) {
  const origin = req.headers.origin;
  // Never reflect "*" with credentials; use the configured FRONTEND_URL.
  const allow = FRONTEND_URL ? FRONTEND_URL : origin || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Credentials": "true",
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
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

function getSessionUser(req) {
  const auth = req.headers["authorization"];
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return verifySession(auth.slice(7).trim());
  }
  const cookie = req.headers.cookie;
  if (cookie) {
    const m = cookie.match(new RegExp(SESSION_COOKIE + "=([^;]+)"));
    if (m) return verifySession(decodeURIComponent(m[1]));
  }
  return null;
}

function requireAuth(req, res) {
  const user = getSessionUser(req);
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
  if (p === "/api/auth/login" && method === "POST") {
    const body = await readJson(req);
    const user = process.env.LUNA_USER || "owner";
    const pass = process.env.LUNA_PASSWORD || "change-me";
    if (body.username !== user || body.password !== pass) {
      return sendJson(req, res, 401, { ok: false, error: "Invalid credentials" });
    }
    const token = await signSession(user);
    res.setHeader(
      "Set-Cookie",
      `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`
    );
    return sendJson(req, res, 200, { ok: true, data: { user, token } });
  }
  if (p === "/api/auth/logout" && method === "POST") {
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0`);
    return sendJson(req, res, 200, { ok: true });
  }

  // everything else requires auth
  const user = requireAuth(req, res);
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
  if (p === "/api/files/list" && method === "GET") {
    const dir = url.searchParams.get("path") || "/";
    return sendJson(req, res, 200, { ok: true, data: listDir(dir) });
  }
  if (p === "/api/files/mkdir" && method === "POST") {
    const body = await readJson(req);
    if (!body.name) return sendJson(req, res, 400, { ok: false, error: "Missing name" });
    const ok = createFolder(body.path || "/", body.name);
    return sendJson(req, res, ok ? 200 : 400, { ok });
  }
  if (p === "/api/files/delete" && method === "DELETE") {
    const fp = url.searchParams.get("path");
    if (!fp) return sendJson(req, res, 400, { ok: false, error: "Missing path" });
    const ok = remove(fp);
    return sendJson(req, res, ok ? 200 : 400, { ok });
  }
  if (p === "/api/files/rename" && method === "POST") {
    const body = await readJson(req);
    if (!body.path || !body.newName)
      return sendJson(req, res, 400, { ok: false, error: "Missing fields" });
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
    const ok = writeFile(target, filePart.content);
    return sendJson(req, res, ok ? 200 : 400, { ok });
  }
  if (p === "/api/files/download" && method === "GET") {
    const fp = url.searchParams.get("path");
    if (!fp) return sendJson(req, res, 400, { ok: false, error: "Missing path" });
    const data = readFile(fp);
    if (!data) return sendJson(req, res, 404, { ok: false, error: "Not found" });
    res.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${path.basename(fp)}"`,
      ...corsHeaders(req),
    });
    return res.end(Buffer.from(data));
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
