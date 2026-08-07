"use client";

import { useActionState, useRef, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";

import {
  bulkDelete,
  bulkSetStatus,
  type BulkActionState,
} from "@/app/admin/(dashboard)/products/actions";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/field";
import { DELETE_CONFIRMATION, PRODUCT_STATUSES } from "@/lib/types";

const initialState: BulkActionState = { ok: null };

/**
 * Floating bar for the current selection. Status changes apply straight away;
 * deleting asks for the word to be typed, because there is no undo.
 */
export function ProductBulkBar({
  ids,
  onClear,
}: {
  ids: string[];
  onClear: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState("");
  const statusFormRef = useRef<HTMLFormElement>(null);
  const [statusState, statusAction, statusPending] = useActionState(
    bulkSetStatus,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    bulkDelete,
    initialState,
  );

  // Clear the selection once an action lands, so the bar doesn't linger over
  // rows that no longer exist.
  const [lastState, setLastState] = useState<BulkActionState>(initialState);
  const settled = deleteState.ok === true ? deleteState : statusState;
  if (settled !== lastState) {
    setLastState(settled);
    if (settled.ok === true) {
      setConfirming(false);
      onClear();
    }
  }

  const idList = ids.join(",");
  const error =
    statusState.ok === false
      ? statusState.error
      : deleteState.ok === false
        ? deleteState.error
        : null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl bg-ink px-3 py-2 shadow-[0_8px_30px_rgb(11_11_12_/_0.28)]">
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="flex size-7 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>

          <span className="px-1 text-sm font-medium text-white">
            {ids.length} selected
          </span>

          <span className="mx-1 h-5 w-px bg-white/15" />

          <form
            ref={statusFormRef}
            action={statusAction}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="ids" value={idList} />
            <input type="hidden" name="status" value={status} />
            <Dropdown
              label={statusPending ? "Saving…" : "Set status"}
              value={status}
              allLabel="Choose a status"
              options={PRODUCT_STATUSES.map((value) => ({
                value,
                label: value[0].toUpperCase() + value.slice(1),
              }))}
              onChange={(next) => {
                if (!next) return;
                setStatus(next);
                // One press, not two: submit as soon as a status is chosen,
                // after the hidden input has taken the new value.
                setTimeout(() => statusFormRef.current?.requestSubmit(), 0);
              }}
              className="!bg-white/10 !text-white !shadow-none hover:!bg-white/15"
            />
          </form>

          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={deletePending}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-white/80 transition hover:bg-critical hover:text-white"
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>

          {error && (
            <span className="max-w-[16rem] px-1 text-xs text-white/80">
              {error}
            </span>
          )}
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setConfirming(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete"
            className="relative w-full max-w-sm rounded-t-2xl bg-surface p-5 shadow-2xl sm:rounded-2xl"
          >
            <h2 className="text-sm font-semibold text-ink">
              Delete {ids.length} product{ids.length === 1 ? "" : "s"}?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
              This can&apos;t be undone. Their order history stays, but the
              products themselves are gone for good.
            </p>

            <form action={deleteAction} className="mt-4 space-y-3">
              <input type="hidden" name="ids" value={idList} />

              <label className="block text-[13px] font-medium text-ink-secondary">
                Type <span className="font-mono text-ink">{DELETE_CONFIRMATION}</span>{" "}
                to confirm
                <Input
                  name="confirmation"
                  autoFocus
                  autoComplete="off"
                  placeholder={DELETE_CONFIRMATION}
                  className="mt-1.5"
                />
              </label>

              {deleteState.ok === false && (
                <p role="alert" className="text-sm text-critical">
                  {deleteState.error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setConfirming(false)}
                  disabled={deletePending}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger" disabled={deletePending}>
                  {deletePending && <Loader2 className="size-4 animate-spin" />}
                  Delete {ids.length}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

