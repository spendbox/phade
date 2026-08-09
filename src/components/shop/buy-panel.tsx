"use client";

import { useState } from "react";
import { Heart, Share2, ShoppingBag } from "lucide-react";

import { useShop } from "@/components/shop/shop-provider";
import { cn } from "@/lib/cn";
import {
  LOW_STOCK_SHOWS_AT,
  MAX_LINE_QUANTITY,
  type ShopProduct,
} from "@/lib/shop";

/**
 * Choosing and buying: colour, size, how many, and the four things a shopper
 * can do about it.
 *
 * It is split into a hook and two pieces of UI for one reason. In the pop-up
 * the choices scroll with the description while the buttons stay pinned to the
 * foot of the column — two places in the DOM, one piece of state. A sticky
 * element can never rise above its own parent, so "keep the buttons in view"
 * cannot be solved by nesting; they have to be a sibling of the scroll area.
 *
 * The product page has room for both together, and uses `BuyPanel` for that.
 * Either way the rules are the same code: a size that is required in the
 * pop-up is required on the page, which is how a shop avoids posting the wrong
 * dress.
 *
 * There is one button, not two. "Buy it now" beside "Add to bag" asked a
 * shopper to decide how to buy before they had decided what to buy; adding is
 * the only verb, and the floating bag takes it from there.
 */

export type BuyControls = ReturnType<typeof useBuyControls>;

/** What a shopper settled on, handed back the moment it lands in the bag. */
export type AddedChoice = {
  color: string | null;
  size: number | null;
  quantity: number;
};

/** How many of one colourway are left, when the shop counts them that way. */
function leftIn(product: ShopProduct, color: string | null): number | null {
  if (!color) return null;
  const chosen = product.colors.find((option) => option.name === color);
  return chosen?.stock === undefined ? null : chosen.stock;
}

export function useBuyControls(
  product: ShopProduct,
  /**
   * Told when something is actually added. A caller that takes this on also
   * takes on saying so — the toast stands down, because the pop-up answers by
   * folding itself down into a receipt instead.
   */
  onAdded?: (choice: AddedChoice) => void,
) {
  const { addToBag, isSaved, toggleSaved, say } = useShop();

  const soldOut = product.stock <= 0;

  // One colourway or one size isn't a choice — it's a fact, so it's pre-made.
  const [color, setColor] = useState<string | null>(
    product.colors.length === 1 ? product.colors[0].name : null,
  );
  const [size, setSize] = useState<number | null>(
    product.sizes.length === 1 ? product.sizes[0] : null,
  );
  const [quantity, setQuantity] = useState(1);
  const [missing, setMissing] = useState<"color" | "size" | null>(null);

  // A colourway with its own count is the ceiling: there is no use letting
  // someone order four of a dress when only one of them is in emerald.
  const inColour = leftIn(product, color);
  const available = inColour === null ? product.stock : inColour;
  const ceiling = Math.max(1, Math.min(available, MAX_LINE_QUANTITY));

  function add(): boolean {
    if (soldOut) return false;

    if (product.colors.length > 0 && !color) {
      setMissing("color");
      say("Choose a colour first");
      return false;
    }
    if (inColour !== null && inColour <= 0) {
      setMissing("color");
      say(`${color} has sold out — try another colour`);
      return false;
    }
    if (product.sizes.length > 0 && size === null) {
      setMissing("size");
      say("Choose a size first");
      return false;
    }

    setMissing(null);
    addToBag({ product, color, size, quantity, quiet: Boolean(onAdded) });
    onAdded?.({ color, size, quantity });
    return true;
  }

  return {
    product,
    soldOut,
    saved: isSaved(product.id),
    color,
    size,
    quantity,
    missing,
    ceiling,
    /** What's left in the chosen colourway, or null when nobody counts them. */
    inColour,
    choose(next: { color?: string; size?: number }) {
      if (next.color !== undefined) setColor(next.color);
      if (next.size !== undefined) setSize(next.size);
      setMissing(null);
    },
    setQuantity(next: number) {
      setQuantity(Math.min(Math.max(next, 1), ceiling));
    },
    add,
    toggleSaved: () => toggleSaved(product.id),
    async share() {
      const url = `${window.location.origin}/product/${product.slug}`;

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: product.name, url });
          return;
        } catch {
          // Cancelled, or refused — fall through to the clipboard.
        }
      }

      try {
        await navigator.clipboard.writeText(url);
        say("Link copied");
      } catch {
        say(url);
      }
    },
  };
}

