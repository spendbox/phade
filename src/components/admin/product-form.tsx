"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  createProduct,
  updateProduct,
  type ProductFormState,
} from "@/app/admin/(dashboard)/products/actions";
import { DescriptionField } from "@/components/admin/description-field";
import { ColorPicker } from "@/components/admin/color-picker";
import { SizePicker } from "@/components/admin/size-picker";
import { SelectField } from "@/components/ui/select-field";
import type { CatalogueDefaults } from "@/lib/catalogue-settings";
import { ImageUploader } from "@/components/admin/image-uploader";
import { SlugField } from "@/components/admin/slug-field";
import { TagsField } from "@/components/admin/tags-field";
import { Button, buttonClass } from "@/components/ui/button";
import {
  Field,
  Input,
  MoneyInput,
  NumberInput,
  Select,
} from "@/components/ui/field";
import { Panel } from "@/components/ui/stat-tile";
import { koboToNairaInput, slugify } from "@/lib/format";
import type {
  Category,
  ProductColor,
  ProductWithCategory,
} from "@/lib/types";

const initialState: ProductFormState = { ok: null };

/** Whether the colourways are carrying the count for this product. */
function counts(colors: ProductColor[]): boolean {
  return colors.length > 0 && colors.every((color) => color.stock !== undefined);
}

