"use client";

import Link from "next/link";
import { Maximize2, Truck, X } from "lucide-react";

import { BuyPanel } from "@/components/shop/buy-panel";
import { ProductGallery } from "@/components/shop/product-gallery";
import { Sheet } from "@/components/shop/sheet";
import { useShop } from "@/components/shop/shop-provider";
import { cn } from "@/lib/cn";
import { formatNairaShort } from "@/lib/format";
import { LOW_STOCK_SHOWS_AT, percentOff, type ShopProduct } from "@/lib/shop";

/**
 * The pop-up a product opens into.
 *
 * A shopper who taps a dress on a phone is doing what they do all evening in a
 * feed: looking, swiping, deciding in seconds. So this is not a page — it is a
 * card over the one they were reading. The pictures fill the frame and swipe,
 * a double-tap saves, and the buttons that matter sit in a bar that never
 * scrolls away. Closing it puts them back exactly where they were, halfway
 * down the grid, with the same filters still on.
 *
 * On a wider screen the same card becomes two columns, because a cursor is
 * happy to move sideways and a big picture deserves the room.
 */
export function ProductModal() {
  const { viewing, closeProduct } = useShop();

  return (
    <Sheet
      open={Boolean(viewing)}
      onClose={closeProduct}
      label={viewing?.name ?? "Product"}
      side="center"
      className="h-[92dvh] w-full overflow-hidden rounded-t-3xl bg-canvas sm:h-auto sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-3xl"
    >
      {viewing && (
        <Detail key={viewing.id} product={viewing} onClose={closeProduct} />
      )}
    </Sheet>
  );
}

function Detail({
  product,
  onClose,
}: {
  product: ShopProduct;
  onClose: () => void;
}) {
  const soldOut = product.stock <= 0;
  const off = percentOff(product);

  return (
    <div className="flex h-full min-h-0 flex-col sm:grid sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] sm:overflow-hidden">
      <ProductGallery
        product={product}
        className="h-[46dvh] shrink-0 sm:h-[min(80dvh,42rem)]"
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 z-30 flex size-9 items-center justify-center rounded-full bg-canvas/85 text-noir backdrop-blur transition hover:bg-canvas active:scale-90"
      >
        <X className="size-5" aria-hidden />
      </button>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-5 pt-4 sm:px-7 sm:pt-7">
          {product.categoryName && (
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              {product.categoryName}
              {product.subcategory && ` · ${product.subcategory}`}
            </p>
          )}

          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {product.name}
          </h2>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-lg font-semibold tabular-nums",
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
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-secondary">
              {product.description}
            </p>
          )}

          {product.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {product.tags.slice(0, 8).map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-canvas-deep px-2.5 py-1 text-[11px] text-ink-secondary"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 flex items-center gap-2 rounded-xl bg-canvas-deep/70 px-3 py-2.5 text-[13px] text-ink-secondary">
            <Truck className="size-4 shrink-0 text-ink-muted" aria-hidden />
            Delivered nationwide. Pickup in Lagos is free at checkout.
          </p>

          <Link
            href={`/product/${product.slug}`}
            onClick={onClose}
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary underline underline-offset-4 transition hover:text-brand"
          >
            <Maximize2 className="size-3.5" aria-hidden />
            Open the full page
          </Link>

          {/* The buttons pin to the foot of this column and stay there. */}
          <BuyPanel
            product={product}
            onDone={onClose}
            stickyActions
            className="mt-6"
          />
        </div>
      </div>
    </div>
  );
}
