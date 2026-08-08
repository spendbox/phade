import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { CategoryStories } from "@/components/shop/category-stories";
import { FeedPost } from "@/components/shop/feed-post";
import { ProductCard, ProductRail } from "@/components/shop/product-card";
import { SectionHead } from "@/components/shop/section";
import { ProductRegistry } from "@/components/shop/shop-provider";
import { StoryHero } from "@/components/shop/story-hero";
import { bestSellers, featured, getCatalogue, newIn } from "@/lib/shop-queries";
import { getStorefront } from "@/lib/storefront";

/**
 * Rendered once and re-used for up to a minute. Nothing on this route depends
 * on who is asking — the bag and the saved list live in the browser — so a
 * shopper should not wait for it to be built again. Any dashboard change drops
 * the cache immediately through `revalidate` in `@/lib/admin-revalidate`, so
 * the minute is a ceiling for edits made straight in the database, not a delay
 * on the shop's own work.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: "phadewoman",
  description:
    "Bags, shoes, abayas and ready-to-wear, chosen one piece at a time. Delivered across Nigeria.",
};

/**
 * The front page.
 *
 * It reads top to bottom the way a shopper's evening does: a story to look at,
 * a row of rings to tap, then things to buy — the ones the shop is proudest of
 * as posts, then what everyone else is buying, then what just arrived, then
 * everything.
 *
 * Every word and picture above the first product comes from Settings →
 * Storefront. Nothing on this page needs a deploy to change.
 */
export default async function LandingPage() {
  const [content, catalogue] = await Promise.all([
    getStorefront(),
    getCatalogue(),
  ]);

  const { products, categories } = catalogue;
  const chosen = featured(products, content.featuredProductIds);
  const posts = chosen.length > 0 ? chosen.slice(0, 6) : products.slice(0, 3);
  const best = bestSellers(products, 10);
  const fresh = newIn(products, 10);

  // Anything not already shown above, so the last grid isn't a repeat.
  const shownAbove = new Set([
    ...posts.map((product) => product.id),
    ...best.map((product) => product.id),
    ...fresh.map((product) => product.id),
  ]);
  const explore = products
    .filter((product) => !shownAbove.has(product.id))
    .slice(0, 12);

  // Only what this page can actually open goes into the pop-up's registry.
  // Sending the whole catalogue would put every product in the shop into the
  // HTML of a page that shows forty of them.
  const onPage = [...posts, ...best, ...fresh, ...explore];

  const marquee = [
    "New in",
    ...categories.map((category) => category.name),
    "Made for Lagos",
  ];

  return (
    <>
      <ProductRegistry products={onPage} />

      <StoryHero content={content} hasShop={products.length > 0} />

      {/* The rings ride up over the foot of the hero — the seam between the
          picture and the shop, and the first thing a thumb reaches. */}
      <div className="relative z-30 -mt-7 rounded-t-3xl bg-canvas pb-2 pt-4">
        <CategoryStories categories={categories} />
      </div>

      {products.length === 0 ? (
        <EmptyShop />
      ) : (
        <>
          <div className="mt-6 overflow-hidden border-y border-line bg-canvas-deep/50 py-2.5">
            <div className="marquee-track">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
                  {marquee.map((word) => (
                    <span
                      key={`${copy}-${word}`}
                      className="flex items-center gap-3 whitespace-nowrap px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-secondary"
                    >
                      {word}
                      <span className="text-brand">✳</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {posts.length > 0 && (
            <section className="mt-10">
              <SectionHead
                title={content.featuredHeading || "Featured"}
                note="Tap a picture to open it, without losing this page."
                href="/shop"
                hrefLabel="Shop all"
              />
              <div className="mt-4 grid gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
                {posts.map((product, index) => (
                  <FeedPost
                    key={product.id}
                    product={product}
                    priority={index === 0}
                  />
                ))}
              </div>
            </section>
          )}

          {best.length > 0 && (
            <section className="mt-12">
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
                title="New in"
                note="The most recent arrivals, newest first."
                href="/shop?sort=new"
              />
              <div className="mt-4">
                <ProductRail products={fresh} />
              </div>
            </section>
          )}

          {explore.length > 0 && (
            <section className="mt-12">
              <SectionHead title="Explore" note="A little of everything else." />
              <div className="mt-4 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:grid-cols-4 lg:px-8">
                {explore.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-14 px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl bg-noir px-6 py-12 text-center text-white sm:px-10 sm:py-16">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
                <Sparkles className="size-3.5" aria-hidden />
                The whole shop
              </p>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {products.length} piece{products.length === 1 ? "" : "s"},
                waiting to be found
              </h2>
              <p className="mx-auto mt-3 max-w-md text-pretty text-white/70">
                Filter by category, sort by what&apos;s new or what&apos;s
                selling, and open anything without losing your place.
              </p>
              <Link
                href="/shop"
                className="group mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-noir transition hover:bg-brand hover:text-white"
              >
                Open the shop
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}

/**
 * Before the first product goes live the hero still needs somewhere to land,
 * so the page says what is happening rather than showing an empty grid.
 */
function EmptyShop() {
  return (
    <section className="mx-auto max-w-md px-6 py-16 text-center">
      <h2 className="text-xl font-semibold tracking-tight text-ink">
        The shop opens soon
      </h2>
      <p className="mt-2 text-sm text-ink-secondary">
        Pieces are being photographed and priced. Everything published from the
        dashboard appears here the moment it goes live.
      </p>
    </section>
  );
}
