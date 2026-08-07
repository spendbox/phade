"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/cn";

const MENU_WIDTH = 176;
const MENU_MAX_HEIGHT = 200;

/**
 * Overflow menu for a table row. Children are the menu items.
 *
 * The panel renders in a portal on `document.body` rather than inside the row,
 * so a card with `overflow-hidden` (every table on this dashboard) can't clip
 * it. Position is measured from the trigger and re-measured on scroll.
 */
export function RowMenu({
  children,
  label = "More actions",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  // Once opened, the panel stays mounted — see the note on rendering below.
  const [everOpened, setEverOpened] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function place() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    // Right-align to the trigger, then flip above it when the viewport bottom
    // is closer than the menu is tall.
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow < MENU_MAX_HEIGHT ? rect.top - MENU_MAX_HEIGHT - 4 : rect.bottom + 4;

    setPosition({
      top: Math.max(8, top),
      left: Math.min(
        Math.max(8, rect.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - 8,
      ),
    });
  }

  function toggle() {
    if (!open) {
      place();
      setEverOpened(true);
    }
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
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        className={cn(
          "flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-plane hover:text-ink",
          open && "bg-plane text-ink",
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>

      {/*
        Closing hides the panel; it never unmounts it. Menu items are not inert
        markup — they are forms whose server action is dispatched by the click's
        default action, and triggers for dialogs that must outlive the menu.
        Tearing the subtree down on click killed both: the form never submitted
        (Delete and Duplicate), and the dialog vanished the instant it opened
        (Edit sale). `display: none` takes the panel out of the layout and out
        of the tab order while leaving React's tree — and any portal hanging off
        it — intact.
      */}
      {everOpened &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-hidden={!open}
            onClick={() => setOpen(false)}
            style={{
              display: open ? undefined : "none",
              top: position.top,
              left: position.left,
              width: MENU_WIDTH,
            }}
            className="fixed z-[60] overflow-hidden rounded-xl bg-surface p-1 shadow-[0_0_0_1px_rgb(11_11_12_/_0.08),0_8px_24px_rgb(11_11_12_/_0.14)]"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Submit button that asks before running a destructive server action. */
export function ConfirmSubmit({
  message,
  children,
  className,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-critical transition-colors hover:bg-critical-soft",
        className,
      )}
    >
      {children}
    </button>
  );
}

export const menuItemClass =
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-ink-secondary transition-colors hover:bg-plane hover:text-ink";
