"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

export type DropdownOption = { value: string; label: string };

const PANEL_WIDTH = 224;

/**
 * Select-style dropdown built from a button and a portalled panel.
 *
 * A native <select> styled to look like a pill is where the old filter control
 * went wrong: the popup was the OS one, it ignored the surrounding design, and
 * on touch it opened a full-screen wheel. This renders its own panel, so the
 * options look like the rest of the dashboard and the current choice is marked.
 */
export function Dropdown({
  label,
  value,
  options,
  onChange,
  allLabel,
  className,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Text for the clear-selection row. Defaults to "All <label>". */
  allLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function place() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8),
    });
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

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) place();
          setOpen((current) => !current);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-3 pr-2.5 text-[13px] font-medium transition-colors",
          selected
            ? "bg-ink text-white"
            : "bg-surface text-ink-secondary shadow-[0_0_0_1px_rgb(11_11_12_/_0.08)] hover:text-ink",
          className,
        )}
      >
        {selected?.label ?? label}
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            selected ? "opacity-70" : "text-ink-muted",
            open && "rotate-180",
          )}
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label={label}
            style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
            className="fixed z-[60] max-h-72 overflow-y-auto rounded-xl bg-surface p-1 shadow-[0_0_0_1px_rgb(11_11_12_/_0.08),0_8px_24px_rgb(11_11_12_/_0.14)]"
          >
            <Row
              label={allLabel ?? `All ${plural(label.toLowerCase())}`}
              selected={!value}
              onSelect={() => {
                onChange("");
                setOpen(false);
              }}
            />

            <div className="my-1 h-px bg-line" />

            {options.map((option) => (
              <Row
                key={option.value}
                label={option.label}
                selected={option.value === value}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              />
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

/** "category" -> "categories", "status" -> "statuses", "type" -> "types". */
function plural(word: string): string {
  if (word.endsWith("y")) return `${word.slice(0, -1)}ies`;
  if (word.endsWith("s")) return `${word}es`;
  return `${word}s`;
}

function Row({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
        selected
          ? "bg-brand-soft font-medium text-brand"
          : "text-ink-secondary hover:bg-plane hover:text-ink",
      )}
    >
      <span className="truncate">{label}</span>
      {selected && <Check className="size-3.5 shrink-0" />}
    </button>
  );
}
