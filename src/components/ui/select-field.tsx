"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

import { panelClass, panelStyle, usePopover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

/**
 * A form select that looks like the rest of the dashboard.
 *
 * Same panel as the filter dropdowns and the sheet cells, so a choice is made
 * the same way everywhere. Works controlled (`value` + `onChange`) or as a
 * plain form field, in which case the choice rides in a hidden input under
 * `name` for the surrounding server action to pick up.
 */
export function SelectField({
  name,
  options,
  defaultValue = "",
  value,
  onChange,
  placeholder = "None",
  emptyLabel = "None",
  searchable,
  id,
  className,
}: {
  name?: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** Label for the clear-the-choice row. Pass null to make a choice required. */
  emptyLabel?: string | null;
  searchable?: boolean;
  id?: string;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const [search, setSearch] = useState("");
  const current = value ?? internal;

  const { open, setOpen, toggle, position, triggerRef, panelRef } =
    usePopover<HTMLButtonElement>(PANEL_WIDTH);

  const withSearch = searchable ?? options.length > 8;
  const visible =
    withSearch && search
      ? options.filter((option) =>
          option.label.toLowerCase().includes(search.toLowerCase()),
        )
      : options;

  // A value the list doesn't know — a term typed before it was managed —
  // still shows, rather than the field silently reading as empty.
  const selected =
    options.find((option) => option.value === current) ??
    (current ? { value: current, label: current } : null);

  function choose(next: string) {
    if (value === undefined) setInternal(next);
    onChange?.(next);
    setOpen(false);
    setSearch("");
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={current} />}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg bg-surface px-3 text-left text-sm transition",
          "shadow-[0_0_0_1px_rgb(11_11_12_/_0.10)]",
          open && "shadow-[0_0_0_2px_var(--color-brand)]",
          selected ? "text-ink" : "text-ink-muted",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-ink-muted transition-transform",
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
            style={panelStyle(position, PANEL_WIDTH)}
            className={panelClass}
          >
            {withSearch && (
              <div className="relative mb-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" />
                <input
                  type="search"
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search"
                  className="h-8 w-full rounded-md bg-plane pl-8 pr-2 text-[13px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            )}

            {emptyLabel !== null && (
              <Row
                label={emptyLabel}
                selected={!current}
                onSelect={() => choose("")}
              />
            )}

            {visible.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-xs text-ink-muted">
                No matches.
              </p>
            ) : (
              visible.map((option) => (
                <Row
                  key={option.value}
                  label={option.label}
                  selected={option.value === current}
                  onSelect={() => choose(option.value)}
                />
              ))
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

const PANEL_WIDTH = 240;

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
