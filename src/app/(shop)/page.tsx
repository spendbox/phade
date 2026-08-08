import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";

import { AboutSection } from "@/components/shop/about-block";
import { CollectionCards } from "@/components/shop/collection-cards";
import { FeaturedStack } from "@/components/shop/featured-stack";
import { ProductCard, ProductRail } from "@/components/shop/product-card";
import { ProductMosaic } from "@/components/shop/product-mosaic";
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
 * It is built as a magazine rather than a catalogue, because a catalogue is
 * what every other shop already is. A story to look at, rooms to walk into,
 * a deck of the season's best that you throw through one card at a time, a
 * wall of what just landed, and — in the middle, where a reader has decided
 * they like the look of the place — the shop in its own words.
 *
 * Every heading, the line under New in, and the whole about section come from
 * Settings → Storefront. Nothing on this page needs a deploy to change, and
 * nothing that has been left unfilled renders as an empty shape.
 */
export default async function LandingPage() {
  const [content, catalogue] = await Promise.all([
    getStorefront(),
    getCatalogue(),
  ]);

  const { products, categories } = catalogue;
  const { headings } = content;

  const chosen = featured(products, content.featuredProductIds);
  const deck = chosen.length > 0 ? chosen.slice(0, 8) : products.slice(0, 5);
  const best = bestSellers(products, 10);
  const fresh = newIn(products, 6);

  // Anything not already shown above, so the last grid isn't a repeat.
  const shownAbove = new Set([
    ...deck.map((product) => product.id),
    ...best.map((product) => product.id),
    ...fresh.map((product) => product.id),
  ]);
  const explore = products
    .filter((product) => !shownAbove.has(product.id))
    .slice(0, 8);

  // Only what this page can actually open goes into the pop-up's registry.
  // Sending the whole catalogue would put every product in the shop into the
  // HTML of a page that shows forty of them.
  const onPage = [...deck, ...best, ...fresh, ...explore];

  // The words are the shop's own, from Settings → Storefront. Empty means the
  // owner didn't want a strip, so there isn't one.
  const marquee = content.marquee;

  return (
    <>
      <ProductRegistry products={onPage} />

      <StoryHero content={content} hasShop={products.length > 0} />

      {/* The collections ride up over the foot of the hero — the seam between
          the picture and the shop, and the first thing a thumb reaches. */}
      <section className="relative z-30 -mt-8 rounded-t-[2rem] bg-canvas pt-8 sm:-mt-10 sm:rounded-t-[2.5rem] sm:pt-10">
        {categories.length > 0 && (
          <>
            <Heading title={headings.collections} />
            <div className="mt-5">
              <CollectionCards categories={categories} />
            </div>
          </>
        )}
      </section>

      {products.length === 0 ? (
        <EmptyShop />
      ) : (
        <>
          {marquee.length > 0 && (
            <div className="mt-12 overflow-hidden border-y border-line bg-canvas-deep/50 py-3">
              <div className="marquee-track">
                {[0, 1].map((copy) => (
                  <div
                    key={copy}
                    className="flex shrink-0"
                    aria-hidden={copy === 1}
                  >
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
          )}

          {deck.length > 0 && (
            <section className="mt-12 px-4 sm:mt-16 sm:px-6 lg:px-8">
              {/* Dark, once, in the middle of an ivory page: the deck is the
                  one thing here meant to be played with rather than read. */}
              <div className="overflow-hidden rounded-[2rem] bg-noir px-5 py-10 text-white sm:px-10 sm:py-14">
                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                      {deck.length} piece{deck.length === 1 ? "" : "s"}
                    </p>
                    <h2 className="mt-3 text-balance text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
                      {headings.featured}
                    </h2>
                    <p className="mt-4 max-w-sm text-pretty text-[15px] leading-relaxed text-white/70">
                      Swipe a card away to meet the next one. Tap it to see
                      every photograph, the colours and the sizes.
                    </p>
                    <Link
                      href="/shop"
                      className="group mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-noir transition hover:bg-brand hover:text-white"
                    >
                      Shop everything
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </div>

                  <FeaturedStack products={deck} />
                </div>
              </div>
            </section>
          )}

          {fresh.length > 0 && (
            <section className="mt-14 sm:mt-20">
              <Heading title={headings.newIn} note={headings.newInTagline} />
              <div className="mt-6">
                <ProductMosaic products={fresh} />
              </div>
              <div className="mt-7 flex justify-center">
                <Link
                  href="/shop?sort=new"
                  className="inline-flex h-11 items-center rounded-full px-6 text-sm font-medium text-ink ring-1 ring-inset ring-line-strong transition hover:bg-canvas-deep"
                >
                  View all
                </Link>
              </div>
            </section>
          )}

          {content.about.enabled && (
            <div className="mt-14 sm:mt-20">
              <AboutSection about={content.about} />
            </div>
          )}

          {best.length > 0 && (
            <section className="mt-14 sm:mt-20">
              <Heading title={headings.bestSellers} href="/shop?sort=best" />
              <div className="mt-5">
                <ProductRail products={best} />
              </div>
            </section>
          )}

          {explore.length > 0 && (
            <section className="mt-14 sm:mt-20">
              <Heading title={headings.explore} />
              <div className="mt-5 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:grid-cols-4 lg:px-8">
                {explore.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-16 px-4 sm:mt-20 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[2rem] bg-canvas-deep px-6 py-12 text-center sm:px-10 sm:py-16">
              <p className="inline-flex items-center gap-2 rounded-full bg-noir/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-secondary">
                <ShoppingBag className="size-3.5" aria-hidden />
                {headings.closing}
              </p>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {products.length} piece{products.length === 1 ? "" : "s"},
                waiting to be found
              </h2>
              <Link
                href="/shop"
                className="group mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-noir px-7 text-sm font-semibold text-white transition hover:bg-brand"
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
 * A section heading, editorial rather than utilitarian: a hairline, a large
 * name, and the sentence underneath if the shop wrote one. The link out is
 * optional on purpose — most sections don't need one, and a page of "see all"
 * buttons is a page that trusts none of them.
 */
function Heading({
  title,
  note,
  href,
}: {
  title: string;
  note?: string;
  href?: string;
}) {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <span aria-hidden className="block h-px w-10 bg-brand" />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl lg:text-[2.25rem]">
            {title}
          </h2>
          {note && (
            <p className="mt-2 max-w-xl text-pretty text-[15px] leading-relaxed text-ink-secondary">
              {note}
            </p>
          )}
        </div>

        {href && (
          <Link
            href={href}
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink-secondary transition hover:text-brand"
          >
            See all
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        )}
      </div>
    </div>
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
