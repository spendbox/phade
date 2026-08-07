import { SettingsForm } from "@/components/admin/settings-form";
import { SetupNotice } from "@/components/admin/setup-notice";
import { Panel } from "@/components/ui/stat-tile";
import { getSettings } from "@/lib/settings";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const configured = isSupabaseConfigured();
  const settings = await getSettings();

  return (
    <Panel title="Inventory">
      {configured ? (
        <SettingsForm lowStockThreshold={settings.lowStockThreshold} />
      ) : (
        <SetupNotice description="Connect Supabase to store store-wide preferences." />
      )}
    </Panel>
  );
}
