import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "change-me-in-production");

export async function signSession(user: string): Promise<string> {
  return await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token?: string): Promise<{ user: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { user: String(payload.user || "") };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "luna_session";
