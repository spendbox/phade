import { getSession } from "@/lib/auth";
import type { AdminSession } from "@/lib/session";

/**
 * Every server action calls one of these before touching data.
 *
 * The middleware already gates /admin routes (server actions POST to the same
 * paths, so it covers them too) — these are the belt-and-braces checks that
 * live next to the mutation itself, and they are the ones that matter: a
 * server action is a URL, and a URL can be called by anything.
 *
 * `requireAdmin` is anyone signed in, and belongs on the order book. Everything
 * else — prices, the catalogue, the payouts, the team itself — is
 * `requireOwner`, because a sales manager was given the orders and not the
 * shop.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

export async function requireOwner(): Promise<AdminSession> {
  const session = await requireAdmin();
  if (session.role !== "owner") {
    throw new Error("Only the shop owner can change that.");
  }
  return session;
}

/** Turns a thrown error into the `{ ok: false }` shape forms render. */
export function actionError(error: unknown): { ok: false; error: string } {
  const message =
    error instanceof Error ? error.message : "Something went wrong.";
  return { ok: false, error: message };
}
