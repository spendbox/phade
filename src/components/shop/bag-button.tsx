"use client";

import { ShoppingBag } from "lucide-react";

import { useShop } from "@/components/shop/shop-provider";
import { formatNairaShort } from "@/lib/format";

/**
 * The bag, following you down the page.
 *
 * It appears the moment there is something in it and not before, because a
 * floating button over an empty bag is a floating button in the way. Once it
 * is there it carries the count and the running total, so a shopper deciding
 * whether to add one more thing can see what they are already spending
 * without opening anything.
 *
 * On a phone it sits above the tab bar rather than over it — the tab bar is
 * fixed at the bottom and one of its four items is the bag, so a button that
 * covered it would hide the thing it duplicates. On a wider screen there is no
 * tab bar, and it drops to the corner.
 */
export function BagButton() {
  const { count, subtotalKobo, openBag, bagOpen, viewing, ready } = useShop();

  // Nothing to show, or something already showing it: stay out of the way.
  if (!ready || count === 0 || bagOpen || viewing) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 flex justify-end px-4 pb-3 lg:bottom-0 lg:px-6 lg:pb-6">
      <button
        type="button"
        onClick={openBag}
        className="sheet-up pointer-events-auto flex h-14 items-center gap-3 rounded-full bg-noir pl-5 pr-4 text-white shadow-xl transition hover:bg-brand active:scale-95"
      >
        <span className="relative">
          <ShoppingBag className="size-5" aria-hidden />
          <span className="absolute -right-2.5 -top-2 flex min-w-[1.15rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-[1.15rem] text-white tabular-nums">
            {count}
          </span>
        </span>

        <span className="text-left">
          <span className="block text-[13px] font-semibold leading-tight">
            View bag
          </span>
          <span className="block text-[11px] leading-tight text-white/70 tabular-nums">
            {formatNairaShort(subtotalKobo)}
          </span>
        </span>
      </button>
    </div>
  );
}
