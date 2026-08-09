import { StorefrontForm } from "@/components/admin/storefront-form";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getLinkablePages, getProductPickerOptions } from "@/lib/queries";
import { getStorefront } from "@/lib/storefront";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Storefront · Settings" };

export default async function StorefrontSettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice description="Connect Supabase to edit what the shop front says." />
    );
  }

  const [content, { data: products }, { data: pages }] = await Promise.all([
    getStorefront(),
    getProductPickerOptions(),
    getLinkablePages(),
  ]);

  return (
    <StorefrontForm content={content} products={products} pages={pages} />
  );
}
