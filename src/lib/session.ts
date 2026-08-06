/**
 * Session token signing/verification.
 *
 * Kept free of Node-only APIs (`node:crypto`, `next/headers`) so the Edge
 * middleware can import it to gate /admin routes. Cookie handling and the
 * credential check live in `auth.ts`, which is server-only.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "phade_admin_session";

export type AdminSession = { email: string };

function sessionSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET is missing or shorter than 32 characters.",
    );
  }
  return new TextEncoder().encode(secret);
}

export function sessionHours(): number {
  const raw = Number(process.env.ADMIN_SESSION_HOURS);
  return Number.isFinite(raw) && raw > 0 ? raw : 12;
}

export async function signSession(
  email: string,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setSubject(email)
    .setExpirationTime(expiresAt)
    .sign(sessionSecret());
}

/** Returns the session, or null when the token is missing/expired/forged. */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    const email = typeof payload.sub === "string" ? payload.sub : null;
    if (!email || payload.role !== "admin") return null;
    return { email };
  } catch {
    return null;
  }
}
