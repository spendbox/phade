"use server";

import { revalidate } from "@/lib/admin-revalidate";

import { actionError, requireOwner } from "@/lib/guard";
import { hashPassword, passwordProblem } from "@/lib/passwords";
import { requireSupabase } from "@/lib/supabase";
import { cleanUsername, parseTeam, TEAM_KEY } from "@/lib/team";
import type { ActionResult } from "@/lib/types";

export type TeamFormState = ActionResult | { ok: null };

/**
 * Who else can sign in.
 *
 * Every one of these is owner-only, and says so next to the mutation rather
 * than trusting the page it was called from: a server action is a URL, and a
 * sales manager has a browser like everyone else.
 *
 * The owner in the environment is not in this table and cannot be touched from
 * here, which is what stops a shop locking itself out of its own dashboard.
 */

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function friendly(message: string): string {
  return message.includes("duplicate key")
    ? "Someone already signs in with that username."
    : message.includes("admin_users")
      ? "The team table isn't there yet — run supabase/schema.sql and try again."
      : message;
}

export async function addTeamMember(
  _previous: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    const username = cleanUsername(text(formData, "username"));
    if (username.length < 3) {
      throw new Error("A username needs at least three characters.");
    }

    const password = String(formData.get("password") ?? "");
    const problem = passwordProblem(password);
    if (problem) throw new Error(problem);

    const { error } = await supabase.from("admin_users").insert({
      username,
      name: text(formData, "name") || null,
      password_hash: await hashPassword(password),
      role: text(formData, "role") === "owner" ? "owner" : "staff",
      enabled: true,
    });
    if (error) throw new Error(friendly(error.message));

    revalidate("/admin/settings/team");
    return { ok: true, message: `${username} can sign in now.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function setTeamPassword(
  _previous: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    const id = text(formData, "id");
    if (!id) throw new Error("Missing person.");

    const password = String(formData.get("password") ?? "");
    const problem = passwordProblem(password);
    if (problem) throw new Error(problem);

    const { error } = await supabase
      .from("admin_users")
      .update({ password_hash: await hashPassword(password) })
      .eq("id", id);
    if (error) throw new Error(friendly(error.message));

    revalidate("/admin/settings/team");
    return { ok: true, message: "New password set. Tell them what it is." };
  } catch (error) {
    return actionError(error);
  }
}

/** Switch someone off without deleting them, or back on. */
export async function setTeamAccess(formData: FormData): Promise<void> {
  await requireOwner();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing person.");

  const patch: Record<string, unknown> = {};
  const enabled = String(formData.get("enabled") ?? "");
  const role = String(formData.get("role") ?? "");

  if (enabled) patch.enabled = enabled === "true";
  if (role) patch.role = role === "owner" ? "owner" : "staff";
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from("admin_users")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidate("/admin/settings/team");
}

export async function removeTeamMember(formData: FormData): Promise<void> {
  await requireOwner();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing person.");

  const { error } = await supabase.from("admin_users").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidate("/admin/settings/team");
}

/** What this shop calls the limited role. */
export async function saveRoleName(
  _previous: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    const settings = parseTeam({
      staffRoleName: text(formData, "staff_role_name"),
    });

    const { error } = await supabase.from("app_settings").upsert(
      {
        key: TEAM_KEY,
        value: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);

    revalidate("/admin/settings/team");
    return { ok: true, message: `Saved — they're called ${settings.staffRoleName}.` };
  } catch (error) {
    return actionError(error);
  }
}
