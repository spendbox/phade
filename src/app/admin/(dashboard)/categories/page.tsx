import Link from "next/link";
import { Pencil, Tags, Trash2 } from "lucide-react";

import { CategoryDialog } from "@/components/admin/category-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmSubmit } from "@/components/admin/row-menu";
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
  const aiEnabled = Boolean(process.env.OPENAI_API_KEY);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Group products so customers — and you — can find them fast."
        actions={<CategoryDialog aiEnabled={aiEnabled} />}
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      {categories.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Tags className="size-5" />}
            title="No categories yet"
            description="Create a category, then assign products to it from the product page."
            action={<CategoryDialog aiEnabled={aiEnabled} />}
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
    </div>
  );
}
