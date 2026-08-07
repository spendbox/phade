"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * The one dialog primitive. Every dialog on the dashboard uses it.
 *
 * It renders into `document.body` through a portal. That matters more than it
 * looks: dialogs are usually opened from inside something transient — a row
 * menu, a popover, a card that re-renders — and a dialog whose markup lives
 * inside that trigger inherits its ancestor's `overflow`, `transform` and
 * stacking context, and disappears the moment the trigger's panel closes. That
 * is exactly how the sale editor came to flash and vanish. Portalling makes the
 * dialog's position in the DOM independent of where it was opened from.
 *
 * Two rules keep it that way:
 *   1. Dialogs are opened through this component, never hand-rolled.
 *   2. A menu that hosts a dialog trigger must not unmount its children when it
 *      closes — see `RowMenu`, which hides its panel instead.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  /** Rendered as the dialog heading. Omit to supply your own header. */
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Hold the page still behind the dialog.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  // A dialog only opens from a user gesture, so `document` is always there by
  // the time this renders anything — the guard is for the server pass.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-labelledby={labelledBy}
        className={cn(
          "relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl",
          size === "xl" && "max-w-4xl",
        )}
      >
        {title && (
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-plane hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </header>
        )}

        {children}
      </div>
    </div>,
    document.body,
  );
}
