"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Tag,
  Scissors,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  createProductsBulk,
  type BulkCreateState,
} from "@/app/admin/(dashboard)/products/actions";
import { ColorPicker } from "@/components/admin/color-picker";
import { SizePicker } from "@/components/admin/size-picker";
import { SelectField } from "@/components/ui/select-field";
import type { CatalogueDefaults } from "@/lib/catalogue";
import { MediaThumb } from "@/components/admin/media-thumb";
import { VideoEditor } from "@/components/admin/video-editor";
import { Button, buttonClass } from "@/components/ui/button";
import {
  Field,
  Input,
  MoneyInput,
  NumberInput,
  Select,
  Textarea,
} from "@/components/ui/field";
import { describeProduct, mergeTags, suggestTags } from "@/lib/ai-client";
import { CategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/cn";
import { isPickableMedia, isVideoUrl, PICKABLE_MEDIA_TYPES } from "@/lib/media";
import { uploadMedia } from "@/lib/upload-client";
import type { Category, ProductColor, ProductStatus } from "@/lib/types";

const STORAGE_KEY = "phade:product-drafts:v1";

type Draft = {
  id: string;
  media: string[];
  name: string;
  price: string;
  status: ProductStatus;
  description: string;
  compareAtPrice: string;
  costPrice: string;
  stock: string;
  lowStockThreshold: string;
  sku: string;
  subcategory: string;
  colors: ProductColor[];
  sizes: number[];
  tags: string;
  featured: boolean;
};

type Saved = { categoryId: string | null; drafts: Draft[] };

const initialState: BulkCreateState = { ok: null };

function newDraft(media: string[], name: string): Draft {
  return {
    id: crypto.randomUUID(),
    media,
    name,
    price: "",
    status: "active",
    description: "",
    compareAtPrice: "",
    costPrice: "",
    stock: "",
    lowStockThreshold: "",
    sku: "",
    subcategory: "",
    colors: [],
    sizes: [],
    tags: "",
    featured: false,
  };
}

/** "IMG_4821.jpeg" -> "Img 4821" — a starting point the admin can overwrite. */
function nameFromFile(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return base.replace(/\s+/g, " ").trim().slice(0, 60).replace(/^./, (c) => c.toUpperCase());
}

function readSaved(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    if (!Array.isArray(parsed.drafts) || parsed.drafts.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Bulk product uploader.
 *
 * Flow: pick a category, drop in photos or videos, and every file becomes its
 * own product you can edit side by side before publishing. Only media, name,
 * price and status are asked for up front — the rest is collapsed.
 *
 * Work is saved to this browser continuously, so a closed tab, a refresh or a
 * flat battery doesn't cost the batch. This component is mounted client-only
 * (see product-uploader-mount.tsx), which is what lets it read that saved work
 * during the first render instead of flashing an empty form.
 */
export function ProductUploader({
  categories,
  subcategories,
  aiEnabled,
  defaults,
  defaultLowStock,
}: {
  categories: Category[];
  subcategories: string[];
  aiEnabled: boolean;
  defaults: CatalogueDefaults;
  defaultLowStock: number;
}) {
  // Read once, on the first render — the component never server-renders, so
  // reaching for localStorage here is safe and avoids an empty-then-filled flash.
  const [restored] = useState<Saved | null>(readSaved);

  const [categoryId, setCategoryId] = useState<string | null>(
    restored?.categoryId ?? null,
  );
  const [drafts, setDrafts] = useState<Draft[]>(restored?.drafts ?? []);
  const [step, setStep] = useState<"category" | "drafts">(
    restored ? "drafts" : "category",
  );
  const [showRestored, setShowRestored] = useState(Boolean(restored));

  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);

  const [state, formAction, publishing] = useActionState(
    createProductsBulk,
    initialState,
  );
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToDraftRef = useRef<string | null>(null);

  // Save continuously so a closed tab never costs the batch.
  useEffect(() => {
    if (drafts.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const timer = setTimeout(() => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ categoryId, drafts } satisfies Saved),
      );
      setSavedAt(Date.now());
    }, 500);
    return () => clearTimeout(timer);
  }, [drafts, categoryId]);

  // Published — the local copy has served its purpose.
  useEffect(() => {
    if (state.ok === true) {
      window.localStorage.removeItem(STORAGE_KEY);
      router.push("/admin/products");
      router.refresh();
    }
  }, [state, router]);

  function update(id: string, patch: Partial<Draft>) {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  }

  /** The clip open in the trim editor, and the draft it belongs to. */
  const [editing, setEditing] = useState<{ draftId: string; url: string } | null>(
    null,
  );

  async function handleFiles(files: FileList | File[]) {
    const list = [...files].filter(isPickableMedia);
    if (list.length === 0) return;

    const target = addToDraftRef.current;
    addToDraftRef.current = null;

    setUploadError(null);
    setUploading((count) => count + list.length);

    for (const file of list) {
      try {
        const url = await uploadMedia(file);
        if (target) {
          // Extra media for one product rather than a new product.
          setDrafts((current) =>
            current.map((draft) =>
              draft.id === target
                ? { ...draft, media: [...draft.media, url] }
                : draft,
            ),
          );
        } else {
          setDrafts((current) => [...current, newDraft([url], nameFromFile(file.name))]);
        }
      } catch (cause) {
        setUploadError(
          cause instanceof Error ? cause.message : "That file didn't upload.",
        );
      } finally {
        setUploading((count) => count - 1);
      }
    }
  }

  function pickFiles(draftId?: string) {
    addToDraftRef.current = draftId ?? null;
    fileInputRef.current?.click();
  }

  const category = categories.find((item) => item.id === categoryId) ?? null;
  const incomplete = drafts.filter(
    (draft) => !draft.name.trim() || !draft.price.trim() || !draft.stock.trim(),
  ).length;

  // ---------------------------------------------------------------- step 1
  if (step === "category") {
    return (
      <div className="card p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-ink">
          Which category are you adding to?
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Everything in this batch goes into the category you pick. You can move
          individual products later.
        </p>

        {categories.length === 0 ? (
          <p className="mt-5 rounded-lg bg-warning-soft px-3 py-2 text-sm text-[#7a5200]">
            No categories yet —{" "}
            <Link href="/admin/settings/categories" className="font-medium underline">
              create one first
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId(item.id);
                    setStep("drafts");
                  }}
                  className="flex w-full flex-col items-start gap-3 rounded-xl p-4 text-left shadow-[0_0_0_1px_rgb(11_11_12_/_0.08)] transition hover:shadow-[0_0_0_2px_var(--color-brand)]"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <CategoryIcon icon={item.icon} className="size-5" />
                  </span>
                  <span className="text-sm font-medium text-ink">
                    {item.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => {
            setCategoryId(null);
            setStep("drafts");
          }}
          className="mt-4 text-sm font-medium text-ink-secondary hover:text-ink"
        >
          Skip — no category for now
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------- step 2
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input
        type="hidden"
        name="drafts"
        value={JSON.stringify(
          drafts.map(({ id: _id, ...draft }) => draft),
        )}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept={PICKABLE_MEDIA_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {showRestored && (
        <div className="flex items-start gap-3 rounded-xl bg-brand-soft px-4 py-3">
          <Check className="mt-0.5 size-4 shrink-0 text-brand" />
          <p className="flex-1 text-sm text-ink">
            Picked up {drafts.length} unsaved product
            {drafts.length === 1 ? "" : "s"} from your last session.
          </p>
          <button
            type="button"
            onClick={() => {
              setDrafts([]);
              setShowRestored(false);
              setStep("category");
            }}
            className="text-sm font-medium text-brand hover:underline"
          >
            Start over
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setShowRestored(false)}
            className="text-ink-muted hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Context bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep("category")}
          className="inline-flex items-center gap-2 rounded-full bg-surface py-1.5 pl-2 pr-3 text-sm font-medium text-ink shadow-[0_0_0_1px_rgb(11_11_12_/_0.08)] hover:bg-plane"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft text-brand">
            <CategoryIcon icon={category?.icon} className="size-3.5" />
          </span>
          {category?.name ?? "No category"}
          <ChevronDown className="size-3.5 text-ink-muted" />
        </button>

        <p className="text-xs text-ink-muted" role="status">
          {uploading > 0
            ? `Uploading ${uploading} file${uploading === 1 ? "" : "s"}…`
            : savedAt
              ? "Saved to this browser"
              : "Changes save automatically"}
        </p>
      </div>

      {editing && (
        <VideoEditor
          url={editing.url}
          open
          onClose={() => setEditing(null)}
          onSave={(next) =>
            update(editing.draftId, {
              media: (
                drafts.find((draft) => draft.id === editing.draftId)?.media ?? []
              ).map((item) => (item === editing.url ? next : item)),
            })
          }
        />
      )}

      {drafts.length === 0 ? (
        <Dropzone
          onFiles={handleFiles}
          onPick={() => pickFiles()}
          uploading={uploading > 0}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {drafts.map((draft, index) => (
              <li key={draft.id} className="card overflow-hidden">
                <div className="flex flex-col gap-4 p-4 sm:flex-row">
                  {/* Media */}
                  <div className="sm:w-40 sm:shrink-0">
                    <MediaThumb
                      url={draft.media[0]}
                      className="aspect-square w-full rounded-lg ring-1 ring-inset ring-line"
                      controls
                    />

                    {/* One product at a time, as each is added: trim the clip
                        and pick the frame it rests on before publishing. */}
                    {isVideoUrl(draft.media[0]) && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({ draftId: draft.id, url: draft.media[0] })
                        }
                        className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-plane text-xs font-medium text-ink transition hover:bg-line-strong"
                      >
                        <Scissors className="size-3.5" />
                        Trim &amp; placeholder
                      </button>
                    )}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {draft.media.slice(1).map((url) => (
                        <span key={url} className="relative">
                          <MediaThumb
                            url={url}
                            className="size-10 rounded-md ring-1 ring-inset ring-line"
                          />
                          <button
                            type="button"
                            aria-label="Remove media"
                            onClick={() =>
                              update(draft.id, {
                                media: draft.media.filter((item) => item !== url),
                              })
                            }
                            className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-ink text-white"
                          >
                            <X className="size-2.5" />
                          </button>
                        </span>
                      ))}

                      <button
                        type="button"
                        onClick={() => pickFiles(draft.id)}
                        aria-label="Add more media to this product"
                        className="flex size-10 items-center justify-center rounded-md text-ink-muted ring-1 ring-inset ring-line-strong transition hover:bg-plane hover:text-ink"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* The four fields that matter */}
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-ink-muted">
                        Product {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts((current) =>
                            current.filter((item) => item.id !== draft.id),
                          )
                        }
                        aria-label="Remove this product"
                        className="text-ink-muted transition hover:text-critical"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Name" required className="sm:col-span-2">
                        <Input
                          value={draft.name}
                          onChange={(event) =>
                            update(draft.id, { name: event.target.value })
                          }
                          placeholder="Adaeze wrap dress"
                          aria-invalid={attempted && !draft.name.trim()}
                          className={
                            attempted && !draft.name.trim()
                              ? "shadow-[0_0_0_2px_var(--color-critical)]"
                              : undefined
                          }
                        />
                      </Field>

                      <Field label="Price" required>
                        <MoneyInput
                          value={draft.price}
                          onChange={(event) =>
                            update(draft.id, { price: event.target.value })
                          }
                          placeholder="0.00"
                          aria-invalid={attempted && !draft.price.trim()}
                          className={
                            attempted && !draft.price.trim()
                              ? "shadow-[0_0_0_2px_var(--color-critical)]"
                              : undefined
                          }
                        />
                      </Field>

                      <Field label="Stock" required>
                        <NumberInput
                          min={0}
                          step={1}
                          value={draft.stock}
                          onChange={(event) =>
                            update(draft.id, { stock: event.target.value })
                          }
                          placeholder="0"
                          aria-invalid={attempted && !draft.stock.trim()}
                          className={
                            attempted && !draft.stock.trim()
                              ? "shadow-[0_0_0_2px_var(--color-critical)]"
                              : undefined
                          }
                        />
                      </Field>

                      <Field label="Status" className="sm:col-span-2">
                        <Select
                          value={draft.status}
                          onChange={(event) =>
                            update(draft.id, {
                              status: event.target.value as ProductStatus,
                            })
                          }
                        >
                          <option value="active">Active — on sale</option>
                          <option value="draft">Draft — hidden</option>
                        </Select>
                      </Field>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((current) => ({
                          ...current,
                          [draft.id]: !current[draft.id],
                        }))
                      }
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
                    >
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform",
                          expanded[draft.id] && "rotate-180",
                        )}
                      />
                      {expanded[draft.id] ? "Hide details" : "More details"}
                      <span className="font-normal text-ink-muted">
                        (optional)
                      </span>
                    </button>

                    {expanded[draft.id] && (
                      <MoreDetails
                        draft={draft}
                        categoryName={category?.name}
                        subcategories={subcategories}
                        aiEnabled={aiEnabled}
                        defaults={defaults}
                        defaultLowStock={defaultLowStock}
                        onChange={(patch) => update(draft.id, patch)}
                      />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => pickFiles()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-plane/60 py-3 text-sm font-medium text-ink-secondary transition hover:border-brand hover:text-ink"
          >
            {uploading > 0 ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            Add more products
          </button>
        </>
      )}

      {uploadError && (
        <p role="alert" className="text-sm text-critical">
          {uploadError}
        </p>
      )}
      {state.ok === false && (
        <p
          role="alert"
          className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical"
        >
          {state.error}
        </p>
      )}

      {/* Publish bar */}
      {drafts.length > 0 && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <p className="text-sm text-ink-secondary">
            <span className="font-medium text-ink">{drafts.length}</span> product
            {drafts.length === 1 ? "" : "s"} ready
            {incomplete > 0 && (
              <span className="text-critical">
                {" "}
                · {incomplete} incomplete
              </span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <Link href="/admin/products" className={buttonClass("secondary")}>
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={publishing || uploading > 0}
              onClick={(event) => {
                setAttempted(true);
                if (incomplete > 0) event.preventDefault();
              }}
            >
              {publishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Publish {drafts.length}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

function Dropzone({
  onFiles,
  onPick,
  uploading,
}: {
  onFiles: (files: FileList) => void;
  onPick: () => void;
  uploading: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFiles(event.dataTransfer.files);
      }}
      className={cn(
        "card flex flex-col items-center justify-center px-6 py-16 text-center transition-colors",
        dragging && "shadow-[0_0_0_2px_var(--color-brand)]",
      )}
    >
      {uploading ? (
        <Loader2 className="size-6 animate-spin text-ink-muted" />
      ) : (
        <ImagePlus className="size-6 text-ink-muted" />
      )}

      <p className="mt-3 text-sm font-medium text-ink">
        Drop your photos and videos here
      </p>
      <p className="mt-1 max-w-sm text-sm text-ink-secondary">
        Each file becomes its own product, ready to name and price. Add several
        at once and edit them side by side.
      </p>

      <button
        type="button"
        onClick={onPick}
        className={buttonClass("primary", "md", "mt-4")}
      >
        Choose files
      </button>
      <p className="mt-2 text-xs text-ink-muted">
        JPEG, PNG, WebP, MP4 or MOV · up to 50MB each
      </p>
    </div>
  );
}

function MoreDetails({
  draft,
  categoryName,
  subcategories,
  aiEnabled,
  defaults,
  defaultLowStock,
  onChange,
}: {
  draft: Draft;
  categoryName?: string;
  subcategories: string[];
  aiEnabled: boolean;
  defaults: CatalogueDefaults;
  defaultLowStock: number;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const [writing, setWriting] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tag() {
    setTagging(true);
    setError(null);
    try {
      const suggested = await suggestTags({
        name: draft.name,
        category: categoryName,
        current: draft.description,
      });
      // Merge rather than replace, so hand-written tags survive.
      onChange({ tags: mergeTags(draft.tags, suggested) });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The assistant couldn't respond.",
      );
    } finally {
      setTagging(false);
    }
  }

  async function write() {
    setWriting(true);
    setError(null);
    try {
      const description = await describeProduct(
        draft.description.trim() ? "improve" : "generate",
        {
          name: draft.name,
          category: categoryName,
          price: draft.price,
          current: draft.description,
        },
      );
      onChange({ description });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The assistant couldn't respond.",
      );
    } finally {
      setWriting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg bg-plane/70 p-3">
      <Field
        label="Description"
        action={
          aiEnabled ? (
            <button
              type="button"
              onClick={() => void write()}
              disabled={writing || !draft.name.trim()}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-brand-soft px-2 text-xs font-medium text-brand transition hover:bg-brand/10 disabled:opacity-50"
            >
              {writing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Sparkles className="size-3" />
              )}
              {draft.description.trim() ? "Rewrite" : "Write with AI"}
            </button>
          ) : undefined
        }
      >
        <Textarea
          rows={3}
          value={draft.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Optional — the fit, the fabric, where she'd wear it."
        />
      </Field>

      {error && <p className="text-xs text-critical">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Compare at">
          <MoneyInput
            value={draft.compareAtPrice}
            onChange={(event) =>
              onChange({ compareAtPrice: event.target.value })
            }
          />
        </Field>
        <Field label="Cost per item">
          <MoneyInput
            value={draft.costPrice}
            onChange={(event) => onChange({ costPrice: event.target.value })}
          />
        </Field>
        <Field label="Low stock at">
          <NumberInput
            min={0}
            step={1}
            value={draft.lowStockThreshold}
            onChange={(event) =>
              onChange({ lowStockThreshold: event.target.value })
            }
            placeholder={String(defaultLowStock)}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Subcategory"
          hint="Optional — manage the list in Settings → Categories"
        >
          <SelectField
            value={draft.subcategory}
            onChange={(subcategory) => onChange({ subcategory })}
            options={subcategories.map((value) => ({ value, label: value }))}
          />
        </Field>
        <Field label="SKU" hint="Left blank, we generate one">
          <Input
            value={draft.sku}
            onChange={(event) => onChange({ sku: event.target.value })}
            placeholder="Generated automatically"
          />
        </Field>
      </div>

      <Field label="Colours" hint="Optional — the colourways you stock">
        {/* The draft owns the value, not the picker, so autosave keeps it. */}
        <ColorPicker
          name={`colors-${draft.id}`}
          initial={draft.colors}
          suggestions={defaults.colors}
          onChange={(colors) => onChange({ colors })}
        />
      </Field>

      <Field label="Sizes" hint="Optional — leave blank for one-size pieces">
        <SizePicker
          name={`sizes-${draft.id}`}
          initial={draft.sizes}
          runs={defaults.runs}
          onChange={(sizes) => onChange({ sizes })}
        />
      </Field>

      <Field
        label="Tags"
        hint="Comma separated"
        action={
          aiEnabled ? (
            <button
              type="button"
              onClick={() => void tag()}
              disabled={tagging || !draft.description.trim()}
              title={
                draft.description.trim()
                  ? undefined
                  : "Write a description first — tags come from it"
              }
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-brand-soft px-2 text-xs font-medium text-brand transition hover:bg-brand/10 disabled:opacity-50"
            >
              {tagging ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Tag className="size-3" />
              )}
              Suggest tags
            </button>
          ) : undefined
        }
      >
        <Input
          value={draft.tags}
          onChange={(event) => onChange({ tags: event.target.value })}
          placeholder="ankara, party, new-in"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={draft.featured}
          onChange={(event) => onChange({ featured: event.target.checked })}
          className="size-4 rounded border-line-strong text-brand focus:ring-brand"
        />
        Feature on the storefront home page
      </label>
    </div>
  );
}
