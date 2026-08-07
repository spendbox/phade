import Link from "next/link";
import { PackagePlus, Plus } from "lucide-react";

import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { ProductsTable } from "@/components/admin/products-table";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/format";
import { getCategories, getProducts } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PRODUCT_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string }>;
}) {
  const { q, category, status } = await searchParams;

  const [{ data: products, error }, { data: categories }] = await Promise.all([
    getProducts({ search: q, categoryId: category, status }),
    getCategories(),
  ]);

  const configured = isSupabaseConfigured();
  const filtered = Boolean(q || category || status);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description={`${formatNumber(products.length)} product${
          products.length === 1 ? "" : "s"
        } in your catalogue`}
        actions={
          <Link href="/admin/products/new" className={buttonClass("primary")}>
            <Plus className="size-4" />
            Add products
          </Link>
        }
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      <FilterBar
        searchPlaceholder="Search by name or SKU"
        filters={[
          {
            key: "category",
            label: "Category",
            options: categories.map((item) => ({
              value: item.id,
              label: item.name,
            })),
          },
          {
            key: "status",
            label: "Status",
            options: PRODUCT_STATUSES.map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            })),
          },
        ]}
      />

      {products.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<PackagePlus className="size-5" />}
            title={filtered ? "No matches" : "No products yet"}
            description={
              filtered
                ? "Try a different search or clear the filters."
                : "Add your first products and they will show up here."
            }
            action={
              <Link href="/admin/products/new" className={buttonClass("primary")}>
                <Plus className="size-4" />
                Add products
              </Link>
            }
          />
        </div>
      ) : (
        <ProductsTable products={products} />
      )}
    </div>
  );
}
