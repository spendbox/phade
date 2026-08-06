"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import {
  saveCategory,
  type CategoryFormState,
} from "@/app/admin/(dashboard)/categories/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { Category } from "@/lib/types";

const initialState: CategoryFormState = { ok: null };

/**
 * One dialog serves both "new" and "edit" — `category` decides which.
 * `trigger` lets the caller render whatever opens it.
 */
export function CategoryDialog({
  category,
  trigger,
}: {
  category?: Category;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveCategory,
    initialState,
  );

  // Close as soon as the action reports success. Adjusting state during render
  // is the supported way to respond to a changed value — no effect needed, and
  // the action's revalidatePath already refreshes the list behind the dialog.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.ok) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger ?? (
          <button type="button" className={buttonClass("primary")}>
            <Plus className="size-4" />
            New category
          </button>
        )}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={category ? "Edit category" : "New category"}
            className="relative w-full max-w-md rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink">
                {category ? "Edit category" : "New category"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-plane hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </header>

            <form action={formAction} className="space-y-4 p-5">
              {category && (
                <input type="hidden" name="id" value={category.id} />
              )}

              <Field label="Name" htmlFor="category-name" required>
                <Input
                  id="category-name"
                  name="name"
                  required
                  autoFocus
                  defaultValue={category?.name ?? ""}
                  placeholder="Dresses"
                />
              </Field>

              <Field label="Description" htmlFor="category-description">
                <Textarea
                  id="category-description"
                  name="description"
                  rows={3}
                  defaultValue={category?.description ?? ""}
                  placeholder="Everyday and occasion dresses"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Slug"
                  htmlFor="category-slug"
                  hint="Leave blank to generate"
                >
                  <Input
                    id="category-slug"
                    name="slug"
                    defaultValue={category?.slug ?? ""}
                  />
                </Field>
                <Field
                  label="Sort order"
                  htmlFor="category-sort"
                  hint="Lower shows first"
                >
                  <Input
                    id="category-sort"
                    name="sort_order"
                    type="number"
                    step={1}
                    defaultValue={category?.sort_order ?? 0}
                  />
                </Field>
              </div>

              {state.ok === false && (
                <p
                  role="alert"
                  className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical"
                >
                  {state.error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {category ? "Save" : "Add category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
