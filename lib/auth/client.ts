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
