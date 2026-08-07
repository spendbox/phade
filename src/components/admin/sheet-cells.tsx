"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { updateCell } from "@/app/admin/(dashboard)/database/actions";
import { cn } from "@/lib/cn";

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
  type = "text",
  className,
}: {
  id: string;
  field: string;
  value: string;
  align?: "left" | "right";
  placeholder?: string;
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
    <span className="flex items-center gap-1">
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
          "w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-ink outline-none",
          "hover:border-line-strong focus:border-brand focus:bg-surface",
          align === "right" && "text-right tabular-nums",
          state === "error" && "border-critical",
          className,
        )}
      />
      <CellStatus state={state} error={error} />
    </span>
  );
}

/** A cell backed by a fixed set of options. */
export function SelectCell({
  id,
  field,
  value,
  options,
  className,
}: {
  id: string;
  field: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [current, setCurrent] = useState(value);
  const { state, error, save } = useCellSave(id, field);

  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setCurrent(value);
  }

  return (
    <span className="flex items-center gap-1">
      <select
        value={current}
        onChange={(event) => {
          const next = event.target.value;
          const previous = current;
          setCurrent(next);
          void save(next).then((ok) => {
            if (!ok) setCurrent(previous);
          });
        }}
        className={cn(
          "w-full min-w-0 cursor-pointer rounded border border-transparent bg-transparent px-1 py-1 text-[13px] text-ink outline-none",
          "hover:border-line-strong focus:border-brand focus:bg-surface",
          state === "error" && "border-critical",
          className,
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CellStatus state={state} error={error} />
    </span>
  );
}
