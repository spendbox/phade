"use client";

import { Heart, Plus } from "lucide-react";

import { Media } from "@/components/shop/media";
import { Rail } from "@/components/shop/rail";
import { useShop } from "@/components/shop/shop-provider";
import { posterFor } from "@/lib/media";
import { cn } from "@/lib/cn";
import { formatNairaShort } from "@/lib/format";
import { isNewIn, percentOff, type ShopProduct } from "@/lib/shop";

/**
 * A product in a grid or a rail.
 *
 * The whole tile is the target — a shopper on a phone should never have to
 * find a link inside a picture. Tapping it opens the pop-up rather than
 * navigating, so the grid they scrolled halfway down is still there behind it.
 *
 * Two controls sit above that target: saving, and adding to the bag. Both are
 * decisions a shopper makes from the grid, and sending either one through the
 * pop-up first would be a tax on the fast path. They are siblings of the
 * full-tile button rather than children of it, because a button inside a
 * button is not a thing a browser will honour.
 */
export function ProductCard({
  product,
  siblings,
  priority = false,
  className,
}: {
  product: ShopProduct;
  /** The grid or rail this card sits in, so the pop-up can be swiped along it. */
  siblings?: ShopProduct[];
  priority?: boolean;
  className?: string;
}) {
  const { openProduct, isSaved, toggleSaved, addToBag } = useShop();

  const off = percentOff(product);
  const soldOut = product.stock <= 0;
  const saved = isSaved(product.id);
  // Choosing between colours or sizes is what the pop-up is for.
  const needsChoice = product.colors.length > 1 || product.sizes.length > 1;

  return (
    // `isolate` gives the card its own stacking context. Without it the save
    // and add buttons (z-30, inside the card) compete with the sticky category
    // bar (z-30, above the page) — same level, later in the DOM, so a card
    // would paint over the navigation it was supposed to scroll under.
    <article className={cn("group isolate", className)}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-canvas-deep">
        <Media
          url={product.media[0]}
          poster={posterFor(product.media)}
          alt={product.name}
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 45vw"
          className="size-full transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* No second picture on hover. A tile that swaps its photograph as the
            cursor crosses it makes a grid twitch on the way to somewhere else,
            and the shot the shop chose to lead with is the one that should be
            there when someone looks. The other pictures are a tap away. */}

        <button
          type="button"
          onClick={() => openProduct(product, siblings)}
          className="tap absolute inset-0 z-10 size-full"
          aria-label={`${product.name}, ${formatNairaShort(product.priceKobo)}`}
        />

        <div className="pointer-events-none absolute left-2 top-2 z-20 flex flex-col items-start gap-1">
          {off !== null ? (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
              −{off}%
            </span>
          ) : (
            isNewIn(product.createdAt) && (
              <span className="rounded-full bg-noir/85 px-2 py-0.5 text-[11px] font-semibold text-white">
                New in
              </span>
            )
          )}
        </div>

        {soldOut && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-canvas/60">
            <span className="rounded-full bg-noir px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              Sold out
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => toggleSaved(product.id)}
          aria-pressed={saved}
          aria-label={saved ? `Unsave ${product.name}` : `Save ${product.name}`}
          className="absolute right-2 top-2 z-30 flex size-9 items-center justify-center rounded-full bg-canvas/85 text-noir backdrop-blur transition hover:bg-canvas active:scale-90"
        >
          <Heart
            className={cn("size-4", saved && "fill-brand text-brand")}
            aria-hidden
          />
        </button>

        {!soldOut && (
          <button
            type="button"
            onClick={() =>
              needsChoice ? openProduct(product, siblings) : addToBag({ product })
            }
            aria-label={
              needsChoice
                ? `Choose options for ${product.name}`
                : `Add ${product.name} to bag`
            }
            className="absolute bottom-2 right-2 z-30 flex size-9 items-center justify-center rounded-full bg-noir text-white shadow-lg transition hover:bg-brand active:scale-90"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="px-0.5 pt-2.5">
        <h3 className="truncate text-[13px] font-medium text-ink sm:text-sm">
          {product.name}
        </h3>
        <p className="mt-0.5 flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-[13px] font-semibold tabular-nums sm:text-sm",
              product.compareAtKobo ? "text-brand" : "text-ink",
            )}
          >
            {formatNairaShort(product.priceKobo)}
          </span>
          {product.compareAtKobo && (
            <span className="text-xs text-ink-muted line-through tabular-nums">
              {formatNairaShort(product.compareAtKobo)}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}

/** A rail of products: flick sideways, each card settles under your thumb. */
export function ProductRail({
  products,
  priority = false,
}: {
  products: ShopProduct[];
  priority?: boolean;
}) {
  return (
    <Rail className="gap-3 px-4 pb-1 sm:gap-4 sm:px-6 lg:px-8">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          siblings={products}
          priority={priority && index < 3}
          className="w-[45vw] max-w-[15rem] sm:w-52 lg:w-56"
        />
      ))}
      {/* A hair of room past the last card, so it can snap clear of the edge. */}
      <div className="w-1 shrink-0" aria-hidden />
    </Rail>
  );
}
