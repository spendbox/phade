"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

/**
 * The shop's one overlay: the bag drawer and the product pop-up are both this.
 *
 * It portals to `document.body` for the same reason the dashboard's dialog
 * does — an overlay rendered inside the card that opened it inherits that
 * card's `overflow` and stacking context and vanishes the moment the card
 * re-renders.
 *
 * On a phone it rises from the bottom, where a thumb is. On a wider screen it
 * takes the side or the middle, whichever the caller asks for.
 */
export function Sheet({
  open,
  onClose,
  label,
  side = "right",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  side?: "right" | "center";
  className?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Hold the page still underneath, and keep it from jumping sideways as the
    // scrollbar goes away on desktop.
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[80] flex",
        side === "right"
          ? "items-end justify-center sm:items-stretch sm:justify-end"
          : "items-end justify-center sm:items-center sm:p-4 lg:p-6",
      )}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-noir/50 backdrop-blur-[3px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn("sheet-up relative flex flex-col", className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
