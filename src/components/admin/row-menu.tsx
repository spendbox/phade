"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/cn";

/** Overflow menu for a table row. Children are the menu items. */
export function RowMenu({
  children,
  label = "More actions",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={label}
        aria-expanded={open}
        className={cn(
          "flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-plane hover:text-ink",
          open && "bg-plane text-ink",
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl bg-surface p-1 shadow-[0_0_0_1px_rgb(11_11_12_/_0.08),0_8px_24px_rgb(11_11_12_/_0.12)]"
        >
          {children}
        </div>
      )}
    </div>
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
