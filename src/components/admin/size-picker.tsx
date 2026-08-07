"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { PRODUCT_SIZES } from "@/lib/types";

/**
 * Which sizes a product comes in. Optional — plenty of the catalogue (bags,
 * most accessories) has no size at all, so an empty selection is a valid answer
 * rather than a missing one.
 *
 * The run is fixed at 6–18, so this is a row of toggles instead of a free text
 * field: nothing to mistype, and the order is always the same.
 */
export function SizePicker({
  name = "sizes",
  initial = [],
  onChange,
}: {
  name?: string;
  initial?: number[];
  onChange?: (sizes: number[]) => void;
}) {
  const [sizes, setSizes] = useState<number[]>(initial);

  function toggle(size: number) {
    const next = sizes.includes(size)
      ? sizes.filter((item) => item !== size)
      : PRODUCT_SIZES.filter((item) => item === size || sizes.includes(item));
    setSizes(next);
    onChange?.(next);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(sizes)} />

      <div className="flex flex-wrap gap-1.5">
        {PRODUCT_SIZES.map((size) => {
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

      {sizes.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setSizes([]);
            onChange?.([]);
          }}
          className="text-xs font-medium text-ink-secondary hover:text-ink"
        >
          Clear sizes
        </button>
      )}
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
