import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Truck } from "lucide-react";

import { BuyPanel } from "@/components/shop/buy-panel";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductRail } from "@/components/shop/product-card";
import { SectionHead } from "@/components/shop/section";
import { ProductRegistry } from "@/components/shop/shop-provider";
import { cn } from "@/lib/cn";
import { formatNairaShort } from "@/lib/format";
import { LOW_STOCK_SHOWS_AT, percentOff } from "@/lib/shop";
import { getCatalogue, getShopProduct } from "@/lib/shop-queries";

/**
 * Rendered once and re-used for up to a minute. Nothing on this route depends
 * on who is asking — the bag and the saved list live in the browser — so a
 * shopper should not wait for it to be built again. Any dashboard change drops
 * the cache immediately through `revalidate` in `@/lib/admin-revalidate`, so
 * the minute is a ceiling for edits made straight in the database, not a delay
 * on the shop's own work.
 */
export const revalidate = 60;

/**
 * A product on a page of its own.
 *
 * Shopping happens in the pop-up; this exists for the link someone was sent,
 * the tab they left open, and the search engine that needs a real address with
 * a real title on it. It shows the same pictures and the same buttons, laid
 * out for a page rather than a card.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getShopProduct(slug);
  if (!product) return { title: "Not found" };

  const description =
    product.description?.slice(0, 160) ??
    `${product.name} — ${formatNairaShort(product.priceKobo)}. Delivered across Nigeria.`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.media[0] ? [product.media[0]] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, catalogue] = await Promise.all([
    getShopProduct(slug),
    getCatalogue(),
  ]);

  if (!product) notFound();

  const off = percentOff(product);
  const soldOut = product.stock <= 0;

  const alike = catalogue.products
    .filter(
      (other) =>
        other.id !== product.id &&
        (other.categoryId === product.categoryId || !product.categoryId),
    )
    .slice(0, 10);

  return (
    <>
      <ProductRegistry products={[product, ...alike]} />

      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 px-4 pt-4 text-[13px] text-ink-muted sm:px-6 lg:px-8"
      >
        <Link href="/shop" className="transition hover:text-ink">
          Shop
        </Link>
        {product.categorySlug && (
          <>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link
              href={`/shop?category=${product.categorySlug}`}
              className="transition hover:text-ink"
            >
              {product.categoryName}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-ink">{product.name}</span>
      </nav>

      <div className="mt-3 grid gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8">
        <ProductGallery
          product={product}
          className="aspect-[4/5] overflow-hidden rounded-3xl lg:sticky lg:top-24 lg:aspect-[4/5]"
        />

        <div className="pb-4 lg:pt-6">
          {product.categoryName && (
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              {product.categoryName}
              {product.subcategory && ` · ${product.subcategory}`}
            </p>
          )}

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-xl font-semibold tabular-nums",
                product.compareAtKobo ? "text-brand" : "text-ink",
              )}
            >
              {formatNairaShort(product.priceKobo)}
            </span>
            {product.compareAtKobo && (
              <span className="text-sm text-ink-muted line-through tabular-nums">
                {formatNairaShort(product.compareAtKobo)}
              </span>
            )}
            {off !== null && (
              <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                {product.saleLabel ?? `−${off}%`}
              </span>
            )}
          </div>

          {soldOut ? (
            <p className="mt-2 text-[13px] font-medium text-ink-secondary">
              Sold out — it may come back.
            </p>
          ) : (
            product.stock <= LOW_STOCK_SHOWS_AT && (
              <p className="mt-2 text-[13px] font-medium text-brand">
                Only {product.stock} left
              </p>
            )
          )}

          {product.description && (
            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ink-secondary">
              {product.description}
            </p>
          )}

          <p className="mt-5 flex items-center gap-2 rounded-xl bg-canvas-deep/70 px-3 py-2.5 text-[13px] text-ink-secondary">
            <Truck className="size-4 shrink-0 text-ink-muted" aria-hidden />
            Delivered nationwide. Pickup in Lagos is free at checkout.
          </p>

          <BuyPanel product={product} className="mt-6" />

          {product.tags.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-1.5">
              {product.tags.slice(0, 10).map((tag) => (
                <li key={tag}>
                  <Link
                    href={`/shop?q=${encodeURIComponent(tag)}`}
                    className="inline-block rounded-full bg-canvas-deep px-2.5 py-1 text-[11px] text-ink-secondary transition hover:bg-line-strong hover:text-ink"
                  >
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {alike.length > 0 && (
        <section className="mt-12">
          <SectionHead
            title="You might also like"
            href={
              product.categorySlug
                ? `/shop?category=${product.categorySlug}`
                : "/shop"
            }
          />
          <div className="mt-4">
            <ProductRail products={alike} />
          </div>
        </section>
      )}
    </>
  );
}
