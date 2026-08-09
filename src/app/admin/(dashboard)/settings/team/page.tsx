import { redirect } from "next/navigation";

import { SetupNotice } from "@/components/admin/setup-notice";
import { TeamForm } from "@/components/admin/team-form";
import { getSession } from "@/lib/auth";
import { getTeamSettings, listAdminUsers } from "@/lib/team";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team · Settings" };

export default async function TeamSettingsPage() {
  // The middleware keeps a sales manager out of Settings entirely; this is the
  // check that would still hold if the middleware ever didn't run.
  const session = await getSession();
  if (session?.role !== "owner") redirect("/admin/orders");

  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice description="Connect Supabase to give anyone else a login." />
    );
  }

  const [{ users, notReady }, team] = await Promise.all([
    listAdminUsers(),
    getTeamSettings(),
  ]);

  return (
    <TeamForm
      users={users}
      staffRoleName={team.staffRoleName}
      ownerEmail={process.env.ADMIN_EMAIL ?? null}
      notReady={notReady}
    />
  );
}
