import { PageHeader } from "@/components/admin/page-header";
import { ProductSheet } from "@/components/admin/product-sheet";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { getCategories, getSheetRows } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Database" };

export default async function DatabasePage() {
  const [{ data: rows, error }, { data: categories }] = await Promise.all([
    getSheetRows(),
    getCategories(),
  ]);

  const configured = isSupabaseConfigured();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Database"
        description="Every product in one sheet. Edit a cell and it saves; new rows start as drafts."
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      {configured && (
        <ProductSheet
          rows={rows}
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
          aiEnabled={Boolean(process.env.OPENAI_API_KEY)}
        />
      )}
    </div>
  );
}
