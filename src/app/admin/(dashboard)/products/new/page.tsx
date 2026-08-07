import { PageHeader } from "@/components/admin/page-header";
import { ProductUploaderMount } from "@/components/admin/product-uploader-mount";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getCategories } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add products" };

export default async function NewProductPage() {
  const { data: categories } = await getCategories();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Add products"
        description="Pick a category, drop in your photos and videos, then name and price each one."
      />

      {!isSupabaseConfigured() ? (
        <SetupNotice description="Products are stored in Supabase. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, run supabase/schema.sql, then redeploy." />
      ) : (
        <ProductUploaderMount
          categories={categories}
          aiEnabled={Boolean(process.env.OPENAI_API_KEY)}
        />
      )}
    </div>
  );
}
