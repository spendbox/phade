"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

import { updateCell } from "@/app/admin/(dashboard)/database/actions";
import { panelClass, panelStyle, usePopover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

const PANEL_WIDTH = 224;

/**
 * Saving a single cell.
 *
 * Every cell talks to the same server action with `{ id, field, value }`, so
 * there is one write path for the whole sheet and a cell can never save a
 * column the admin didn't touch. Status lives per-cell: a tick that fades, or
 * the error in place, so a failed save is obvious without a page-level banner.
 */

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useCellSave(id: string, field: string) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function save(value: string) {
    setState("saving");
    setError(null);

    const formData = new FormData();
    formData.set("id", id);
    formData.set("field", field);
    formData.set("value", value);

    const result = await updateCell({ ok: null }, formData);

    if (result.ok === true) {
      setState("saved");
      // Pull the row again so anything derived from it — the stock indicator,
      // stock value, revenue — moves with the number that changed.
      router.refresh();
      // The tick is a receipt, not a state — let it fade.
      setTimeout(() => setState("idle"), 1200);
      return true;
    }

    setState("error");
    setError(result.ok === false ? result.error : "That didn't save.");
    return false;
  }

  return { state, error, save };
}

export function CellStatus({
  state,
  error,
}: {
  state: SaveState;
  error: string | null;
}) {
  if (state === "saving") {
    return <Loader2 className="size-3 shrink-0 animate-spin text-ink-muted" />;
  }
  if (state === "saved") {
    return <Check className="size-3 shrink-0 text-good-text" />;
  }
  if (state === "error") {
    return (
      <span title={error ?? undefined}>
        <X className="size-3 shrink-0 text-critical" />
      </span>
    );
  }
  return null;
}

/**
 * A text or number cell. Commits on blur and on Enter, reverts on Escape —
 * the behaviour a spreadsheet has taught everyone to expect.
 */
export function TextCell({
  id,
  field,
  value,
  align = "left",
  placeholder,
  prefix,
  type = "text",
  className,
}: {
  id: string;
  field: string;
  value: string;
  align?: "left" | "right";
  placeholder?: string;
  /** Sits outside the input — a ₦ that money reads as money, not as data. */
  prefix?: string;
  type?: "text" | "number";
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [committed, setCommitted] = useState(value);
  const { state, error, save } = useCellSave(id, field);

  // The row may refresh underneath while this cell sits untouched; take the
  // new server value unless the admin has typed something of their own.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (draft === committed) {
      setDraft(value);
      setCommitted(value);
    }
  }

  async function commit() {
    if (draft === committed) return;
    const ok = await save(draft);
    if (ok) setCommitted(draft);
    else setDraft(committed);
  }

  return (
    // A prefixed cell keeps the symbol beside its number: the input stops
    // stretching so "₦" and "12000" read as one figure rather than sitting at
    // opposite ends of the column.
    <span
      className={cn(
        "flex items-center gap-0.5",
        prefix && align === "right" && "justify-end",
      )}
    >
      {prefix && (
        <span className="shrink-0 text-[13px] text-ink-muted">{prefix}</span>
      )}
      <input
        value={draft}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(committed);
            event.currentTarget.blur();
          }
        }}
        className={cn(
          "min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-ink outline-none",
          "hover:border-line-strong focus:border-brand focus:bg-surface",
          prefix ? "w-[6.5rem] max-w-full" : "w-full",
          align === "right" && "text-right tabular-nums",
          state === "error" && "border-critical",
          className,
        )}
      />
      <CellStatus state={state} error={error} />
    </span>
  );
}

/**
 * A cell backed by a fixed set of options.
 *
 * A native <select> would open the OS picker — an inch-high wheel on a phone,
 * a grey system list on desktop — so this renders the same portalled panel the
 * filters use, and can be searched when the list is long.
 */
export function SelectCell({
  id,
  field,
  value,
  options,
  placeholder = "—",
  searchable,
  className,
}: {
  id: string;
  field: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  /** Defaults to on once the list is long enough to scroll. */
  searchable?: boolean;
  className?: string;
}) {
  const [current, setCurrent] = useState(value);
  const [search, setSearch] = useState("");
  const { state, error, save } = useCellSave(id, field);
  const { open, setOpen, toggle, position, triggerRef, panelRef } =
    usePopover<HTMLButtonElement>(PANEL_WIDTH);

  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setCurrent(value);
  }

  const withSearch = searchable ?? options.length > 8;
  const visible =
    withSearch && search
      ? options.filter((option) =>
          option.label.toLowerCase().includes(search.toLowerCase()),
        )
      : options;

  const selected = options.find((option) => option.value === current);

  function choose(next: string) {
    const previous = current;
    setCurrent(next);
    setOpen(false);
    setSearch("");
    void save(next).then((ok) => {
      if (!ok) setCurrent(previous);
    });
  }

  return (
    <span className="flex items-center gap-1">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full min-w-0 items-center gap-1 rounded border border-transparent px-1.5 py-1 text-left text-[13px] outline-none transition-colors",
          "hover:border-line-strong hover:bg-surface",
          open && "border-brand bg-surface",
          state === "error" && "border-critical",
          selected ? "text-ink" : "text-ink-muted",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 text-ink-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <CellStatus state={state} error={error} />

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

            {visible.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-xs text-ink-muted">
                No matches.
              </p>
            ) : (
              visible.map((option) => {
                const active = option.value === current;
                return (
                  <button
                    key={option.value || "__blank"}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => choose(option.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                      active
                        ? "bg-brand-soft font-medium text-brand"
                        : "text-ink-secondary hover:bg-plane hover:text-ink",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {active && <Check className="size-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}
