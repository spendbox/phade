import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getCategories } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const { data: categories } = await getCategories();

  return (
    <div className="space-y-5">
      <PageHeader
        title="New product"
        description="Add the details, drop in a few photos, and publish when you're ready."
      />

      {!isSupabaseConfigured() ? (
        <SetupNotice description="Products are stored in Supabase. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, run supabase/schema.sql, then redeploy." />
      ) : (
        <ProductForm
          categories={categories}
          aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
        />
      )}
    </div>
  );
}
