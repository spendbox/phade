import Link from "next/link";
import { Copy, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";

import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmSubmit, RowMenu, menuItemClass } from "@/components/admin/row-menu";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { ProductStatusBadge, StockBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNaira, formatNumber } from "@/lib/format";
import { getCategories, getProducts } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PRODUCT_STATUSES } from "@/lib/types";

import { deleteProduct, duplicateProduct } from "./actions";

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
            Add product
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
            title={q || category || status ? "No matches" : "No products yet"}
            description={
              q || category || status
                ? "Try a different search or clear the filters."
                : "Add your first product and it will show up here."
            }
            action={
              <Link href="/admin/products/new" className={buttonClass("primary")}>
                <Plus className="size-4" />
                Add product
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="scroll-x hidden md:block">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-ink-secondary">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 text-right font-medium">Price</th>
                  <th className="px-3 py-3 text-right font-medium">Stock</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((product) => (
                  <tr key={product.id} className="group hover:bg-plane/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="flex items-center gap-3"
                      >
                        <Thumb src={product.images?.[0]} alt={product.name} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">
                            {product.name}
                          </span>
                          {product.sku && (
                            <span className="block truncate text-xs text-ink-muted">
                              {product.sku}
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink-secondary">
                      {product.category?.name ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums text-ink">
                      {formatNaira(product.price_kobo)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="mr-2 tabular-nums text-ink-secondary">
                        {product.stock}
                      </span>
                      <StockBadge
                        stock={product.stock}
                        threshold={product.low_stock_threshold}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <ProductStatusBadge status={product.status} />
                    </td>
                    <td className="px-3 py-3">
                      <ProductRowMenu id={product.id} name={product.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-line md:hidden">
            {products.map((product) => (
              <li key={product.id} className="flex items-center gap-3 p-4">
                <Thumb src={product.images?.[0]} alt={product.name} />
                <Link
                  href={`/admin/products/${product.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-medium text-ink">
                    {product.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {product.category?.name ?? "No category"} ·{" "}
                    {formatNaira(product.price_kobo)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <ProductStatusBadge status={product.status} />
                    <StockBadge
                      stock={product.stock}
                      threshold={product.low_stock_threshold}
                    />
                  </div>
                </Link>
                <ProductRowMenu id={product.id} name={product.name} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Thumb({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-plane text-ink-muted ring-1 ring-inset ring-line"
      >
        <PackagePlus className="size-4" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-inset ring-line"
    />
  );
}

function ProductRowMenu({ id, name }: { id: string; name: string }) {
  return (
    <RowMenu>
      <Link href={`/admin/products/${id}`} className={menuItemClass}>
        <Pencil className="size-3.5" />
        Edit
      </Link>

      <form action={duplicateProduct}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className={menuItemClass}>
          <Copy className="size-3.5" />
          Duplicate
        </button>
      </form>

      <form action={deleteProduct}>
        <input type="hidden" name="id" value={id} />
        <ConfirmSubmit
          message={`Delete "${name}"? This can't be undone.`}
        >
          <Trash2 className="size-3.5" />
          Delete
        </ConfirmSubmit>
      </form>
    </RowMenu>
  );
}
