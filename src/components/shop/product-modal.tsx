"use client";

import { useState } from "react";
import { Check, ShoppingBag, Truck, X } from "lucide-react";

import {
  BuyActions,
  BuyChoices,
  useBuyControls,
  type AddedChoice,
} from "@/components/shop/buy-panel";
import { Media } from "@/components/shop/media";
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
 *
 * Once something is added the card has done its job, so it folds down to a
 * receipt: what went in, what the bag now holds, and the two ways on from
 * there. A full-height panel of choices already made is just a wall between a
 * shopper and the next thing they wanted to look at.
 */
export function ProductModal() {
  const { viewing, closeProduct } = useShop();
  const [added, setAdded] = useState<AddedChoice | null>(null);

  // Opening a different product — or closing this one — starts full size
  // again. Adjusting during the render that noticed, rather than in an effect,
  // because a receipt for the dress you just closed must never paint at all.
  const openId = viewing?.id ?? null;
  const [shownId, setShownId] = useState(openId);
  if (shownId !== openId) {
    setShownId(openId);
    setAdded(null);
  }

  return (
    <Sheet
      open={Boolean(viewing)}
      onClose={closeProduct}
      label={viewing?.name ?? "Product"}
      side="center"
      className={cn(
        "w-full overflow-hidden rounded-t-3xl bg-canvas sm:rounded-3xl",
        added
          ? "sm:max-w-sm"
          : "h-[92dvh] sm:h-auto sm:max-h-[92dvh] sm:max-w-5xl",
      )}
    >
      {viewing &&
        (added ? (
          <Receipt
            product={viewing}
            choice={added}
            onBack={() => setAdded(null)}
            onClose={closeProduct}
          />
        ) : (
          <Detail
            key={viewing.id}
            product={viewing}
            onAdded={setAdded}
            onClose={closeProduct}
          />
        ))}
    </Sheet>
  );
}

function Detail({
  product,
  onAdded,
  onClose,
}: {
  product: ShopProduct;
  onAdded: (choice: AddedChoice) => void;
  onClose: () => void;
}) {
  const controls = useBuyControls(product, onAdded);
  const soldOut = product.stock <= 0;
  const off = percentOff(product);

  return (
    <div className="flex h-full min-h-0 flex-col sm:grid sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] sm:overflow-hidden">
      <ProductGallery
        product={product}
        className="h-[46dvh] shrink-0 sm:h-[min(80dvh,42rem)]"
      />

      <CloseButton onClose={onClose} />

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

          <BuyChoices controls={controls} className="mt-5" />

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
            Delivered nationwide. Collection is free at checkout.
          </p>

        </div>

        {/* Outside the scroll area on purpose: these never scroll away. */}
        <BuyActions
          controls={controls}
          className="border-t border-line bg-canvas px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5"
        />
      </div>
    </div>
  );
}

/**
 * The folded-down pop-up: it landed, here is what landed, here is the bag.
 *
 * "Keep shopping" is the wide button because it is what nearly everyone does
 * next, and the shop they were browsing is still underneath, untouched.
 */
function Receipt({
  product,
  choice,
  onBack,
  onClose,
}: {
  product: ShopProduct;
  choice: AddedChoice;
  onBack: () => void;
  onClose: () => void;
}) {
  const { count, subtotalKobo, openBag } = useShop();

  const variant = [
    choice.color,
    choice.size ? `UK ${choice.size}` : null,
    choice.quantity > 1 ? `×${choice.quantity}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rise px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:pb-5">
      <CloseButton onClose={onClose} />

      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand text-white">
          <Check className="size-3.5" aria-hidden />
        </span>
        Added to your bag
      </p>

      <div className="mt-4 flex gap-3 rounded-2xl bg-canvas-deep/60 p-3">
        <Media
          url={product.media[0] ?? null}
          alt=""
          className="size-16 shrink-0 rounded-xl bg-canvas"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink">
            {product.name}
          </p>
          {variant && (
            <p className="mt-0.5 text-xs text-ink-secondary">{variant}</p>
          )}
          <p className="mt-1 text-[13px] font-semibold text-ink tabular-nums">
            {formatNairaShort(product.priceKobo * choice.quantity)}
          </p>
        </div>
      </div>

      <p className="mt-3 flex items-center justify-between text-[13px]">
        <span className="text-ink-secondary">
          Bag · {count} item{count === 1 ? "" : "s"}
        </span>
        <span className="font-semibold text-ink tabular-nums">
          {formatNairaShort(subtotalKobo)}
        </span>
      </p>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-noir text-sm font-semibold text-white transition hover:bg-brand"
      >
        Keep shopping
      </button>

      <button
        type="button"
        onClick={openBag}
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-ink ring-1 ring-inset ring-line-strong transition hover:bg-canvas-deep"
      >
        <ShoppingBag className="size-4" aria-hidden />
        View bag
      </button>

      <button
        type="button"
        onClick={onBack}
        className="mt-2 h-9 w-full text-[13px] text-ink-secondary underline underline-offset-4 transition hover:text-ink"
      >
        Back to the product
      </button>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute right-3 top-3 z-30 flex size-9 items-center justify-center rounded-full bg-canvas/85 text-noir backdrop-blur transition hover:bg-canvas active:scale-90"
    >
      <X className="size-5" aria-hidden />
    </button>
  );
}
