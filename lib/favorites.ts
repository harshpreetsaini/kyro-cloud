"use client";

// Favorites persistence. The backend user profile is the source of truth (so
// favorites sync across devices and survive clearing browser storage). A local
// cache (memory + localStorage) keeps the existing synchronous API usable by the
// UI; writes are pushed to the backend asynchronously when a session exists.

import { authHeader, getToken } from "@/lib/auth/client";

const KEY = "kyro_favorites_cache";
let cache: string[] | null = null;

function readCache(): string[] {
  if (cache) return cache;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      cache = raw ? JSON.parse(raw) : [];
    } catch {
      cache = [];
    }
  } else {
    cache = [];
  }
  return cache || [];
}

function writeCache(ids: string[]): void {
  cache = ids;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* ignore quota / private mode errors */
    }
  }
}

async function pushToBackend(ids: string[]): Promise<void> {
  if (!getToken()) return;
  try {
    await fetch("/api/user/profile", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeader() },
      body: JSON.stringify({ favorites: ids }),
    });
  } catch {
    /* offline — local cache remains source until next push */
  }
}

// Hydrate the cache from the user profile (Vercel Postgres). Call on login / app mount.
export async function loadFavorites(): Promise<string[]> {
  if (!getToken()) return readCache();
  try {
    const res = await fetch("/api/user/profile", { headers: { ...authHeader() } });
    const j = await res.json();
    if (j.ok && Array.isArray(j.data?.profile?.favorites)) {
      writeCache(j.data.profile.favorites);
    }
  } catch {
    /* offline — keep local cache */
  }
  return readCache();
}

export function getFavorites(): string[] {
  return readCache();
}

export function isFavorite(id: string): boolean {
  return readCache().includes(id);
}

export function addFavorite(id: string): void {
  const ids = readCache();
  if (!ids.includes(id)) {
    writeCache([...ids, id]);
    pushToBackend(readCache());
  }
}

export function removeFavorite(id: string): void {
  writeCache(readCache().filter((x) => x !== id));
  pushToBackend(readCache());
}

export function toggleFavorite(id: string): boolean {
  const ids = readCache();
  if (ids.includes(id)) {
    removeFavorite(id);
    return false;
  }
  addFavorite(id);
  return true;
}
