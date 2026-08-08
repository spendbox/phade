"use client";

import { Check } from "lucide-react";

import { useShop } from "@/components/shop/shop-provider";

/**
 * A one-line confirmation that something landed — added, saved, removed.
 *
 * It sits above the tab bar rather than at the top of the screen, so it lands
 * near the thumb that caused it and never covers the header. It announces
 * itself politely so a screen reader hears it without losing its place.
 */
export function Toaster() {
  const { toast } = useShop();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[90] flex justify-center px-4 lg:bottom-6"
    >
      {toast && (
        <p
          key={toast.id}
          className="sheet-up mb-3 flex max-w-sm items-center gap-2 rounded-full bg-noir px-4 py-2.5 text-[13px] font-medium text-white shadow-xl"
        >
          <Check className="size-4 shrink-0 text-white/70" aria-hidden />
          <span className="truncate">{toast.message}</span>
        </p>
      )}
    </div>
  );
}
