"use client";

import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";
import { panelClass, panelStyle, usePopover } from "@/components/ui/popover";

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
  const { open, setOpen, toggle, position, triggerRef, panelRef } =
    usePopover<HTMLButtonElement>(PANEL_WIDTH);

  const selected = options.find((option) => option.value === value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
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
            style={panelStyle(position, PANEL_WIDTH)}
            className={panelClass}
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
