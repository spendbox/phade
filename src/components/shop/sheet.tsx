"use client";

import { useEffect, useRef, useState } from "react";
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
 *
 * A sheet that rose with a thumb closes with one: drag it down and it follows,
 * let go past a threshold and it goes. That is how every sheet on a phone
 * behaves, and a shopper should not have to hunt for the small ✕ in the corner
 * to get back to the grid.
 *
 * Sideways is a different sentence, and a caller can claim it: the product
 * pop-up uses it to move along the row the piece was tapped out of. A gesture
 * that starts inside something which scrolls sideways of its own — a gallery,
 * a rail — belongs to that thing and is left alone.
 */

/** How far down a sheet must be dragged before letting go dismisses it. */
const DISMISS_AT = 110;
/** …or how fast it has to be moving, so a short flick counts too. */
const FLICK_SPEED = 0.55;
/** How far sideways counts as "the next one". */
const STEP_AT = 64;

export function Sheet({
  open,
  onClose,
  label,
  side = "right",
  className,
  onSwipe,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  side?: "right" | "center";
  className?: string;
  /** Sideways, if the caller has something for it to mean. */
  onSwipe?: (direction: 1 | -1) => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const [pulled, setPulled] = useState(0);
  const [slid, setSlid] = useState(0);

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

  // ---- drag it down to dismiss ---------------------------------------------
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;

    let startY = 0;
    let startX = 0;
    let startedAt = 0;
    let distance = 0;
    let sideways = 0;
    /**
     * Null until the first move decides which way this gesture is going.
     * "vertical-only" is a gesture that began inside something which scrolls
     * sideways of its own, so it may still become a dismissal but never a step.
     */
    let axis: "down" | "across" | "neither" | "vertical-only" | null = null;

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      startY = touch.clientY;
      startX = touch.clientX;
      startedAt = Date.now();
      distance = 0;
      sideways = 0;
      // A sheet whose content is scrolled down is being read, not dismissed.
      // Only a list already at its top may be pulled away.
      axis = atTop(event.target, element) ? null : "neither";
      // A gallery or a rail owns sideways within its own bounds.
      if (axis === null && scrollsSideways(event.target, element)) {
        axis = "vertical-only";
      }
    };

    const onMove = (event: TouchEvent) => {
      if (axis === "neither" || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const down = touch.clientY - startY;
      const across = touch.clientX - startX;

      // The first few pixels decide: mostly downward is a dismissal, mostly
      // sideways is the next piece along, and anything else belongs to
      // whatever is underneath — a rail that scrolls, a list that reads.
      if (axis === null || axis === "vertical-only") {
        if (Math.abs(down) < 8 && Math.abs(across) < 8) return;
        const vertical = Math.abs(down) > Math.abs(across);
        if (vertical) axis = down > 0 ? "down" : "neither";
        else axis = onSwipe && axis !== "vertical-only" ? "across" : "neither";
        if (axis === "neither") return;
      }

      if (axis === "across") {
        if (event.cancelable) event.preventDefault();
        sideways = across;
        setSlid(across * 0.35);
        return;
      }

      if (down <= 0) {
        distance = 0;
        setPulled(0);
        return;
      }

      // Non-passive, so the page underneath doesn't scroll along with it.
      if (event.cancelable) event.preventDefault();
      // Resistance, so it feels attached rather than thrown.
      distance = down < DISMISS_AT ? down : DISMISS_AT + (down - DISMISS_AT) * 0.4;
      setPulled(distance);
    };

    const onEnd = () => {
      if (axis === "across" && Math.abs(sideways) > STEP_AT) {
        onSwipe?.(sideways < 0 ? 1 : -1);
      } else if (axis === "down") {
        const speed = distance / Math.max(Date.now() - startedAt, 1);
        if (distance > DISMISS_AT || speed > FLICK_SPEED) {
          setPulled(0);
          setSlid(0);
          onClose();
          return;
        }
      }

      axis = "neither";
      distance = 0;
      sideways = 0;
      setPulled(0);
      setSlid(0);
    };

    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchmove", onMove, { passive: false });
    element.addEventListener("touchend", onEnd);
    element.addEventListener("touchcancel", onEnd);

    return () => {
      element.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchmove", onMove);
      element.removeEventListener("touchend", onEnd);
      element.removeEventListener("touchcancel", onEnd);
    };
  }, [open, onClose, onSwipe]);

  // A sheet that opens is never mid-drag, however the last one was let go of.
  // Adjusted as the change is noticed rather than in an effect, so it can't
  // paint one frame of a sheet still holding the previous pull.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (pulled !== 0) setPulled(0);
    if (slid !== 0) setSlid(0);
  }

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
        style={pulled > 0 ? { opacity: Math.max(1 - pulled / 320, 0.4) } : undefined}
      />

      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "sheet-up relative flex flex-col",
          pulled === 0 && slid === 0 && "transition-transform duration-200",
          className,
        )}
        style={
          pulled > 0 || slid !== 0
            ? { transform: `translate(${slid}px, ${pulled}px)` }
            : undefined
        }
      >
        {/* The handle says "this pulls", to a thumb that has met one before. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-2 z-40 mx-auto h-1 w-10 rounded-full bg-ink/15 sm:hidden"
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}

/**
 * True when nothing between the touch and the sheet is scrolled down.
 *
 * A pull that starts halfway down a bag full of items is that list scrolling
 * back to the top, and only once it is at the top does the same gesture become
 * "put this away".
 */
function scrollsSideways(
  target: EventTarget | null,
  sheet: HTMLElement,
): boolean {
  let node = target instanceof Element ? target : null;

  while (node && node !== sheet.parentElement) {
    if (node.scrollWidth > node.clientWidth + 1) return true;
    node = node.parentElement;
  }

  return false;
}

function atTop(target: EventTarget | null, sheet: HTMLElement): boolean {
  let node = target instanceof Element ? target : null;

  while (node && node !== sheet.parentElement) {
    if (node.scrollHeight > node.clientHeight + 1 && node.scrollTop > 0) {
      return false;
    }
    node = node.parentElement;
  }

  return true;
}
