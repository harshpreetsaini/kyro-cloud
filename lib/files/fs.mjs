import fs from "fs";
import path from "path";
import os from "os";

const BASE = process.env.FILES_BASE || path.join(process.cwd(), "data", "files");

export function ensureBase() {
  if (!fs.existsSync(BASE)) {
    fs.mkdirSync(BASE, { recursive: true });
    fs.mkdirSync(path.join(BASE, "Games"), { recursive: true });
    fs.mkdirSync(path.join(BASE, "Downloads"), { recursive: true });
    fs.mkdirSync(path.join(BASE, "Mods"), { recursive: true });
  }
  return BASE;
}

function safeResolve(p) {
  const base = ensureBase();
  const target = path.resolve(base, "." + path.posix.join("/", p || ""));
  const rel = path.relative(base, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return target;
}

export function listDir(p = "/") {
  const target = safeResolve(p);
  if (!target || !fs.existsSync(target)) return [];
  const entries = fs.readdirSync(target, { withFileTypes: true });
  return entries
    .map((e) => ({
      name: e.name,
      path: path.posix.join(p.replace(/\/$/, ""), e.name),
      type: e.isDirectory() ? "directory" : "file",
      sizeBytes: e.isDirectory() ? null : fs.statSync(path.join(target, e.name)).size,
      modified: fs.statSync(path.join(target, e.name)).mtime.toISOString(),
    }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1));
}

export function createFolder(p, name) {
  const target = safeResolve(path.posix.join(p, name));
  if (!target) return false;
  fs.mkdirSync(target, { recursive: true });
  return true;
}

export function remove(p) {
  const target = safeResolve(p);
  if (!target) return false;
  fs.rmSync(target, { recursive: true, force: true });
  return true;
}

export function rename(p, newName) {
  const target = safeResolve(p);
  if (!target) return false;
  const dest = path.join(path.dirname(target), newName);
  if (path.relative(ensureBase(), dest).startsWith("..")) return false;
  fs.renameSync(target, dest);
  return true;
}

export function writeFile(p, buffer) {
  const target = safeResolve(p);
  if (!target) return false;
  fs.writeFileSync(target, Buffer.from(buffer));
  return true;
}

export function readFile(p) {
  const target = safeResolve(p);
  if (!target || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return null;
  return fs.readFileSync(target);
}

export function stat(p) {
  const target = safeResolve(p);
  if (!target || !fs.existsSync(target)) return null;
  return fs.statSync(target);
}

