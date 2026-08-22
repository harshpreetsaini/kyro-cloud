import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "change-me-in-production");

export async function signSession(user: string, userId: number | null = null): Promise<string> {
  return await new SignJWT({ user, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token?: string): Promise<{ user: string; userId: number | null } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      user: String(payload.user || ""),
      userId: payload.userId != null ? Number(payload.userId) : null,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "luna_session";
