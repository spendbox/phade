"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";

import {
  saveSubcategory,
  type SubcategoryFormState,
} from "@/app/admin/(dashboard)/settings/categories/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, NumberInput, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { Category, SubcategoryWithCategory } from "@/lib/types";

const initialState: SubcategoryFormState = { ok: null };

/**
 * One dialog for both "new" and "edit", the same as categories.
 *
 * A subcategory can sit under one category or under none; one with no category
 * is offered on every product, which suits terms like "Plus size" that cut
 * across the catalogue.
 */
export function SubcategoryDialog({
  subcategory,
  categories,
  trigger,
}: {
  subcategory?: SubcategoryWithCategory;
  categories: Category[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveSubcategory,
    initialState,
  );

  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.ok) setOpen(false);
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="contents">
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={buttonClass("secondary")}
        >
          <Plus className="size-4" />
          New subcategory
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title={subcategory ? "Edit subcategory" : "New subcategory"}
      >
        <form
          key={subcategory?.id ?? "new"}
          action={formAction}
          className="space-y-4 p-5"
        >
          {subcategory && (
            <input type="hidden" name="id" value={subcategory.id} />
          )}

          <Field label="Name" htmlFor="subcategory-name" required>
            <Input
              id="subcategory-name"
              name="name"
              required
              autoFocus
              defaultValue={subcategory?.name ?? ""}
              placeholder="Two-piece sets"
            />
          </Field>

          <Field
            label="Category"
            htmlFor="subcategory-category"
            hint="Leave blank to offer it in every category."
          >
            <Select
              id="subcategory-category"
              name="category_id"
              defaultValue={subcategory?.category_id ?? ""}
            >
              <option value="">Every category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Sort order"
            htmlFor="subcategory-sort"
            hint="Lower numbers come first."
          >
            <NumberInput
              id="subcategory-sort"
              name="sort_order"
              step={1}
              defaultValue={subcategory?.sort_order ?? 0}
              className="max-w-[8rem]"
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
              {subcategory ? "Save" : "Add subcategory"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