export function ProductForm({
  product,
  categories,
  subcategories,
  aiEnabled,
  defaults,
  defaultLowStock,
}: {
  product?: ProductWithCategory;
  categories: Category[];
  subcategories: string[];
  aiEnabled: boolean;
  defaults: CatalogueDefaults;
  defaultLowStock: number;
}) {
  const isEdit = Boolean(product);
  const router = useRouter();

  const [state, formAction, pending] = useActionState(
    isEdit ? updateProduct : createProduct,
    initialState,
  );

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [colors, setColors] = useState<ProductColor[]>(product?.colors ?? []);

  // Colours carry the count once every one of them has a number on it.
  const countedColours = counts(colors);
  const colourTotal = colors.reduce(
    (total, color) => total + Math.max(color.stock ?? 0, 0),
    0,
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(product?.slug));

  // A new product goes back to the list once it's saved; edits stay put so the
  // admin can keep tweaking.
  useEffect(() => {
    if (!isEdit && state.ok) {
      router.push("/admin/products");
      router.refresh();
    }
  }, [isEdit, state, router]);

  return (
    <form action={formAction} className="space-y-5">
      {product && <input type="hidden" name="id" value={product.id} />}

      {state.ok === false && (
        <p
          role="alert"
          className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical"
        >
          {state.error}
        </p>
      )}
      {state.ok === true && isEdit && (
        <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good-text">
          {state.message}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Details" className="lg:col-span-2">
            <div className="space-y-4">
              <Field label="Product name" htmlFor="name" required>
                <Input
                  id="name"
                  name="name"
                  required
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!slugTouched) setSlug(slugify(event.target.value));
                  }}
                  placeholder="Adaeze wrap dress"
                />
              </Field>

              <Field
                label="Description"
                htmlFor="description"
                hint={
                  aiEnabled
                    ? "Write it yourself, or let the assistant draft it from the name and category."
                    : undefined
                }
              >
                <DescriptionField
                  defaultValue={product?.description ?? ""}
                  enabled={aiEnabled}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Images">
            <ImageUploader initial={product?.images ?? []} />
          </Panel>

          <Panel title="Colours">
            <ColorPicker
              initial={product?.colors ?? []}
              suggestions={defaults.colors}
              counted
              onChange={setColors}
            />
            <p className="mt-2 text-xs text-ink-muted">
              How many of each you have. They add up to the stock on hand
              below, so a colourway that runs out stops being something a
              shopper can choose.
            </p>
          </Panel>

          <Panel title="Sizes">
            <SizePicker initial={product?.sizes ?? []} runs={defaults.runs} />
          </Panel>

          <Panel title="Pricing">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Price" htmlFor="price" required>
                <MoneyInput
                  id="price"
                  name="price"
                  required
                  defaultValue={koboToNairaInput(product?.price_kobo ?? 0)}
                  placeholder="0.00"
                />
              </Field>
              <Field
                label="Compare at"
                htmlFor="compare_at_price"
                hint="Shown struck through"
              >
                <MoneyInput
                  id="compare_at_price"
                  name="compare_at_price"
                  defaultValue={koboToNairaInput(
                    product?.compare_at_price_kobo ?? null,
                  )}
                />
              </Field>
              <Field
                label="Cost per item"
                htmlFor="cost_price"
                hint="Used for margin"
              >
                <MoneyInput
                  id="cost_price"
                  name="cost_price"
                  defaultValue={koboToNairaInput(product?.cost_price_kobo ?? null)}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Inventory">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Stock on hand"
                htmlFor="stock"
                hint={
                  countedColours
                    ? "Added up from the colours above."
                    : undefined
                }
              >
                {countedColours ? (
                  <>
                    <input type="hidden" name="stock" value={colourTotal} />
                    <p className="flex h-9 items-center rounded-lg bg-plane px-3 text-sm tabular-nums text-ink">
                      {colourTotal}
                      <span className="ml-2 text-xs text-ink-muted">
                        across {colors.length} colour
                        {colors.length === 1 ? "" : "s"}
                      </span>
                    </p>
                  </>
                ) : (
                  <NumberInput
                    id="stock"
                    name="stock"
                    min={0}
                    step={1}
                    defaultValue={product?.stock ?? 0}
                  />
                )}
              </Field>
              <Field
                label="Low stock at"
                htmlFor="low_stock_threshold"
                hint="Warn below this"
              >
                <NumberInput
                  id="low_stock_threshold"
                  name="low_stock_threshold"
                  min={0}
                  step={1}
                  defaultValue={product?.low_stock_threshold ?? defaultLowStock}
                />
              </Field>
              <Field label="SKU" htmlFor="sku">
                <Input
                  id="sku"
                  name="sku"
                  defaultValue={product?.sku ?? ""}
                  placeholder="PW-001"
                />
              </Field>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Visibility">
            <div className="space-y-4">
              <Field label="Status" htmlFor="status">
                <Select
                  id="status"
                  name="status"
                  defaultValue={product?.status ?? "draft"}
                >
                  <option value="draft">Draft — hidden from the store</option>
                  <option value="active">Active — on sale</option>
                  <option value="archived">Archived</option>
                </Select>
              </Field>

              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={product?.featured ?? false}
                  className="mt-0.5 size-4 rounded border-line-strong text-brand focus:ring-series"
                />
                <span className="text-sm">
                  <span className="font-medium text-ink">Feature this product</span>
                  <span className="block text-xs text-ink-muted">
                    Highlights it on the storefront home page.
                  </span>
                </span>
              </label>
            </div>
          </Panel>

          <Panel title="Organisation">
            <div className="space-y-4">
              <Field label="Category" htmlFor="category_id">
                <Select
                  id="category_id"
                  name="category_id"
                  defaultValue={product?.category_id ?? ""}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Subcategory"
                htmlFor="subcategory"
                hint="Optional — manage the list in Settings → Categories"
              >
                <SelectField
                  id="subcategory"
                  name="subcategory"
                  defaultValue={product?.subcategory ?? ""}
                  options={subcategories.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </Field>

              <TagsField
                defaultValue={product?.tags?.join(", ") ?? ""}
                enabled={aiEnabled}
              />

              <SlugField
                value={slug}
                onChange={(next) => {
                  setSlugTouched(true);
                  setSlug(next);
                }}
                prefix="/product/"
                editing={Boolean(product)}
              />
            </div>
          </Panel>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Link href="/admin/products" className={buttonClass("secondary")}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