/** Colour, size and quantity. Nothing here commits a shopper to anything. */
export function BuyChoices({
  controls,
  className,
}: {
  controls: BuyControls;
  className?: string;
}) {
  const { product, soldOut, color, size, quantity, missing } = controls;

  if (product.colors.length === 0 && product.sizes.length === 0 && soldOut) {
    return null;
  }

  return (
    <div className={className}>
      {product.colors.length > 0 && (
        <fieldset className="mb-5">
          <legend
            className={cn(
              "text-[13px] font-medium",
              missing === "color" ? "text-critical" : "text-ink-secondary",
            )}
          >
            Colour
            {color && <span className="text-ink"> · {color}</span>}
            {controls.inColour !== null &&
              controls.inColour > 0 &&
              controls.inColour <= LOW_STOCK_SHOWS_AT && (
                <span className="ml-1.5 text-brand">
                  only {controls.inColour} left
                </span>
              )}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.colors.map((option) => {
              const chosen = option.name === color;
              const gone = option.stock !== undefined && option.stock <= 0;

              return (
                <button
                  key={option.name}
                  type="button"
                  disabled={gone}
                  onClick={() => controls.choose({ color: option.name })}
                  aria-pressed={chosen}
                  title={gone ? `${option.name} — sold out` : option.name}
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-full ring-1 transition",
                    chosen
                      ? "ring-2 ring-noir ring-offset-2 ring-offset-canvas"
                      : "ring-line-strong hover:ring-noir",
                    gone && "cursor-not-allowed opacity-40 hover:ring-line-strong",
                  )}
                >
                  <span
                    className="size-7 rounded-full"
                    style={{ background: option.hex }}
                  />
                  {gone && (
                    // A line through it: the swatch is still legible, and it is
                    // obvious why it can't be pressed.
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-ink"
                    />
                  )}
                  <span className="sr-only">
                    {option.name}
                    {gone ? " — sold out" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {product.sizes.length > 0 && (
        <fieldset className="mb-5">
          <legend
            className={cn(
              "text-[13px] font-medium",
              missing === "size" ? "text-critical" : "text-ink-secondary",
            )}
          >
            Size
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((option) => {
              const chosen = option === size;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => controls.choose({ size: option })}
                  aria-pressed={chosen}
                  className={cn(
                    "h-9 min-w-11 rounded-full px-3 text-sm font-medium transition",
                    chosen
                      ? "bg-noir text-white"
                      : "bg-canvas-deep text-ink hover:bg-line-strong",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {!soldOut && (
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-ink-secondary">
            Quantity
          </span>
          <div className="flex items-center gap-1 rounded-full bg-canvas-deep p-1">
            <button
              type="button"
              onClick={() => controls.setQuantity(quantity - 1)}
              aria-label="Fewer"
              className="flex size-7 items-center justify-center rounded-full bg-canvas text-ink transition active:scale-90"
            >
              −
            </button>
            <span className="min-w-6 text-center text-[13px] font-medium tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => controls.setQuantity(quantity + 1)}
              aria-label="More"
              className="flex size-7 items-center justify-center rounded-full bg-canvas text-ink transition active:scale-90"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Save, share, add, buy. The row that has to stay within reach. */
export function BuyActions({
  controls,
  className,
}: {
  controls: BuyControls;
  className?: string;
}) {
  const { soldOut, saved } = controls;

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={controls.toggleSaved}
          aria-pressed={saved}
          aria-label={saved ? "Saved" : "Save"}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-canvas-deep text-ink transition hover:bg-line-strong active:scale-90"
        >
          <Heart
            className={cn("size-5", saved && "fill-brand text-brand")}
            aria-hidden
          />
        </button>

        <button
          type="button"
          onClick={controls.share}
          aria-label="Share"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-canvas-deep text-ink transition hover:bg-line-strong active:scale-90"
        >
          <Share2 className="size-5" aria-hidden />
        </button>

        <button
          type="button"
          onClick={controls.add}
          disabled={soldOut}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-noir text-sm font-semibold text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag className="size-4" aria-hidden />
          {soldOut ? "Sold out" : "Add to bag"}
        </button>
      </div>

      <p className="mt-2.5 text-center text-[11px] text-ink-muted">
        {soldOut
          ? "Message us and we'll tell you when it's back."
          : "Card, transfer or USSD · Secure checkout with Paystack"}
      </p>
    </div>
  );
}

/** Both halves together, for a page with room for them. */
export function BuyPanel({
  product,
  className,
}: {
  product: ShopProduct;
  className?: string;
}) {
  const controls = useBuyControls(product);

  return (
    <div className={className}>
      <BuyChoices controls={controls} className="mb-5" />
      <BuyActions controls={controls} />
    </div>
  );
}
