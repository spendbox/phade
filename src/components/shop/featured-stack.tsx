"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Heart, ShoppingBag } from "lucide-react";

import { Media } from "@/components/shop/media";
import { useShop } from "@/components/shop/shop-provider";
import { LOGO_MARK } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { formatNairaShort } from "@/lib/format";
import { LOW_STOCK_SHOWS_AT, percentOff, type ShopProduct } from "@/lib/shop";

/**
 * The pieces the shop is proudest of, as a deck of cards you throw away.
 *
 * A grid of featured products is a grid: the eye prices them against each
 * other and moves on. A stack shows one thing at a time, the way a story does,
 * and asks for the one gesture a phone has trained everyone to make. What is
 * behind the top card is visible at the edges, so it is obvious there is more
 * without a single instruction.
 *
 * Each card shows a product's first picture and only its first. The swipe
 * belongs to the deck — it moves between pieces — so it can't also mean "next
 * photograph of this piece"; a gesture with two meanings has none. The whole
 * gallery is a tap away in the pop-up, which is where it belongs.
 */

/** How far a card has to be thrown before it doesn't come back. */
const THROW_AT = 88;
/** How long the thrown card takes to clear the frame. */
const FLIGHT_MS = 220;

export function FeaturedStack({ products }: { products: ShopProduct[] }) {
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [held, setHeld] = useState(false);
  const [touched, setTouched] = useState(false);

  const drag = useRef<{ x: number; y: number; ours: boolean | null } | null>(
    null,
  );
  const flight = useRef<number | null>(null);

  useEffect(() => () => window.clearTimeout(flight.current ?? undefined), []);

  if (products.length === 0) return null;

  const total = products.length;
  const at = ((index % total) + total) % total;

  /** Sends the top card away and brings the next one forward. */
  function go(by: 1 | -1) {
    if (flight.current !== null) return;
    setTouched(true);
    setHeld(false);
    setOffset(by * 520);

    flight.current = window.setTimeout(() => {
      flight.current = null;
      setIndex((current) => current + by);
      setOffset(0);
    }, FLIGHT_MS);
  }

  // ---- dragging the top card -----------------------------------------------
  function onPointerDown(event: React.PointerEvent) {
    if (flight.current !== null || total < 2) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, ours: null };
  }

  function onPointerMove(event: React.PointerEvent) {
    const start = drag.current;
    if (!start || start.ours === false) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    // The first few pixels decide who owns the gesture. Mostly sideways is a
    // throw; anything else is the page scrolling, and it keeps scrolling.
    if (start.ours === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      start.ours = Math.abs(dx) > Math.abs(dy);
      if (!start.ours) return;
      setHeld(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    setOffset(dx);
  }

  function onPointerUp() {
    const start = drag.current;
    drag.current = null;
    if (!start?.ours) return;

    setHeld(false);
    if (offset <= -THROW_AT) go(1);
    else if (offset >= THROW_AT) go(-1);
    else setOffset(0);
  }

  // Three at a time is all a stack needs to read as a stack, and all a phone
  // should be asked to decode at once.
  const depth = Math.min(total, 3);
  const cards = Array.from({ length: depth }, (_, step) => ({
    step,
    product: products[(at + step) % total],
  }));

  return (
    <div className="select-none">
      {/* Room under the top card for the two behind it to show. */}
      <div className="relative mx-auto aspect-[7/9] w-full max-w-sm pb-9 sm:max-w-md">
        {/* Painted back to front, so the card on top is the one in the DOM
            last and no z-index has to be invented for it. */}
        {[...cards].reverse().map(({ step, product }) => {
          const top = step === 0;
          const thrown = top && Math.abs(offset) > 0;

          return (
            <div
              key={`${product.id}-${step}`}
              aria-hidden={!top}
              onPointerDown={top ? onPointerDown : undefined}
              onPointerMove={top ? onPointerMove : undefined}
              onPointerUp={top ? onPointerUp : undefined}
              onPointerCancel={top ? onPointerUp : undefined}
              className={cn(
                "absolute inset-x-0 top-0 bottom-9",
                top && total > 1 && "touch-pan-y",
                top && (held ? "cursor-grabbing" : "cursor-grab"),
                !held && "transition-transform duration-200 ease-out",
              )}
              style={{
                transform: top
                  ? `translateX(${offset}px) rotate(${offset * 0.03}deg)`
                  : `translateY(${step * 18}px) scale(${1 - step * 0.05})`,
                opacity: top ? Math.max(1 - Math.abs(offset) / 620, 0) : 1,
                zIndex: depth - step,
              }}
            >
              <Card product={product} live={top} muted={!top && !thrown} />
            </div>
          );
        })}
      </div>

      {total > 1 && (
        <div className="mx-auto mt-5 flex max-w-sm items-center justify-between gap-4 px-1 sm:max-w-md">
          <div className="flex items-center gap-1.5" aria-hidden>
            {products.slice(0, 8).map((product, position) => (
              <span
                key={product.id}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  position === at % Math.min(total, 8)
                    ? "w-5 bg-noir"
                    : "w-1.5 bg-ink/20",
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!touched && (
              <span className="mr-1 hidden text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted sm:inline">
                Swipe
              </span>
            )}
            <Throw label="Previous piece" onClick={() => go(-1)}>
              <ArrowLeft className="size-4" aria-hidden />
            </Throw>
            <Throw label="Next piece" onClick={() => go(1)}>
              <ArrowRight className="size-4" aria-hidden />
            </Throw>
          </div>
        </div>
      )}
    </div>
  );
}

function Throw({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-ink transition hover:bg-noir hover:text-white active:scale-90"
    >
      {children}
    </button>
  );
}

/**
 * One card. It borrows the shape of a post — a name at the top, a picture, a
 * line underneath — because that is the shape everyone's thumb already knows,
 * and it carries exactly two controls: put it in the bag, or keep it.
 */
function Card({
  product,
  live,
  muted,
}: {
  product: ShopProduct;
  live: boolean;
  muted: boolean;
}) {
  const { openProduct, isSaved, toggleSaved, addToBag } = useShop();

  const saved = isSaved(product.id);
  const off = percentOff(product);
  const soldOut = product.stock <= 0;
  const needsChoice = product.colors.length > 1 || product.sizes.length > 1;

  return (
    <article
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-[1.75rem] bg-canvas shadow-[0_1px_0_rgb(11_11_12_/_0.06),0_30px_60px_-40px_rgb(11_11_12_/_0.55)] ring-1 ring-inset ring-line/60 transition-opacity",
        muted && "opacity-90",
      )}
    >
      <header className="flex items-center gap-2.5 px-4 py-3">
        <span className="story-ring flex size-9 shrink-0 rounded-full">
          <span className="story-ring-inner flex rounded-full">
            <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-canvas-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_MARK} alt="" className="size-4" />
            </span>
          </span>
        </span>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">
            phadewoman
          </p>
          <p className="truncate text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            {product.categoryName ?? "Featured"}
          </p>
        </div>

        {off !== null && (
          <span className="ml-auto shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
            {product.saleLabel ?? `−${off}%`}
          </span>
        )}
      </header>

      <div className="relative min-h-0 flex-1 bg-canvas-deep">
        <Media
          url={product.media[0]}
          alt={product.name}
          priority={live}
          sizes="(min-width: 640px) 28rem, 92vw"
          className="size-full"
        />

        <button
          type="button"
          onClick={() => openProduct(product)}
          tabIndex={live ? 0 : -1}
          className="absolute inset-0 size-full"
          aria-label={`Open ${product.name}`}
        />

        {soldOut && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-canvas/60">
            <span className="rounded-full bg-noir px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              Sold out
            </span>
          </span>
        )}

        {!soldOut && product.stock <= LOW_STOCK_SHOWS_AT && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-noir/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            Only {product.stock} left
          </span>
        )}
      </div>

      <footer className="flex items-center gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => openProduct(product)}
            tabIndex={live ? 0 : -1}
            className="block max-w-full truncate text-left text-[15px] font-semibold text-ink hover:text-brand"
          >
            {product.name}
          </button>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
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

        <button
          type="button"
          onClick={() => toggleSaved(product.id)}
          tabIndex={live ? 0 : -1}
          aria-pressed={saved}
          aria-label={saved ? `Unsave ${product.name}` : `Save ${product.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-canvas-deep text-ink transition hover:bg-line-strong active:scale-90"
        >
          <Heart
            className={cn("size-5", saved && "fill-brand text-brand")}
            aria-hidden
          />
        </button>

        <button
          type="button"
          disabled={soldOut}
          tabIndex={live ? 0 : -1}
          onClick={() =>
            needsChoice ? openProduct(product) : addToBag({ product })
          }
          className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-noir px-5 text-sm font-semibold text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag className="size-4" aria-hidden />
          {soldOut ? "Sold out" : needsChoice ? "Choose" : "Add"}
        </button>
      </footer>
    </article>
  );
}
