"use client";

import { useActionState, useState } from "react";
import { Loader2, X } from "lucide-react";

import {
  adjustStock,
  type StockFormState,
} from "@/app/admin/(dashboard)/inventory/actions";
import { ColorPicker } from "@/components/admin/color-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { INVENTORY_REASONS, type ProductColor } from "@/lib/types";

const initialState: StockFormState = { ok: null };

type Mode = "adjust" | "set" | "colors";

const MODE_LABELS: Record<Mode, string> = {
  adjust: "Add / remove",
  set: "Set exact",
  colors: "By colour",
};

/**
 * Changing what is on the shelf.
 *
 * Three ways in, because they are three different situations. A delivery
 * arrived, so add twelve. A count was taken and the number is simply wrong, so
 * set it. Or the piece comes in four colours and two of them have run out —
 * which is not a number at all until you have written down each one.
 *
 * The colour tab is the honest version for a product that has colourways: edit
 * each count, and their sum becomes the stock. That overwrite is the point.
 * A total kept by hand beside per-colour counts is a total that drifts from
 * them, and a shopper is then offered a black one nobody has.
 */
export function StockDialog({
  productId,
  productName,
  currentStock,
  colors = [],
  palette = [],
}: {
  productId: string;
  productName: string;
  currentStock: number;
  /** The product's colourways, with whatever counts they carry. */
  colors?: ProductColor[];
  /** The shop's saved palette, for quick picks. */
  palette?: ProductColor[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(colors.length > 0 ? "colors" : "adjust");
  const [variants, setVariants] = useState<ProductColor[]>(colors);
  const [state, formAction, pending] = useActionState(
    adjustStock,
    initialState,
  );

  // Close on success by adjusting state during render rather than in an effect;
  // the action's revalidatePath refreshes the table underneath.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.ok) setOpen(false);
  }

  const counted = variants.reduce((sum, color) => sum + (color.stock ?? 0), 0);
  const byColour = mode === "colors";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center rounded-lg bg-surface px-3 text-[13px] font-medium text-ink ring-1 ring-inset ring-line-strong transition-colors hover:bg-plane"
      >
        Adjust
      </button>

      <Modal open={open} onClose={() => setOpen(false)} size={byColour ? "md" : "sm"}>
        <>
          <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-ink">
                {productName}
              </h2>
              <p className="text-xs text-ink-muted">
                {currentStock} in stock now
                {colors.length > 0 &&
                  ` · ${colors.length} colour${colors.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-plane hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </header>

          <form action={formAction} className="space-y-4 p-5">
            <input type="hidden" name="product_id" value={productId} />
            <input type="hidden" name="mode" value={mode} />

            <div className="grid grid-cols-3 gap-1 rounded-lg bg-plane p-1">
              {(["adjust", "set", "colors"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={cn(
                    "rounded-md py-1.5 text-[13px] font-medium transition-colors",
                    mode === value
                      ? "bg-surface text-ink shadow-sm"
                      : "text-ink-secondary hover:text-ink",
                  )}
                >
                  {MODE_LABELS[value]}
                </button>
              ))}
            </div>

            {byColour ? (
              <Field
                label="Colourways"
                hint="Each colour carries its own count. Saving replaces the product's stock with their total, and a colour on zero stops being something a shopper can choose."
              >
                <ColorPicker
                  name="colors"
                  initial={colors}
                  suggestions={palette}
                  counted
                  onChange={setVariants}
                />
              </Field>
            ) : (
              <Field
                label={mode === "adjust" ? "Change by" : "New stock level"}
                htmlFor="amount"
                hint={
                  mode === "adjust"
                    ? "Use a negative number to remove stock."
                    : undefined
                }
              >
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step={1}
                  min={mode === "set" ? 0 : undefined}
                  required
                  autoFocus
                  defaultValue={mode === "set" ? currentStock : ""}
                  placeholder={mode === "adjust" ? "e.g. 12 or -3" : "0"}
                />
              </Field>
            )}

            <Field label="Reason" htmlFor="reason">
              <Select id="reason" name="reason" defaultValue="restock">
                {INVENTORY_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason[0].toUpperCase() + reason.slice(1)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Note" htmlFor="note">
              <Textarea
                id="note"
                name="note"
                rows={2}
                placeholder="Optional — supplier, invoice, what happened"
              />
            </Field>

            {state.ok === false && (
              <p
                role="alert"
                className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical"
              >
                {state.error}
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              {/* What is about to happen to the number on the shelf, before
                  anyone commits to it. */}
              {byColour ? (
                <p className="text-[13px] text-ink-secondary">
                  New stock{" "}
                  <span className="font-semibold tabular-nums text-ink">
                    {counted}
                  </span>
                  {counted !== currentStock && (
                    <span className="text-ink-muted">
                      {" "}
                      (was {currentStock})
                    </span>
                  )}
                </p>
              ) : (
                <span />
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Apply
                </Button>
              </div>
            </div>
          </form>
        </>
      </Modal>
    </>
  );
}
