// Plain-JS JWT helper (mirrors lib/auth/jwt.ts) for the standalone backend.
// The backend runs as a plain Node process (.mjs) and cannot import the .ts file.
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "change-me-in-production");

export async function signSession(user, userId = null) {
  return await new SignJWT({ user, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token) {
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
