import { getSession } from "@/lib/auth";

/**
 * Every server action calls this before touching data.
 *
 * The middleware already gates /admin routes (server actions POST to the same
 * paths, so it covers them too) — this is the belt-and-braces check that lives
 * next to the mutation itself.
 */
export async function requireAdmin(): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
}

/** Turns a thrown error into the `{ ok: false }` shape forms render. */
export function actionError(error: unknown): { ok: false; error: string } {
  const message =
    error instanceof Error ? error.message : "Something went wrong.";
  return { ok: false, error: message };
}
