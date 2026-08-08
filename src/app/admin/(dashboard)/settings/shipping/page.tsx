import { ShippingForm } from "@/components/admin/shipping-form";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getShipping } from "@/lib/shipping";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shipping · Settings" };

export default async function ShippingSettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <SetupNotice description="Connect Supabase to set what delivery costs." />
    );
  }

  const shipping = await getShipping();
  return <ShippingForm shipping={shipping} />;
}
