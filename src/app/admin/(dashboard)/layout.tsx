import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/sidebar";
import { getSession } from "@/lib/auth";
import { getTeamSettings } from "@/lib/team";
import { SIDEBAR_COOKIE } from "@/lib/ui-cookies";

export const metadata = {
  title: {
    default: "Dashboard",
    template: "%s · phadewoman admin",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy already redirects unauthenticated requests; this is the
  // authoritative server-side check that guards the data itself.
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [store, team] = await Promise.all([cookies(), getTeamSettings()]);
  const collapsed = store.get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <AdminShell
      email={session.email}
      role={session.role}
      roleLabel={team.staffRoleName}
      defaultCollapsed={collapsed}
    >
      {children}
    </AdminShell>
  );
}
