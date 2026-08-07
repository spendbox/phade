"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { cn } from "@/lib/cn";
import type { ProductColor } from "@/lib/types";

/**
 * Optional colourways for a product.
 *
 * Each entry is a name plus a swatch, because "Emerald" and "Bottle" are both
 * green and only the shopper's eye can tell them apart. The list rides in a
 * hidden input as JSON, so the surrounding server-action form picks it up.
 */

const SUGGESTIONS: ProductColor[] = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#f5f5f3" },
  { name: "Cream", hex: "#efe4d2" },
  { name: "Nude", hex: "#d8ac91" },
  { name: "Chocolate", hex: "#5b3a29" },
  { name: "Emerald", hex: "#0f6b4f" },
  { name: "Olive", hex: "#6b6b3a" },
  { name: "Burgundy", hex: "#6d1f34" },
  { name: "Rose", hex: "#c98a9b" },
  { name: "Coral", hex: "#e2725b" },
  { name: "Mustard", hex: "#d4a017" },
  { name: "Navy", hex: "#1d2b4c" },
  { name: "Sky", hex: "#8fb8de" },
  { name: "Lilac", hex: "#b39ddb" },
  { name: "Silver", hex: "#c0c0c0" },
  { name: "Gold", hex: "#c9a227" },
];

export function ColorPicker({
  name = "colors",
  initial = [],
}: {
  name?: string;
  initial?: ProductColor[];
}) {
  const [colors, setColors] = useState<ProductColor[]>(initial);
  const [draftName, setDraftName] = useState("");
  const [draftHex, setDraftHex] = useState("#a63655");

  function add(color: ProductColor) {
    const clean = color.name.trim();
    if (!clean) return;
    if (colors.some((item) => item.name.toLowerCase() === clean.toLowerCase())) {
      return;
    }
    setColors((current) => [...current, { name: clean, hex: color.hex }]);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(colors)} />

      {colors.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {colors.map((color) => (
            <li
              key={color.name}
              className="inline-flex items-center gap-1.5 rounded-full bg-plane py-1 pl-1.5 pr-1 text-[13px] text-ink"
            >
              <span
                aria-hidden
                className="size-4 shrink-0 rounded-full ring-1 ring-inset ring-ink/10"
                style={{ backgroundColor: color.hex }}
              />
              {color.name}
              <button
                type="button"
                aria-label={`Remove ${color.name}`}
                onClick={() =>
                  setColors((current) =>
                    current.filter((item) => item.name !== color.name),
                  )
                }
                className="flex size-5 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface hover:text-critical"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Custom colour */}
      <div className="flex items-center gap-2">
        <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-inset ring-line-strong">
          <span
            className="block size-full"
            style={{ backgroundColor: draftHex }}
          />
          <input
            type="color"
            value={draftHex}
            aria-label="Colour swatch"
            onChange={(event) => setDraftHex(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        <input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            // Enter adds the colour; it must not submit the whole product form.
            event.preventDefault();
            add({ name: draftName, hex: draftHex });
            setDraftName("");
          }}
          placeholder="Colour name"
          className="h-10 min-w-0 flex-1 rounded-lg bg-surface px-3 text-sm text-ink shadow-[0_0_0_1px_rgb(11_11_12_/_0.10)] placeholder:text-ink-muted focus:shadow-[0_0_0_2px_var(--color-brand)] focus:outline-none"
        />

        <button
          type="button"
          onClick={() => {
            add({ name: draftName, hex: draftHex });
            setDraftName("");
          }}
          disabled={!draftName.trim()}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-surface px-3 text-sm font-medium text-ink ring-1 ring-inset ring-line-strong transition hover:bg-plane disabled:opacity-50"
        >
          <Plus className="size-4" />
          Add
        </button>
      </div>

      {/* Quick picks */}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.filter(
          (suggestion) =>
            !colors.some(
              (color) => color.name.toLowerCase() === suggestion.name.toLowerCase(),
            ),
        ).map((suggestion) => (
          <button
            key={suggestion.name}
            type="button"
            onClick={() => add(suggestion)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-ink-secondary transition-colors",
              "ring-1 ring-inset ring-line hover:bg-plane hover:text-ink",
            )}
          >
            <span
              aria-hidden
              className="size-3 rounded-full ring-1 ring-inset ring-ink/10"
              style={{ backgroundColor: suggestion.hex }}
            />
            {suggestion.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Read-only swatch row, for tables and cards. */
export function ColorDots({
  colors,
  limit = 5,
}: {
  colors: ProductColor[];
  limit?: number;
}) {
  if (!colors || colors.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1">
      {colors.slice(0, limit).map((color) => (
        <span
          key={color.name}
          title={color.name}
          className="size-3 rounded-full ring-1 ring-inset ring-ink/10"
          style={{ backgroundColor: color.hex }}
        />
      ))}
      {colors.length > limit && (
        <span className="text-xs text-ink-muted">+{colors.length - limit}</span>
      )}
    </span>
  );
}
