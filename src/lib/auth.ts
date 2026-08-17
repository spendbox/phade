import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  type AdminRole,
  type AdminSession,
  sessionHours,
  signSession,
  verifySessionToken,
} from "@/lib/session";
import { verifyPassword } from "@/lib/passwords";
import { cleanUsername } from "@/lib/team";
import { getSupabase } from "@/lib/supabase";

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

/** The owner in the environment. Always works, and can't be deleted. */
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

export type SignedIn = { email: string; role: AdminRole; name: string };

/**
 * Who this is, if anyone.
 *
 * The environment owner is checked first and needs no database at all, so a
 * shop can always get in even if the users table has never been created. Then
 * the team: a row that is switched off is treated exactly like a wrong
 * password, because "your account is disabled" tells a stranger that the
 * username was right.
 */
export async function authenticate(
  login: string,
  password: string,
): Promise<SignedIn | null> {
  if (verifyCredentials(login, password)) {
    return {
      email: login.trim().toLowerCase(),
      role: "owner",
      name: "Owner",
    };
  }

  const supabase = getSupabase();
  if (!supabase) return null;

  const username = cleanUsername(login);
  if (!username) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, username, name, password_hash, role, enabled")
    .eq("username", username)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    id: string;
    username: string;
    name: string | null;
    password_hash: string;
    role: string;
    enabled: boolean;
  };

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok || !row.enabled) return null;

  // Best effort: knowing when someone last signed in is useful, and failing to
  // write it is never a reason to refuse a good password.
  void supabase
    .from("admin_users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => undefined);

  return {
    email: row.username,
    role: row.role === "owner" ? "owner" : "staff",
    name: row.name?.trim() || row.username,
  };
}

export async function createSession(
  email: string,
  role: AdminRole = "owner",
  name = "",
): Promise<void> {
  const expiresAt = new Date(Date.now() + sessionHours() * 60 * 60 * 1000);
  const token = await signSession(email, expiresAt, role, name);

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
