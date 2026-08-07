import { PageHeader } from "@/components/admin/page-header";
import { SettingsNav } from "@/components/admin/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Store preferences and how this dashboard is wired up."
      />

      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        <SettingsNav />
        <div className="space-y-5">{children}</div>
      </div>
    </div>
  );
}
