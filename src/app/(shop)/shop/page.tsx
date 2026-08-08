import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, SlidersHorizontal } from "lucide-react";

import { CategoryBar } from "@/components/shop/category-bar";
import { ProductCard, ProductRail } from "@/components/shop/product-card";
import { SectionHead } from "@/components/shop/section";
import { ProductRegistry } from "@/components/shop/shop-provider";
import { cn } from "@/lib/cn";
import { bestSellers, getCatalogue, newIn } from "@/lib/shop-queries";
import { isNewIn, type ShopProduct } from "@/lib/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Every piece in the shop — bags, shoes, abayas and ready-to-wear. Filter by category, sort by what's new or what's selling.",
};

const SORTS = {
  featured: "Featured",
  new: "New in",
  best: "Best selling",
  low: "Price: low to high",
  high: "Price: high to low",
} as const;

type Sort = keyof typeof SORTS;

type Query = {
  category?: string;
  sub?: string;
  q?: string;
  sort?: string;
  sale?: string;
  show?: string;
};

/**
 * How many products a page carries before it asks whether you want more.
 *
 * Not a limit on the shop — a limit on one page of it. Every card is a picture,
 * a price and four interactive controls, and a phone asked to lay out three
 * hundred of them at once will drop frames doing it. Shoppers who want the rest
 * say so, and the URL remembers that they did.
 */
const PAGE_SIZE = 48;

/**
 * The shop.
 *
 * Every choice a shopper makes here lives in the address bar, which is what
 * makes "the emerald abayas under fifty" a link someone can send a friend, and
 * what makes the back button undo a filter instead of leaving the shop. It
 * also means the filtering happens on the server, so the page arrives already
 * filtered rather than flashing the whole catalogue first.
 *
 * The whole catalogue is in hand by this point, so narrowing it is a filter in
 * memory rather than another trip to the database.
 */
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const params = await searchParams;
  const { products, categories, subcategories } = await getCatalogue();

  const category = categories.find((entry) => entry.slug === params.category);
  const sub = params.sub?.trim() || null;
  const term = params.q?.trim().toLowerCase() ?? "";
  const onSaleOnly = params.sale === "1";
  const sort: Sort = isSort(params.sort) ? params.sort : "featured";

  const filtered = sortProducts(
    products.filter((product) => {
      if (category && product.categoryId !== category.id) return false;
      if (sub && product.subcategory !== sub) return false;
      if (onSaleOnly && !product.saleLabel) return false;
      if (term && !matches(product, term)) return false;
      return true;
    }),
    sort,
  );

  const asked = Number.parseInt(params.show ?? "", 10);
  const showing =
    Number.isFinite(asked) && asked > 0
      ? Math.min(asked, filtered.length)
      : Math.min(PAGE_SIZE, filtered.length);
  const visible = filtered.slice(0, showing);
  const more = filtered.length - showing;

  const subs = category ? (subcategories[category.slug] ?? []) : [];
  const filtering = Boolean(category || sub || term || onSaleOnly);
  const saleCount = products.filter((product) => product.saleLabel).length;

  // With nothing narrowed down, the rails do the work of a shop window.
  const best = filtering ? [] : bestSellers(products, 10);
  const fresh = filtering ? [] : newIn(products, 10);

  // The pop-up only needs what this page can open, not the whole catalogue.
  const onPage = [...visible, ...best, ...fresh];

  const href = (next: Query) => buildHref({ ...params, ...next });

  return (
    <>
      <ProductRegistry products={onPage} />

      {/* Categories stay put at the top while the grid scrolls under them —
          changing your mind is one tap, from anywhere on the page — and shrink
          to a chip row once you're into the grid. */}
      <CategoryBar categories={categories} active={category?.slug} />

      <div className="px-4 pt-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {term
                ? `“${params.q?.trim()}”`
                : (category?.name ?? (onSaleOnly ? "On sale" : "Everything"))}
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {filtered.length} piece{filtered.length === 1 ? "" : "s"}
              {category?.description && !term && ` · ${category.description}`}
            </p>
          </div>

          {/* `min-w-0` on the row, `.rail` on the group: without both, the
              sort options size to their content and take the page sideways
              with them. */}
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
            <SlidersHorizontal
              className="size-4 shrink-0 text-ink-muted"
              aria-hidden
            />
            <span className="sr-only" id="sort-label">
              Sort by
            </span>
            <div
              role="group"
              aria-labelledby="sort-label"
              className="rail gap-1.5 rounded-full bg-canvas-deep p-1"
            >
              {(Object.keys(SORTS) as Sort[]).map((key) => (
                <Link
                  key={key}
                  href={href({ sort: key === "featured" ? undefined : key })}
                  scroll={false}
                  aria-current={sort === key ? "true" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] transition",
                    sort === key
                      ? "bg-noir font-medium text-white"
                      : "text-ink-secondary hover:text-ink",
                  )}
                >
                  {SORTS[key]}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {(subs.length > 0 || saleCount > 0 || filtering) && (
          <div className="rail mt-4 gap-2 pb-1">
            {saleCount > 0 && (
              <Chip
                href={href({ sale: onSaleOnly ? undefined : "1" })}
                active={onSaleOnly}
              >
                On sale · {saleCount}
              </Chip>
            )}

            {subs.map((name) => (
              <Chip
                key={name}
                href={href({ sub: sub === name ? undefined : name })}
                active={sub === name}
              >
                {name}
              </Chip>
            ))}

            {filtering && (
              <Chip href="/shop" active={false} muted>
                Clear all
              </Chip>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <Nothing filtering={filtering} />
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {visible.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={index < 4}
            />
          ))}
        </div>
      )}

      {more > 0 && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-[13px] text-ink-muted tabular-nums">
            Showing {showing} of {filtered.length}
          </p>
          <Link
            href={href({ show: String(showing + PAGE_SIZE) })}
            scroll={false}
            className="inline-flex h-11 items-center rounded-full px-6 text-sm font-medium text-ink ring-1 ring-inset ring-line-strong transition hover:bg-canvas-deep"
          >
            Show {Math.min(more, PAGE_SIZE)} more
          </Link>
        </div>
      )}

      {best.length > 0 && (
        <section className="mt-14">
          <SectionHead
            title="Best sellers"
            note="What everyone else is taking home."
            href="/shop?sort=best"
          />
          <div className="mt-4">
            <ProductRail products={best} />
          </div>
        </section>
      )}

      {fresh.length > 0 && (
        <section className="mt-12">
          <SectionHead
            title="Just arrived"
            note={`Added in the last ${
              fresh.filter((product) => isNewIn(product.createdAt)).length > 0
                ? "fortnight"
                : "while"
            }.`}
            href="/shop?sort=new"
          />
          <div className="mt-4">
            <ProductRail products={fresh} />
          </div>
        </section>
      )}
    </>
  );
}

