import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  type AdminSession,
  sessionHours,
  signSession,
  verifySessionToken,
} from "@/lib/session";

export { SESSION_COOKIE, type AdminSession };

const encoder = new TextEncoder();

/** Constant-time compare that doesn't leak length through an early return. */
function safeEqual(a: string, b: string): boolean {
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) {
    // Still burn one comparison so timing stays flat for wrong-length input.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export type AdminCredentialsState =
  | { configured: true }
  | { configured: false; reason: string };

/** Whether this deployment has everything it needs to sign an admin in. */
export function adminCredentialsState(): AdminCredentialsState {
  const missing: string[] = [];
  if (!process.env.ADMIN_EMAIL) missing.push("ADMIN_EMAIL");
  if (!process.env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) missing.push("ADMIN_SESSION_SECRET");

  if (missing.length > 0) {
    return {
      configured: false,
      reason: `Missing environment ${
        missing.length === 1 ? "variable" : "variables"
      }: ${missing.join(", ")}.`,
    };
  }
  if (secret && secret.length < 32) {
    return {
      configured: false,
      reason: "ADMIN_SESSION_SECRET must be at least 32 characters long.",
    };
  }
  return { configured: true };
}

export function verifyCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;

  // Evaluate both so a wrong email costs the same as a wrong password.
  const emailOk = safeEqual(
    email.trim().toLowerCase(),
    expectedEmail.trim().toLowerCase(),
  );
  const passwordOk = safeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}

export async function createSession(email: string): Promise<void> {
  const expiresAt = new Date(Date.now() + sessionHours() * 60 * 60 * 1000);
  const token = await signSession(email, expiresAt);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Reads and verifies the session cookie. Null when not signed in. */
export async function getSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
