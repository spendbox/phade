/**
 * Session token signing/verification.
 *
 * Kept free of Node-only APIs (`node:crypto`, `next/headers`) so the Edge
 * middleware can import it to gate /admin routes. Cookie handling and the
 * credential check live in `auth.ts`, which is server-only.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "phade_admin_session";

/**
 * What someone signed in is allowed to do.
 *
 * Two roles, because a shop has two kinds of person: whoever owns it, and
 * whoever is working the orders today. The second one needs the order book and
 * nothing else — not the prices, not the payouts, not the ability to empty the
 * catalogue — and giving them the owner's login because there was no other
 * kind is how shops end up with one password everybody knows.
 */
export type AdminRole = "owner" | "staff";

export type AdminSession = {
  /** Username or email — whatever they signed in with. */
  email: string;
  role: AdminRole;
  /** Their name, for the corner of the dashboard. Falls back to the login. */
  name: string;
};

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
  access: AdminRole = "owner",
  name = "",
): Promise<string> {
  return new SignJWT({ role: "admin", access, name })
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

    // A token minted before there were roles belongs to the one person who
    // could sign in then: the owner.
    const access: AdminRole = payload.access === "staff" ? "staff" : "owner";

    return {
      email,
      role: access,
      name: typeof payload.name === "string" && payload.name ? payload.name : email,
    };
  } catch {
    return null;
  }
}

/**
 * Where each role is allowed to go.
 *
 * Staff get the order book and what hangs off it, and nothing else. Written as
 * one list, used by the middleware, the sidebar and the pages themselves, so
 * "can they see this" has exactly one answer wherever it is asked.
 */
const STAFF_PATHS = ["/admin/orders", "/admin/login", "/admin/logout"];

export function canReach(role: AdminRole, pathname: string): boolean {
  if (role === "owner") return true;
  return STAFF_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Where a role lands when it signs in, or asks for somewhere it can't go. */
export function homeFor(role: AdminRole): string {
  return role === "staff" ? "/admin/orders" : "/admin";
}
