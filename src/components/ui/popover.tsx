"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Positioning and dismissal for a portalled popover panel.
 *
 * Shared so every popover on the dashboard behaves the same way: anchored to
 * whichever side of the trigger has room, dismissed on Escape or an outside
 * click, and re-measured when the page scrolls under it. A trigger in a bar
 * pinned to the bottom of the window has almost nothing beneath it, so those
 * panels flip upwards rather than running off-screen.
 */

export type PanelPosition = {
  left: number;
  top?: number;
  bottom?: number;
  maxHeight?: number;
};

const PANEL_GAP = 6;
const VIEWPORT_MARGIN = 8;
/** Below this, dropping down would leave a panel too short to be useful. */
const MIN_ROOM = 180;

export function usePopover<T extends HTMLElement>(width: number) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition>({ left: 0, top: 0 });
  const triggerRef = useRef<T>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function place() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN),
    );
    const below = window.innerHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN;
    const above = rect.top - PANEL_GAP - VIEWPORT_MARGIN;

    if (below < MIN_ROOM && above > below) {
      setPosition({
        left,
        bottom: window.innerHeight - rect.top + PANEL_GAP,
        maxHeight: above,
      });
      return;
    }

    setPosition({ left, top: rect.bottom + PANEL_GAP, maxHeight: below });
  }

  function toggle() {
    if (!open) place();
    setOpen((value) => !value);
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function reposition() {
      place();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
    // `place` is stable for the life of the component — it only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { open, setOpen, toggle, position, triggerRef, panelRef };
}

/** Inline style for a panel placed by `usePopover`. */
export function panelStyle(
  position: PanelPosition,
  width: number,
  cap = 288,
): React.CSSProperties {
  return {
    top: position.top,
    bottom: position.bottom,
    left: position.left,
    width,
    maxHeight: Math.min(position.maxHeight ?? cap, cap),
  };
}

export const panelClass =
  "fixed z-[60] overflow-y-auto rounded-xl bg-surface p-1 shadow-[0_0_0_1px_rgb(11_11_12_/_0.08),0_8px_24px_rgb(11_11_12_/_0.14)]";
