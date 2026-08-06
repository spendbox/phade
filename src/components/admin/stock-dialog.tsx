"use client";

import { useActionState, useState } from "react";
import { Loader2, X } from "lucide-react";

import {
  adjustStock,
  type StockFormState,
} from "@/app/admin/(dashboard)/inventory/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { INVENTORY_REASONS } from "@/lib/types";

const initialState: StockFormState = { ok: null };

export function StockDialog({
  productId,
  productName,
  currentStock,
}: {
  productId: string;
  productName: string;
  currentStock: number;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"adjust" | "set">("adjust");
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center rounded-lg bg-surface px-3 text-[13px] font-medium text-ink ring-1 ring-inset ring-line-strong transition-colors hover:bg-plane"
      >
        Adjust
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Adjust stock for ${productName}`}
            className="relative w-full max-w-sm rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-ink">
                  {productName}
                </h2>
                <p className="text-xs text-ink-muted">
                  {currentStock} in stock now
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

              <div className="grid grid-cols-2 gap-1 rounded-lg bg-plane p-1">
                {(["adjust", "set"] as const).map((value) => (
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
                    {value === "adjust" ? "Add / remove" : "Set exact"}
                  </button>
                ))}
              </div>

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
            </form>
          </div>
        </div>
      )}
    </>
  );
}
