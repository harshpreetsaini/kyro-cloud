export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
export const API_WS = API_URL ? API_URL.replace(/^http/, "ws") : "";

export function api(path: string): string {
  return API_URL ? `${API_URL.replace(/\/$/, "")}${path}` : path;
}

export function wsUrl(path: string): string {
  return API_WS ? `${API_WS.replace(/\/$/, "")}${path}` : path;
}
