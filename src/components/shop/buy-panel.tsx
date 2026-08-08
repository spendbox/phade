"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Heart, Share2, ShoppingBag } from "lucide-react";

import { useShop } from "@/components/shop/shop-provider";
import { cn } from "@/lib/cn";
import { MAX_LINE_QUANTITY, type ShopProduct } from "@/lib/shop";

/**
 * Choosing and buying: colour, size, how many, and the four things a shopper
 * can do about it.
 *
 * It is one component because the pop-up and the product page must behave
 * identically — a size that is required in one and optional in the other is
 * how a shop ends up posting the wrong dress. The pop-up passes `onDone` so it
 * can close itself on "Buy it now"; the page leaves it out.
 */
export function BuyPanel({
  product,
  onDone,
  stickyActions = false,
  className,
}: {
  product: ShopProduct;
  onDone?: () => void;
  /**
   * Pins the buttons to the foot of the scrolling column they sit in, so a
   * shopper reading the description never has to scroll back to buy. Sticky
   * rather than a second fixed bar, so there is still only one set of them.
   */
  stickyActions?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { addToBag, isSaved, toggleSaved, say } = useShop();

  const soldOut = product.stock <= 0;
  const saved = isSaved(product.id);

  // One colourway or one size isn't a choice — it's a fact, so it's pre-made.
  const [color, setColor] = useState<string | null>(
    product.colors.length === 1 ? product.colors[0].name : null,
  );
  const [size, setSize] = useState<number | null>(
    product.sizes.length === 1 ? product.sizes[0] : null,
  );
  const [quantity, setQuantity] = useState(1);
  const [missing, setMissing] = useState<"color" | "size" | null>(null);

  const ceiling = Math.max(1, Math.min(product.stock, MAX_LINE_QUANTITY));

  function add(): boolean {
    if (soldOut) return false;

    if (product.colors.length > 0 && !color) {
      setMissing("color");
      say("Choose a colour first");
      return false;
    }
    if (product.sizes.length > 0 && size === null) {
      setMissing("size");
      say("Choose a size first");
      return false;
    }

    setMissing(null);
    addToBag({ product, color, size, quantity });
    return true;
  }

  function buyNow() {
    if (!add()) return;
    onDone?.();
    router.push("/checkout");
  }

  async function share() {
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
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.colors.map((option) => {
              const chosen = option.name === color;
              return (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => {
                    setColor(option.name);
                    setMissing(null);
                  }}
                  aria-pressed={chosen}
                  title={option.name}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full ring-1 transition",
                    chosen
                      ? "ring-2 ring-noir ring-offset-2 ring-offset-canvas"
                      : "ring-line-strong hover:ring-noir",
                  )}
                >
                  <span
                    className="size-7 rounded-full"
                    style={{ background: option.hex }}
                  />
                  <span className="sr-only">{option.name}</span>
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
                  onClick={() => {
                    setSize(option);
                    setMissing(null);
                  }}
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
        <div className="mb-5 flex items-center gap-3">
          <span className="text-[13px] font-medium text-ink-secondary">
            Quantity
          </span>
          <div className="flex items-center gap-1 rounded-full bg-canvas-deep p-1">
            <button
              type="button"
              onClick={() => setQuantity((n) => Math.max(1, n - 1))}
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
              onClick={() => setQuantity((n) => Math.min(n + 1, ceiling))}
              aria-label="More"
              className="flex size-7 items-center justify-center rounded-full bg-canvas text-ink transition active:scale-90"
            >
              +
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          stickyActions &&
            "sticky bottom-0 z-10 -mx-5 border-t border-line bg-canvas px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:-mx-7 sm:px-7 sm:pb-5",
        )}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleSaved(product.id)}
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
            onClick={share}
            aria-label="Share"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-canvas-deep text-ink transition hover:bg-line-strong active:scale-90"
          >
            <Share2 className="size-5" aria-hidden />
          </button>

          <button
            type="button"
            onClick={add}
            disabled={soldOut}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-noir text-sm font-semibold text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingBag className="size-4" aria-hidden />
            {soldOut ? "Sold out" : "Add to bag"}
          </button>
        </div>

        {!soldOut && (
          <button
            type="button"
            onClick={buyNow}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-soft text-sm font-semibold text-brand transition hover:bg-brand hover:text-white"
          >
            <Check className="size-4" aria-hidden />
            Buy it now
          </button>
        )}
      </div>
    </div>
  );
}
