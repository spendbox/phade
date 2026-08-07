"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import {
  saveCatalogue,
  type CatalogueFormState,
} from "@/app/admin/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/stat-tile";
import { cn } from "@/lib/cn";
import type { CatalogueDefaults } from "@/lib/catalogue-settings";
import type { ProductColor } from "@/lib/types";

const initialState: CatalogueFormState = { ok: null };

/**
 * The shop's own palette and size run.
 *
 * These are what the pickers offer everywhere else, and what a spreadsheet
 * import matches typed colour names against — so "wine" lands on the same
 * burgundy every time rather than a fresh guess per upload.
 */
export function CatalogueForm({ defaults }: { defaults: CatalogueDefaults }) {
  const [state, formAction, pending] = useActionState(
    saveCatalogue,
    initialState,
  );

  const [colors, setColors] = useState<ProductColor[]>(defaults.colors);
  const [sizes, setSizes] = useState<number[]>(defaults.sizes);

  const [draftName, setDraftName] = useState("");
  const [draftHex, setDraftHex] = useState("#a63655");
  const [draftSize, setDraftSize] = useState("");

  function addColor() {
    const name = draftName.trim();
    if (!name) return;
    if (colors.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      return;
    }
    setColors([...colors, { name, hex: draftHex }]);
    setDraftName("");
  }

  function addSize() {
    const size = Number.parseInt(draftSize, 10);
    if (!Number.isInteger(size) || size < 2 || size > 30) return;
    if (sizes.includes(size)) return;
    setSizes([...sizes, size].sort((a, b) => a - b));
    setDraftSize("");
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="colors" value={JSON.stringify(colors)} />
      <input type="hidden" name="sizes" value={JSON.stringify(sizes)} />

      <Panel title="Colours">
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            The palette offered when you set a product&apos;s colourways, and
            the list a spreadsheet import matches typed names against.
          </p>

          {colors.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {colors.map((color, index) => (
                <li
                  key={color.name}
                  className="inline-flex items-center gap-1.5 rounded-full bg-plane py-1 pl-1.5 pr-1 text-[13px] text-ink"
                >
                  <label
                    className="relative size-4 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-inset ring-ink/10"
                    title={`Change ${color.name}`}
                  >
                    <span
                      className="block size-full"
                      style={{ backgroundColor: color.hex }}
                    />
                    <input
                      type="color"
                      value={color.hex}
                      aria-label={`${color.name} swatch`}
                      onChange={(event) => {
                        const next = [...colors];
                        next[index] = { ...color, hex: event.target.value };
                        setColors(next);
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                  {color.name}
                  <button
                    type="button"
                    aria-label={`Remove ${color.name}`}
                    onClick={() =>
                      setColors(colors.filter((item) => item.name !== color.name))
                    }
                    className="flex size-5 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface hover:text-critical"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-inset ring-line-strong">
              <span
                className="block size-full"
                style={{ backgroundColor: draftHex }}
              />
              <input
                type="color"
                value={draftHex}
                aria-label="New colour swatch"
                onChange={(event) => setDraftHex(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>

            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                addColor();
              }}
              placeholder="Colour name"
              className="h-10 min-w-0 flex-1 rounded-lg bg-surface px-3 text-sm text-ink shadow-[0_0_0_1px_rgb(11_11_12_/_0.10)] placeholder:text-ink-muted focus:shadow-[0_0_0_2px_var(--color-brand)] focus:outline-none"
            />

            <button
              type="button"
              onClick={addColor}
              disabled={!draftName.trim()}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-surface px-3 text-sm font-medium text-ink ring-1 ring-inset ring-line-strong transition hover:bg-plane disabled:opacity-50"
            >
              <Plus className="size-4" />
              Add
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Sizes">
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            The size run offered on every product. Sizes stay optional — bags
            and most accessories simply have none.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {sizes.map((size) => (
              <span
                key={size}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-plane pl-3 pr-1 text-sm font-medium tabular-nums text-ink"
              >
                {size}
                <button
                  type="button"
                  aria-label={`Remove size ${size}`}
                  onClick={() => setSizes(sizes.filter((item) => item !== size))}
                  className="flex size-6 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface hover:text-critical"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {sizes.length === 0 && (
              <p className="text-sm text-ink-muted">
                No sizes yet — add one below.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={2}
              max={30}
              step={1}
              value={draftSize}
              onChange={(event) => setDraftSize(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                addSize();
              }}
              placeholder="Size"
              className={cn(
                "h-10 w-28 rounded-lg bg-surface px-3 text-sm tabular-nums text-ink",
                "shadow-[0_0_0_1px_rgb(11_11_12_/_0.10)] placeholder:text-ink-muted",
                "focus:shadow-[0_0_0_2px_var(--color-brand)] focus:outline-none",
              )}
            />
            <button
              type="button"
              onClick={addSize}
              disabled={!draftSize.trim()}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-surface px-3 text-sm font-medium text-ink ring-1 ring-inset ring-line-strong transition hover:bg-plane disabled:opacity-50"
            >
              <Plus className="size-4" />
              Add
            </button>
          </div>
        </div>
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs" role="status">
          {state.ok === true && (
            <span className="text-good-text">{state.message}</span>
          )}
          {state.ok === false && (
            <span className="text-critical">{state.error}</span>
          )}
        </p>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save catalogue
        </Button>
      </div>
    </form>
  );
}
