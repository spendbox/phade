import { CatalogueForm } from "@/components/admin/catalogue-form";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getCatalogueDefaults } from "@/lib/catalogue-settings";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catalogue · Settings" };

export default async function CatalogueSettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice description="Connect Supabase to store your palette and size run." />
    );
  }

  const defaults = await getCatalogueDefaults();
  return <CatalogueForm defaults={defaults} />;
}
