// Plain-JS JWT helper (mirrors lib/auth/jwt.ts) for the standalone backend.
// The backend runs as a plain Node process (.mjs) and cannot import the .ts file.
import { SignJWT, jwtVerify } from "jose";

// Fail closed: a missing signing secret must never silently fall back to a
// public constant (that would let anyone mint valid session JWTs).
const AUTH_SECRET = process.env.AUTH_SECRET || "";
if (!AUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_SECRET is not set — refusing to sign/verify sessions with a default secret.");
}
const secret = new TextEncoder().encode(AUTH_SECRET || "change-me-in-production");

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
