export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("luna_token");
}
export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem("luna_token", t);
  else localStorage.removeItem("luna_token");
}
export function authHeader(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Mirrors the backend's session cookie so the Next.js middleware (which can only
// read cookies, not localStorage) accepts Google-sign-in sessions too.
export function setSessionCookie(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `luna_session=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}
