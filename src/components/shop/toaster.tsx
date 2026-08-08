"use client";

import { Check } from "lucide-react";

import { useShop } from "@/components/shop/shop-provider";

/**
 * A one-line confirmation that something landed — added, saved, removed.
 *
 * It comes down from the top, not up from the bottom. The bottom of a phone is
 * where the buttons are: the tab bar, the bag drawer's Checkout, the pop-up's
 * Add to bag. A toast down there covers the very control that a shopper is
 * about to press next, which is how "added to your bag" ends up hiding the way
 * to pay for it.
 *
 * It announces itself politely, so a screen reader hears it without losing its
 * place, and it never takes a click — the message is a confirmation, not a
 * thing to interact with.
 */
export function Toaster() {
  const { toast } = useShop();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex justify-center px-4"
    >
      {toast && (
        <p
          key={toast.id}
          className="sheet-up flex max-w-sm items-center gap-2 rounded-full bg-noir px-4 py-2.5 text-[13px] font-medium text-white shadow-xl"
        >
          <Check className="size-4 shrink-0 text-white/70" aria-hidden />
          <span className="truncate">{toast.message}</span>
        </p>
      )}
    </div>
  );
}
