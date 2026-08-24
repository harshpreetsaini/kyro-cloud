import crypto from "crypto";

// scrypt parameters (OWASP-recommended baseline)
const N = 16384, r = 8, p = 1, KEYLEN = 64;

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const dk = crypto.scryptSync(pw, salt, KEYLEN, { N, r, p }).toString("hex");
  return `scrypt$${salt}$${dk}`;
}

export function verifyPassword(pw: string, stored: string | null | undefined): boolean {
  try {
    const parts = String(stored || "").split("$"); // scrypt$salt$key
    if (parts.length !== 3 || parts[0] !== "scrypt") return false;
    const dk = crypto.scryptSync(pw, parts[1], KEYLEN, { N, r, p });
    const expected = Buffer.from(parts[2], "hex");
    return dk.length === expected.length && crypto.timingSafeEqual(dk, expected);
  } catch {
    return false;
  }
}

export function isStrongPassword(pw: string): boolean {
  return typeof pw === "string" && pw.length >= 8 && pw.length <= 200;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || ""));
}
