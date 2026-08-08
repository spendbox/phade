"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";

import {
  saveCategory,
  type CategoryFormState,
} from "@/app/admin/(dashboard)/settings/categories/actions";
import { IconPicker } from "@/components/admin/icon-picker";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, NumberInput, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { describeCategory } from "@/lib/ai-client";
import type { Category } from "@/lib/types";

const initialState: CategoryFormState = { ok: null };

/**
 * One dialog serves both "new" and "edit" — `category` decides which.
 * `trigger` lets the caller render whatever opens it.
 */
export function CategoryDialog({
  category,
  aiEnabled = false,
  trigger,
}: {
  category?: Category;
  aiEnabled?: boolean;
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
          className={buttonClass("primary")}
        >
          <Plus className="size-4" />
          New category
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={category ? "Edit category" : "New category"}
      >
        <CategoryForm
          key={category?.id ?? "new"}
          category={category}
          aiEnabled={aiEnabled}
          formAction={formAction}
          pending={pending}
          state={state}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

function CategoryForm({
  category,
  aiEnabled,
  formAction,
  pending,
  state,
  onCancel,
}: {
  category?: Category;
  aiEnabled: boolean;
  formAction: (formData: FormData) => void;
  pending: boolean;
  state: CategoryFormState;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [image, setImage] = useState(category?.image_url ?? "");
  const [writing, setWriting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function write() {
    setWriting(true);
    setAiError(null);
    try {
      // Grows the short line already written rather than replacing its meaning.
      setDescription(await describeCategory({ name, current: description }));
    } catch (cause) {
      setAiError(
        cause instanceof Error
          ? cause.message
          : "The assistant couldn't respond.",
      );
    } finally {
      setWriting(false);
    }
  }

  return (
    <form action={formAction} className="space-y-4 p-5">
      {category && <input type="hidden" name="id" value={category.id} />}

      <Field label="Name" htmlFor="category-name" required>
        <Input
          id="category-name"
          name="name"
          required
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Bags"
        />
      </Field>

      <Field label="Icon" hint="Stands for this category in the shop's menu">
        <IconPicker defaultValue={category?.icon} />
      </Field>

      {/* The uploader speaks in lists; the column holds one URL. */}
      <input type="hidden" name="image_url" value={image} />
      <Field
        label="Picture"
        hint="Shown on the front page. Without one, the icon stands in."
      >
        <ImageUploader
          name="category_image_upload"
          limit={1}
          initial={image ? [image] : []}
          onChange={(media) => setImage(media[0] ?? "")}
          hint="One photograph — it is shown as a circle, so keep the subject centred."
        />
      </Field>

      <Field
        label="Description"
        htmlFor="category-description"
        action={
          aiEnabled ? (
            <button
              type="button"
              onClick={() => void write()}
              disabled={writing || !name.trim()}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-brand-soft px-2 text-xs font-medium text-brand transition hover:bg-brand/10 disabled:opacity-50"
            >
              {writing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Sparkles className="size-3" />
              )}
              {description.trim() ? "Expand with AI" : "Write with AI"}
            </button>
          ) : undefined
        }
      >
        <Textarea
          id="category-description"
          name="description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Handbags, totes and clutches"
        />
      </Field>

      {aiError && <p className="text-sm text-critical">{aiError}</p>}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Slug" htmlFor="category-slug" hint="Leave blank to generate">
          <Input
            id="category-slug"
            name="slug"
            defaultValue={category?.slug ?? ""}
          />
        </Field>
        <Field label="Sort order" htmlFor="category-sort" hint="Lower shows first">
          <NumberInput
            id="category-sort"
            name="sort_order"
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
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {category ? "Save" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
