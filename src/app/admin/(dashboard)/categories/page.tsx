import Link from "next/link";
import { Pencil, Tags, Trash2 } from "lucide-react";

import { CategoryDialog } from "@/components/admin/category-dialog";
import { PageHeader } from "@/components/admin/page-header";
import {
  ConfirmSubmit,
  RowMenu,
  menuItemClass,
} from "@/components/admin/row-menu";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryIcon } from "@/lib/category-icons";
import { formatNumber } from "@/lib/format";
import { getCategoriesWithCounts } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

import { deleteCategory } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { data: categories, error } = await getCategoriesWithCounts();
  const configured = isSupabaseConfigured();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Group products so customers — and you — can find them fast."
        actions={<CategoryDialog />}
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      {categories.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Tags className="size-5" />}
            title="No categories yet"
            description="Create a category, then assign products to it from the product page."
            action={<CategoryDialog />}
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <CategoryIcon icon={category.icon} className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {category.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      /{category.slug}
                    </p>
                  </div>
                </div>

                <RowMenu label={`Actions for ${category.name}`}>
                  <CategoryDialog
                    category={category}
                    trigger={
                      <button type="button" className={menuItemClass}>
                        <Pencil className="size-3.5" />
                        Edit
                      </button>
                    }
                  />
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <ConfirmSubmit
                      message={`Delete "${category.name}"? Its ${category.productCount} product(s) will stay, but lose this category.`}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </ConfirmSubmit>
                  </form>
                </RowMenu>
              </div>

              {category.description && (
                <p className="mt-2 line-clamp-2 text-sm text-ink-secondary">
                  {category.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs text-ink-muted">
                  {formatNumber(category.productCount)} product
                  {category.productCount === 1 ? "" : "s"}
                </span>
                <Link
                  href={`/admin/products?category=${category.id}`}
                  className="text-xs font-medium text-ink-secondary hover:text-ink"
                >
                  View products
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
