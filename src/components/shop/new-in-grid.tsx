"use client";

import { Plus } from "lucide-react";

import { Media } from "@/components/shop/media";
import { useShop } from "@/components/shop/shop-provider";
import { formatNairaShort } from "@/lib/format";
import { percentOff, type ShopProduct } from "@/lib/shop";

/**
 * What just landed, on the front page.
 *
 * The tiles are all the same portrait shape, because the clothes are: a dress
 * photographed head to hem is a tall picture, and a wide tile of one is a
 * crop of the hem and the ceiling. A mixed wall of tall and wide boxes was
 * tried here and it fought the photography every time.
 *
 * The names sit on the pictures rather than under them, so the section reads
 * as a wall of clothes rather than a list with captions. Each tile carries one
 * control — add it — and the picture itself opens the piece.
 *
 * Nothing wears a "New in" mark: everything under a heading that says New in
 * is new in, and a badge repeating the heading on every tile is noise. The
 * shop's own grid still marks them, where the surrounding pieces are not.
 */
export function NewInGrid({ products }: { products: ShopProduct[] }) {
  if (products.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:px-8">
      {products.map((product, index) => (
        <li key={product.id} className="min-w-0">
          <Tile product={product} siblings={products} priority={index < 2} />
        </li>
      ))}
    </ul>
  );
}

function Tile({
  product,
  siblings,
  priority,
}: {
  product: ShopProduct;
  siblings: ShopProduct[];
  priority: boolean;
}) {
  const { openProduct, addToBag } = useShop();

  const off = percentOff(product);
  const soldOut = product.stock <= 0;
  const needsChoice = product.colors.length > 1 || product.sizes.length > 1;

  return (
    <article className="group relative aspect-[3/4] overflow-hidden rounded-3xl bg-canvas-deep">
      <Media
        url={product.media[0]}
        alt={product.name}
        priority={priority}
        sizes="(min-width: 640px) 33vw, 50vw"
        className="size-full transition-transform duration-700 group-hover:scale-105"
      />

      <button
        type="button"
        onClick={() => openProduct(product, siblings)}
        className="absolute inset-0 size-full"
        aria-label={`Open ${product.name}, ${formatNairaShort(product.priceKobo)}`}
      />

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-noir/80 via-noir/25 to-transparent"
      />

      {off !== null && (
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white">
          {product.saleLabel ?? `−${off}%`}
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
              needsChoice ? openProduct(product, siblings) : addToBag({ product })
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
