import { getSupabase } from "@/lib/supabase";
import type { AdminRole } from "@/lib/session";

/**
 * The people who can sign in to the dashboard.
 *
 * The owner is whoever holds `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the
 * environment. That login always works, needs no database row, and cannot be
 * deleted from inside the dashboard — which is the property that stops a shop
 * from locking itself out of its own shop.
 *
 * Everyone else is a row here, added by the owner. Today there is one other
 * kind of person: whoever works the order book. What that person is called is
 * the shop's business, so the name of the role is theirs to write.
 */

export type AdminUser = {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  enabled: boolean;
  lastSeenAt: string | null;
  createdAt: string;
};

export const TEAM_KEY = "team_settings";

export type TeamSettings = {
  /** What the limited role is called in this shop. */
  staffRoleName: string;
};

export const DEFAULT_TEAM: TeamSettings = { staffRoleName: "Sales manager" };

export function parseTeam(raw: unknown): TeamSettings {
  if (typeof raw !== "object" || raw === null) return DEFAULT_TEAM;
  const value = raw as Record<string, unknown>;
  const name =
    typeof value.staffRoleName === "string" ? value.staffRoleName.trim() : "";
  return { staffRoleName: name || DEFAULT_TEAM.staffRoleName };
}

export async function getTeamSettings(): Promise<TeamSettings> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_TEAM;

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", TEAM_KEY)
    .maybeSingle();

  if (error || !data) return DEFAULT_TEAM;
  return parseTeam((data as { value: unknown }).value);
}

function toUser(row: Record<string, unknown>): AdminUser {
  return {
    id: String(row.id),
    username: String(row.username ?? ""),
    name: typeof row.name === "string" ? row.name : "",
    role: row.role === "owner" ? "owner" : "staff",
    enabled: row.enabled !== false,
    lastSeenAt: typeof row.last_seen_at === "string" ? row.last_seen_at : null,
    createdAt: String(row.created_at ?? ""),
  };
}

/**
 * Everyone with a login, newest last.
 *
 * `notReady` tells the page apart from an empty team: a shop that hasn't run
 * the migration yet should be told to, not shown "no one here" as though that
 * were the answer.
 */
export async function listAdminUsers(): Promise<{
  users: AdminUser[];
  notReady: boolean;
}> {
  const supabase = getSupabase();
  if (!supabase) return { users: [], notReady: true };

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, username, name, role, enabled, last_seen_at, created_at")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return { users: [], notReady: true };
  return {
    users: ((data ?? []) as Record<string, unknown>[]).map(toUser),
    notReady: false,
  };
}

/** A username is what someone types to sign in: lower case, no spaces. */
export function cleanUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "").slice(0, 60);
}
