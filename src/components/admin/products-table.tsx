"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, PackagePlus, Pencil, Trash2 } from "lucide-react";

import {
  deleteProduct,
  duplicateProduct,
} from "@/app/admin/(dashboard)/products/actions";
import { ColorDots } from "@/components/admin/color-picker";
import { MediaThumb } from "@/components/admin/media-thumb";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductBulkBar } from "@/components/admin/product-bulk-bar";
import {
  ConfirmSubmit,
  RowMenu,
  menuItemClass,
} from "@/components/admin/row-menu";
import { SelectCell, TextCell } from "@/components/admin/sheet-cells";
import { StockDot } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { koboToNairaInput } from "@/lib/format";
import type { ProductRow } from "@/lib/queries";
import { PRODUCT_STATUSES } from "@/lib/types";

/**
 * The products table. Client-side because of the selection checkboxes — the
 * rows themselves are still rendered from server-fetched data.
 *
 * Category, price, stock and status are editable in place, using the same
 * one-field-at-a-time save the Database sheet uses. Changing a price shouldn't
 * mean opening a product, and the two screens now behave the same way.
 */
export function ProductsTable({
  products,
  categories,
  subcategories,
}: {
  products: ProductRow[];
  categories: { id: string; name: string }[];
  subcategories: string[];
}) {
  const [selected, setSelected] = useState<string[]>([]);

  // Rows can disappear under the selection after a delete or a filter change.
  const visible = new Set(products.map((product) => product.id));
  const active = selected.filter((id) => visible.has(id));

  const allSelected = products.length > 0 && active.length === products.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleAll() {
    setSelected(allSelected ? [] : products.map((product) => product.id));
  }

  return (
    <>
      <div className="card overflow-hidden">
        {/* Desktop table */}
        <div className="table-scroll hidden md:block">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="table-head">
              <tr className="text-left text-xs font-medium text-ink-secondary">
                <th className="w-10 py-3 pl-5 pr-0">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={active.length > 0 && !allSelected}
                    onChange={toggleAll}
                    label="Select all products"
                  />
                </th>
                <th className="px-3 py-3 font-medium">Product</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 text-right font-medium">Price ₦</th>
                <th className="px-3 py-3 text-right font-medium">Stock</th>
                <th className="px-3 py-3 text-right font-medium">Orders</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => {
                const checked = active.includes(product.id);
                return (
                  <tr
                    key={product.id}
                    className={cn(
                      "transition-colors",
                      checked ? "bg-brand-soft/60" : "hover:bg-plane/60",
                    )}
                  >
                    <td className="py-3 pl-5 pr-0">
                      <Checkbox
                        checked={checked}
                        onChange={() => toggle(product.id)}
                        label={`Select ${product.name}`}
                      />
                    </td>

                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="flex items-center gap-3"
                      >
                        <Thumb src={product.images?.[0]} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">
                            {product.name}
                          </span>
                          <span className="flex items-center gap-2">
                            {product.sku && (
                              <span className="truncate text-xs text-ink-muted">
                                {product.sku}
                              </span>
                            )}
                            <ColorDots colors={product.colors ?? []} limit={4} />
                          </span>
                        </span>
                      </Link>
                    </td>

                    <td className="px-3 py-3">
                      <SelectCell
                        id={product.id}
                        field="category_id"
                        value={product.category_id ?? ""}
                        options={[
                          { value: "", label: "—" },
                          ...categories.map((category) => ({
                            value: category.id,
                            label: category.name,
                          })),
                        ]}
                      />
                      <SelectCell
                        id={product.id}
                        field="subcategory"
                        value={product.subcategory ?? ""}
                        placeholder="Subcategory"
                        options={subcategories.map((value) => ({
                          value,
                          label: value,
                        }))}
                        className="text-xs text-ink-muted"
                      />
                    </td>

                    <td className="px-3 py-3">
                      <TextCell
                        id={product.id}
                        field="price"
                        align="right"
                        value={koboToNairaInput(product.price_kobo)}
                        className="font-medium"
                      />
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="flex items-center justify-end gap-1.5">
                        <TextCell
                          id={product.id}
                          field="stock"
                          type="number"
                          align="right"
                          value={String(product.stock)}
                        />
                        <StockDot
                          stock={product.stock}
                          threshold={product.low_stock_threshold}
                        />
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right tabular-nums text-ink-secondary">
                      {product.orderCount}
                    </td>

                    <td className="px-3 py-3">
                      <SelectCell
                        id={product.id}
                        field="status"
                        value={product.status}
                        options={PRODUCT_STATUSES.map((status) => ({
                          value: status,
                          label: status[0].toUpperCase() + status.slice(1),
                        }))}
                      />
                    </td>

                    <td className="px-3 py-3">
                      <ProductRowMenu id={product.id} name={product.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <ul className="divide-y divide-line md:hidden">
          {products.map((product) => {
            const checked = active.includes(product.id);
            return (
              <li
                key={product.id}
                className={cn(
                  "flex items-center gap-3 p-4",
                  checked && "bg-brand-soft/60",
                )}
              >
                <Checkbox
                  checked={checked}
                  onChange={() => toggle(product.id)}
                  label={`Select ${product.name}`}
                />
                <Thumb src={product.images?.[0]} />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/products/${product.id}`}>
                    <p className="truncate text-sm font-medium text-ink">
                      {product.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {product.category?.name ?? "No category"} ·{" "}
                      {product.orderCount} order
                      {product.orderCount === 1 ? "" : "s"}
                    </p>
                  </Link>

                  <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                    <TextCell
                      id={product.id}
                      field="price"
                      prefix="₦"
                      value={koboToNairaInput(product.price_kobo)}
                    />
                    <span className="flex items-center gap-1.5">
                      <StockDot
                        stock={product.stock}
                        threshold={product.low_stock_threshold}
                      />
                      <TextCell
                        id={product.id}
                        field="stock"
                        type="number"
                        value={String(product.stock)}
                      />
                    </span>
                    <span className="col-span-2">
                      <SelectCell
                        id={product.id}
                        field="status"
                        value={product.status}
                        options={PRODUCT_STATUSES.map((status) => ({
                          value: status,
                          label: status[0].toUpperCase() + status.slice(1),
                        }))}
                      />
                    </span>
                  </div>
                </div>
                <ProductRowMenu id={product.id} name={product.name} />
              </li>
            );
          })}
        </ul>
      </div>

      {active.length > 0 && (
        <ProductBulkBar ids={active} onClear={() => setSelected([])} />
      )}
    </>
  );
}

function Thumb({ src }: { src?: string }) {
  if (!src) {
    return (
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-plane text-ink-muted ring-1 ring-inset ring-line"
      >
        <PackagePlus className="size-4" />
      </span>
    );
  }
  return (
    <MediaThumb
      url={src}
      className="size-10 shrink-0 rounded-lg ring-1 ring-inset ring-line"
    />
  );
}

function ProductRowMenu({ id, name }: { id: string; name: string }) {
  return (
    <RowMenu label={`Actions for ${name}`}>
      <Link href={`/admin/products/${id}`} className={menuItemClass}>
        <Pencil className="size-3.5" />
        Edit
      </Link>

      <form action={duplicateProduct}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className={menuItemClass}>
          <Copy className="size-3.5" />
          Duplicate
        </button>
      </form>

      <form action={deleteProduct}>
        <input type="hidden" name="id" value={id} />
        <ConfirmSubmit message={`Delete "${name}"? This can't be undone.`}>
          <Trash2 className="size-3.5" />
          Delete
        </ConfirmSubmit>
      </form>
    </RowMenu>
  );
}
