import Link from "next/link";
import { Pencil, Tags, Trash2 } from "lucide-react";

import { CategoryDialog } from "@/components/admin/category-dialog";
import { ConfirmSubmit } from "@/components/admin/row-menu";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { SubcategoryDialog } from "@/components/admin/subcategory-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/stat-tile";
import { CategoryIcon } from "@/lib/category-icons";
import { formatNumber } from "@/lib/format";
import { getCategoriesWithCounts, getSubcategoryRows } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

import { deleteCategory, deleteSubcategory } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories · Settings" };

export default async function CategoriesSettingsPage() {
  const [{ data: categories, error }, { data: subcategories }] =
    await Promise.all([getCategoriesWithCounts(), getSubcategoryRows()]);

  const configured = isSupabaseConfigured();
  const aiEnabled = Boolean(process.env.OPENAI_API_KEY);

  return (
    <>
      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      <Panel
        title="Categories"
        action={<CategoryDialog aiEnabled={aiEnabled} />}
        bodyClassName="p-4 sm:p-5"
      >
      {categories.length === 0 ? (
        <div>
          <EmptyState
            icon={<Tags className="size-5" />}
            title="No categories yet"
            description="Create a category, then assign products to it from the product page."
            action={<CategoryDialog aiEnabled={aiEnabled} />}
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
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

                {/* Edit and delete sit on the card itself rather than inside an
                    overflow menu — a menu that closes on click would unmount
                    the dialog and the delete form before either could run. */}
                <div className="flex shrink-0 items-center gap-1">
                  <CategoryDialog
                    category={category}
                    aiEnabled={aiEnabled}
                    trigger={
                      <button
                        type="button"
                        aria-label={`Edit ${category.name}`}
                        title="Edit"
                        className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-plane hover:text-ink"
                      >
                        <Pencil className="size-4" />
                      </button>
                    }
                  />

                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <ConfirmSubmit
                      message={`Delete "${category.name}"? Its ${category.productCount} product(s) will stay, but lose this category.`}
                      className="flex size-8 w-8 items-center justify-center rounded-lg p-0 text-ink-muted transition hover:bg-critical-soft hover:text-critical"
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete {category.name}</span>
                    </ConfirmSubmit>
                  </form>
                </div>
              </div>

              {category.description && (
                <p className="mt-3 line-clamp-2 text-sm text-ink-secondary">
                  {category.description}
                </p>
              )}

              <div className="mt-auto flex items-center justify-between border-t border-line pt-3 [&:not(:first-child)]:mt-4">
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
      </Panel>

      <Panel
        title="Subcategories"
        action={<SubcategoryDialog categories={categories} />}
        bodyClassName="p-0"
      >
        {subcategories.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted sm:px-5">
            No subcategories yet. They refine a category — “Totes” inside Bags,
            “Heels” inside Shoes — and appear as suggestions when you add a
            product.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {subcategories.map((subcategory) => (
              <li
                key={subcategory.id}
                className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">
                    {subcategory.name}
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    {subcategory.category?.name ?? "Every category"}
                  </span>
                </span>

                <SubcategoryDialog
                  subcategory={subcategory}
                  categories={categories}
                  trigger={
                    <button
                      type="button"
                      aria-label={`Edit ${subcategory.name}`}
                      title="Edit"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-plane hover:text-ink"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  }
                />

                <form action={deleteSubcategory}>
                  <input type="hidden" name="id" value={subcategory.id} />
                  <ConfirmSubmit
                    message={`Remove "${subcategory.name}" from the list? Products already labelled with it keep the label.`}
                    className="flex size-8 w-8 shrink-0 items-center justify-center rounded-lg p-0 text-ink-muted transition hover:bg-critical-soft hover:text-critical"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete {subcategory.name}</span>
                  </ConfirmSubmit>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
