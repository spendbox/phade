"use client";

import { Plus } from "lucide-react";

import { Media } from "@/components/shop/media";
import { useShop } from "@/components/shop/shop-provider";
import { cn } from "@/lib/cn";
import { formatNairaShort } from "@/lib/format";
import { isNewIn, percentOff, type ShopProduct } from "@/lib/shop";

/**
 * What just arrived, laid out as a wall rather than a row.
 *
 * A rail says "here are ten equal things, keep scrolling". A wall of unequal
 * tiles says one of them matters more, and gives the eye somewhere to go: a
 * tall piece to open on, a wide one to break the rhythm, smaller ones to fill
 * in around them. It is the layout a lookbook has used for a century, and it
 * is what stops a new-in section from reading like a search result.
 *
 * The names sit on the pictures rather than under them, so the grid stays a
 * grid of clothes. Each tile carries one control — add it — and the picture
 * itself opens the piece.
 */

/**
 * The shape of the wall, by position. Only used once there are enough pieces
 * to fill it; a handful of products get even tiles instead of a hole where a
 * tall one should have been.
 */
const SPANS = [
  "row-span-2",
  "sm:col-span-2",
  "",
  "col-span-2 sm:col-span-1",
  "sm:col-span-2",
  "",
];

export function ProductMosaic({ products }: { products: ShopProduct[] }) {
  const shown = products.slice(0, SPANS.length);
  const shaped = shown.length === SPANS.length;

  if (shown.length === 0) return null;

  return (
    <ul className="grid auto-rows-[10.5rem] grid-cols-2 gap-3 px-4 sm:auto-rows-[13rem] sm:gap-4 sm:px-6 lg:grid-cols-3 lg:px-8">
      {shown.map((product, index) => (
        <li
          key={product.id}
          className={cn("min-w-0", shaped && SPANS[index])}
        >
          <Tile product={product} priority={index < 2} />
        </li>
      ))}
    </ul>
  );
}

function Tile({
  product,
  priority,
}: {
  product: ShopProduct;
  priority: boolean;
}) {
  const { openProduct, addToBag } = useShop();

  const off = percentOff(product);
  const soldOut = product.stock <= 0;
  const needsChoice = product.colors.length > 1 || product.sizes.length > 1;

  return (
    <article className="group relative size-full overflow-hidden rounded-3xl bg-canvas-deep">
      <Media
        url={product.media[0]}
        alt={product.name}
        priority={priority}
        sizes="(min-width: 1024px) 40vw, 60vw"
        className="size-full transition-transform duration-700 group-hover:scale-105"
      />

      <button
        type="button"
        onClick={() => openProduct(product)}
        className="absolute inset-0 size-full"
        aria-label={`Open ${product.name}, ${formatNairaShort(product.priceKobo)}`}
      />

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-noir/80 via-noir/25 to-transparent"
      />

      {(off !== null || isNewIn(product.createdAt)) && (
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-noir">
          {off !== null ? product.saleLabel ?? `−${off}%` : "New in"}
        </span>
      )}

      {soldOut && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-canvas/55">
          <span className="rounded-full bg-noir px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            Sold out
          </span>
        </span>
      )}

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white sm:text-sm">
            {product.name}
          </p>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold text-white tabular-nums">
              {formatNairaShort(product.priceKobo)}
            </span>
            {product.compareAtKobo && (
              <span className="text-[11px] text-white/65 line-through tabular-nums">
                {formatNairaShort(product.compareAtKobo)}
              </span>
            )}
          </p>
        </div>

        {!soldOut && (
          <button
            type="button"
            onClick={() =>
              needsChoice ? openProduct(product) : addToBag({ product })
            }
            aria-label={
              needsChoice
                ? `Choose options for ${product.name}`
                : `Add ${product.name} to bag`
            }
            className="pointer-events-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-noir shadow-lg transition hover:bg-brand hover:text-white active:scale-90"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </article>
  );
}
