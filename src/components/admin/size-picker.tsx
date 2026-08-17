"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { DEFAULT_CATALOGUE, type SizeRun } from "@/lib/catalogue";

/** What a shop that has never opened Settings is offered. */
const FALLBACK_RUNS: readonly SizeRun[] = DEFAULT_CATALOGUE.runs;

/**
 * Which sizes a product comes in. Optional — plenty of the catalogue (bags,
 * most accessories) has no size at all, so an empty selection is a valid answer
 * rather than a missing one.
 *
 * The runs come from Settings, so this is a row of toggles instead of a free
 * text field: nothing to mistype, and the order is always the same. A shop
 * with more than one run picks which it is working in first — a 38 is a shoe
 * and a 12 is a dress, and putting both on one row is how the wrong one gets
 * ticked.
 */
export function SizePicker({
  name = "sizes",
  initial = [],
  runs = FALLBACK_RUNS,
  onChange,
}: {
  name?: string;
  initial?: number[];
  /** The shop's size runs, set in Settings. */
  runs?: readonly SizeRun[];
  onChange?: (sizes: number[]) => void;
}) {
  const [sizes, setSizes] = useState<number[]>(initial);

  // Open on the run this product's sizes came from, so editing a shoe doesn't
  // start on the dress row.
  const [runId, setRunId] = useState(
    () =>
      (
        runs.find((run) => run.sizes.some((size) => initial.includes(size))) ??
        runs[0]
      )?.id ?? "",
  );

  const run = runs.find((item) => item.id === runId) ?? runs[0];
  const options = run?.sizes ?? [];
  const allOn = options.length > 0 && options.every((size) => sizes.includes(size));

  function commit(next: number[]) {
    const sorted = [...new Set(next)].sort((a, b) => a - b);
    setSizes(sorted);
    onChange?.(sorted);
  }

  function toggle(size: number) {
    commit(
      sizes.includes(size)
        ? sizes.filter((item) => item !== size)
        : [...sizes, size],
    );
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(sizes)} />

      {runs.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {runs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRunId(item.id)}
              aria-pressed={item.id === run?.id}
              className={cn(
                "h-8 rounded-lg px-3 text-xs font-medium transition-colors",
                item.id === run?.id
                  ? "bg-ink text-white"
                  : "bg-plane text-ink-secondary hover:text-ink",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {options.map((size) => {
          const on = sizes.includes(size);
          return (
            <button
              key={size}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(size)}
              className={cn(
                "h-9 min-w-11 rounded-lg px-3 text-sm font-medium tabular-nums transition-colors",
                on
                  ? "bg-brand text-white"
                  : "bg-surface text-ink-secondary ring-1 ring-inset ring-line-strong hover:bg-plane hover:text-ink",
              )}
            >
              {size}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {options.length > 0 && (
          <button
            type="button"
            onClick={() =>
              commit(
                allOn
                  ? sizes.filter((size) => !options.includes(size))
                  : [...sizes, ...options],
              )
            }
            className="text-xs font-medium text-brand hover:text-brand-dark"
          >
            {allOn
              ? `Clear ${run?.name.toLowerCase() ?? "these"}`
              : `Select every ${run?.name.toLowerCase() ?? "size"} size`}
          </button>
        )}

        {sizes.length > 0 && (
          <button
            type="button"
            onClick={() => commit([])}
            className="text-xs font-medium text-ink-secondary hover:text-ink"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

/** Read-only size run, for tables and cards. */
export function SizeList({ sizes }: { sizes: number[] }) {
  if (!sizes || sizes.length === 0) return null;
  return (
    <span className="text-xs tabular-nums text-ink-muted">
      {sizes.join(" · ")}
    </span>
  );
}
