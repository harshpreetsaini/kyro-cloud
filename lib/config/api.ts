export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const API_WS = API_URL ? API_URL.replace(/^http/, "ws") : "";

export function api(path: string): string {
  return API_URL ? `${API_URL.replace(/\/$/, "")}${path}` : path;
}

export function wsUrl(path: string): string {
  if (API_WS) return `${API_WS.replace(/\/$/, "")}${path}`;
  // Defensive fallback: connect directly to the Render backend (avoids any
  // Vercel WebSocket-proxy hop that would inflate control latency).
  if (typeof window !== "undefined") {
    return `wss://kyro-cloud-3fp0.onrender.com${path}`;
  }
  return `ws://localhost:3000${path}`;
}