function Chip({
  href,
  active,
  muted = false,
  children,
}: {
  href: string;
  active: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] transition",
        active
          ? "bg-brand font-medium text-white"
          : muted
            ? "text-ink-muted underline underline-offset-4 hover:text-ink"
            : "bg-canvas-deep text-ink-secondary hover:bg-line-strong hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

function Nothing({ filtering }: { filtering: boolean }) {
  return (
    <div className="mx-auto max-w-sm px-6 py-20 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-canvas-deep text-ink-muted">
        <SearchX className="size-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink">Nothing here yet</h2>
      <p className="mt-2 text-sm text-ink-secondary">
        {filtering
          ? "No piece matches all of that at once. Loosening one filter usually does it."
          : "The first pieces are on their way. Check back shortly."}
      </p>
      {filtering && (
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-noir px-6 text-sm font-medium text-white transition hover:bg-brand"
        >
          Show everything
        </Link>
      )}
    </div>
  );
}

function isSort(value: string | undefined): value is Sort {
  return typeof value === "string" && value in SORTS;
}

function matches(product: ShopProduct, term: string): boolean {
  return [
    product.name,
    product.description ?? "",
    product.categoryName ?? "",
    product.subcategory ?? "",
    product.tags.join(" "),
    product.colors.map((color) => color.name).join(" "),
  ]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function sortProducts(products: ShopProduct[], sort: Sort): ShopProduct[] {
  const sorted = [...products];

  switch (sort) {
    case "new":
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case "best":
      return sorted.sort((a, b) => b.sold - a.sold);
    case "low":
      return sorted.sort((a, b) => a.priceKobo - b.priceKobo);
    case "high":
      return sorted.sort((a, b) => b.priceKobo - a.priceKobo);
    default:
      // Featured: in stock first, then whatever is on sale, then newest. A
      // shopper who hasn't asked for an order should still meet things they
      // can actually buy today.
      return sorted.sort((a, b) => {
        const stock = Number(b.stock > 0) - Number(a.stock > 0);
        if (stock !== 0) return stock;
        const sale = Number(Boolean(b.saleLabel)) - Number(Boolean(a.saleLabel));
        if (sale !== 0) return sale;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }
}

/** Rebuilds the shop URL, dropping anything that has been turned off. */
function buildHref(query: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  return search ? `/shop?${search}` : "/shop";
}
