"use client";

// Client-side favorites persistence (localStorage). Kept simple and synchronous
// so both the game detail page and the Favorites page read the same source.

const KEY = "kyro_favorites";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / private mode errors */
  }
}

export function getFavorites(): string[] {
  return read();
}

export function isFavorite(id: string): boolean {
  return read().includes(id);
}

export function addFavorite(id: string): void {
  const ids = read();
  if (!ids.includes(id)) {
    ids.push(id);
    write(ids);
  }
}

export function removeFavorite(id: string): void {
  write(read().filter((x) => x !== id));
}

export function toggleFavorite(id: string): boolean {
  const ids = read();
  if (ids.includes(id)) {
    removeFavorite(id);
    return false;
  }
  addFavorite(id);
  return true;
}
