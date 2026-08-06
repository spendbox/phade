import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { ConfirmSubmit } from "@/components/admin/row-menu";
import { ErrorNotice } from "@/components/admin/setup-notice";
import { getCategories, getProduct } from "@/lib/queries";
import { formatRelative } from "@/lib/format";

import { deleteProduct } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await getProduct(id);
  return { title: data?.name ?? "Product" };
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: product, error }, { data: categories }] = await Promise.all([
    getProduct(id),
    getCategories(),
  ]);

  if (error) {
    return <ErrorNotice message={error} />;
  }
  if (!product) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Products
      </Link>

      <PageHeader
        title={product.name}
        description={`Last updated ${formatRelative(product.updated_at)}`}
        actions={
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={product.id} />
            <ConfirmSubmit
              message={`Delete "${product.name}"? This can't be undone.`}
              className="h-10 w-auto justify-center rounded-lg bg-surface px-4 text-sm ring-1 ring-inset ring-critical/30 hover:bg-critical-soft"
            >
              <Trash2 className="size-4" />
              Delete
            </ConfirmSubmit>
          </form>
        }
      />

      <ProductForm
        product={product}
        categories={categories}
        aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
    </div>
  );
}
