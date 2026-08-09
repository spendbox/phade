"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, RotateCcw, Trash2, X } from "lucide-react";

import {
  saveCatalogue,
  type CatalogueFormState,
} from "@/app/admin/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/stat-tile";
import { cn } from "@/lib/cn";
import {
  DEFAULT_CATALOGUE,
  MAX_SIZE,
  MIN_SIZE,
  type CatalogueDefaults,
  type SizeRun,
} from "@/lib/catalogue";
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
  const [runs, setRuns] = useState<SizeRun[]>(defaults.runs);

  const [draftName, setDraftName] = useState("");
  const [draftHex, setDraftHex] = useState("#a63655");
  /** One in-progress size per run, keyed by run. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  /** Whether the reset button is waiting to be pressed a second time. */
  const [confirming, setConfirming] = useState(false);

  function updateRun(id: string, patch: Partial<SizeRun>) {
    setRuns((current) =>
      current.map((run) => (run.id === id ? { ...run, ...patch } : run)),
    );
  }

  function addColor() {
    const name = draftName.trim();
    if (!name) return;
    if (colors.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      return;
    }
    setColors([...colors, { name, hex: draftHex }]);
    setDraftName("");
  }

  function addSize(runId: string) {
    const size = Number.parseInt(drafts[runId] ?? "", 10);
    if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) return;

    const run = runs.find((item) => item.id === runId);
    if (!run || run.sizes.includes(size)) return;

    updateRun(runId, { sizes: [...run.sizes, size].sort((a, b) => a - b) });
    setDrafts({ ...drafts, [runId]: "" });
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="colors" value={JSON.stringify(colors)} />
      <input type="hidden" name="runs" value={JSON.stringify(runs)} />

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

      <Panel
        title="Size runs"
        action={
          <div className="flex items-center gap-3">
            {/* Asks once. Restoring the shipped runs throws away whatever is
                in the panel, which is not something to do on a mis-tap. */}
            <button
              type="button"
              onClick={() => {
                if (!confirming) {
                  setConfirming(true);
                  return;
                }
                setRuns(DEFAULT_CATALOGUE.runs.map((run) => ({ ...run })));
                setConfirming(false);
              }}
              onBlur={() => setConfirming(false)}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                confirming
                  ? "text-critical"
                  : "text-ink-secondary hover:text-ink",
              )}
            >
              <RotateCcw className="size-3.5" />
              {confirming ? "Replace what's here?" : "Reset to defaults"}
            </button>

            <button
              type="button"
              onClick={() =>
                setRuns([
                  ...runs,
                  { id: `run_${Date.now()}`, name: "", sizes: [] },
                ])
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark"
            >
              <Plus className="size-3.5" />
              Add a run
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Add multiple size runs for various types of products.
          </p>

          {runs.length === 0 && (
            <p className="rounded-lg bg-plane px-3 py-5 text-center text-sm text-ink-muted">
              No runs yet. Add one — Clothing, Shoes, whatever you sell.
            </p>
          )}

          <ul className="space-y-3">
            {runs.map((run) => (
              <li key={run.id} className="rounded-xl bg-plane p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <Field label="Run name" htmlFor={`run-${run.id}`}>
                    <Input
                      id={`run-${run.id}`}
                      value={run.name}
                      onChange={(event) =>
                        updateRun(run.id, { name: event.target.value })
                      }
                      placeholder="Shoes"
                    />
                  </Field>

                  <button
                    type="button"
                    onClick={() =>
                      setRuns(runs.filter((item) => item.id !== run.id))
                    }
                    aria-label={`Remove ${run.name || "run"}`}
                    className="mt-6 flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-critical-soft hover:text-critical"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {run.sizes.map((size) => (
                    <span
                      key={size}
                      className="inline-flex h-9 items-center gap-1 rounded-lg bg-surface pl-3 pr-1 text-sm font-medium tabular-nums text-ink"
                    >
                      {size}
                      <button
                        type="button"
                        aria-label={`Remove size ${size}`}
                        onClick={() =>
                          updateRun(run.id, {
                            sizes: run.sizes.filter((item) => item !== size),
                          })
                        }
                        className="flex size-6 items-center justify-center rounded-md text-ink-muted transition hover:bg-plane hover:text-critical"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  {run.sizes.length === 0 && (
                    <p className="text-sm text-ink-muted">
                      No sizes in this run yet.
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={MIN_SIZE}
                    max={MAX_SIZE}
                    step={1}
                    value={drafts[run.id] ?? ""}
                    onChange={(event) =>
                      setDrafts({ ...drafts, [run.id]: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      addSize(run.id);
                    }}
                    placeholder={`${MIN_SIZE}–${MAX_SIZE}`}
                    aria-label={`Add a size to ${run.name || "this run"}`}
                    className={cn(
                      "h-10 w-28 rounded-lg bg-surface px-3 text-sm tabular-nums text-ink",
                      "shadow-[0_0_0_1px_rgb(11_11_12_/_0.10)] placeholder:text-ink-muted",
                      "focus:shadow-[0_0_0_2px_var(--color-brand)] focus:outline-none",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => addSize(run.id)}
                    disabled={!(drafts[run.id] ?? "").trim()}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-surface px-3 text-sm font-medium text-ink ring-1 ring-inset ring-line-strong transition hover:bg-plane disabled:opacity-50"
                  >
                    <Plus className="size-4" />
                    Add
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
