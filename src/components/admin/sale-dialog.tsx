"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Loader2, Plus, Search } from "lucide-react";

import {
  saveSale,
  type SaleFormState,
} from "@/app/admin/(dashboard)/sales/actions";
import { Button, buttonClass } from "@/components/ui/button";
import {
  Field,
  Input,
  MoneyInput,
  NumberInput,
  Textarea,
} from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { koboToNairaInput, toDateTimeLocal } from "@/lib/format";
import type {
  DiscountKind,
  DiscountScope,
  DiscountWithTargets,
} from "@/lib/types";

const initialState: SaleFormState = { ok: null };

type Option = { id: string; name: string };

/**
 * Start or edit a sale.
 *
 * A sale is the container; the coupon code is optional — leave it blank and the
 * discount applies automatically, fill it in and shoppers have to type it.
 */
export function SaleDialog({
  sale,
  categories,
  products,
  trigger,
}: {
  sale?: DiscountWithTargets;
  categories: Option[];
  products: Option[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveSale, initialState);

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
          Start a sale
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={sale ? "Edit sale" : "Start a sale"}
      >
        <SaleForm
          key={sale?.id ?? "new"}
          sale={sale}
          categories={categories}
          products={products}
          formAction={formAction}
          pending={pending}
          state={state}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

function SaleForm({
  sale,
  categories,
  products,
  formAction,
  pending,
  state,
  onCancel,
}: {
  sale?: DiscountWithTargets;
  categories: Option[];
  products: Option[];
  formAction: (formData: FormData) => void;
  pending: boolean;
  state: SaleFormState;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<DiscountKind>(sale?.kind ?? "percentage");
  const [scope, setScope] = useState<DiscountScope>(sale?.scope ?? "all");
  const [categoryIds, setCategoryIds] = useState<string[]>(
    sale?.categoryIds ?? [],
  );
  const [productIds, setProductIds] = useState<string[]>(sale?.productIds ?? []);

  return (
    <form action={formAction} className="space-y-4 p-5">
      {sale && <input type="hidden" name="id" value={sale.id} />}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="category_ids" value={categoryIds.join(",")} />
      <input type="hidden" name="product_ids" value={productIds.join(",")} />

      <Field label="Sale name" htmlFor="sale-name" required>
        <Input
          id="sale-name"
          name="name"
          required
          autoFocus
          defaultValue={sale?.name ?? ""}
          placeholder="End of season"
        />
      </Field>

      {/* What comes off */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Discount type">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-plane p-1">
            {(
              [
                ["percentage", "Percent off"],
                ["fixed", "Amount off"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={cn(
                  "rounded-md py-1.5 text-[13px] font-medium transition-colors",
                  kind === value
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-secondary hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label={kind === "percentage" ? "Percent off" : "Amount off"}
          htmlFor="sale-value"
          required
        >
          {kind === "percentage" ? (
            <div className="relative">
              <NumberInput
                id="sale-value"
                name="value"
                min={1}
                max={100}
                step={1}
                required
                defaultValue={sale?.kind === "percentage" ? sale.value : ""}
                placeholder="20"
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                %
              </span>
            </div>
          ) : (
            <MoneyInput
              id="sale-value"
              name="value"
              required
              defaultValue={
                sale?.kind === "fixed" ? koboToNairaInput(sale.value) : ""
              }
              placeholder="0.00"
            />
          )}
        </Field>
      </div>

      {/* What it applies to */}
      <Field label="Applies to">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-plane p-1">
          {(
            [
              ["all", "Everything"],
              ["categories", "Categories"],
              ["products", "Products"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={cn(
                "rounded-md py-1.5 text-[13px] font-medium transition-colors",
                scope === value
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-secondary hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {scope === "categories" && (
        <Picker
          label="Categories on sale"
          options={categories}
          selected={categoryIds}
          onChange={setCategoryIds}
          emptyHint="No categories yet."
        />
      )}

      {scope === "products" && (
        <Picker
          label="Products on sale"
          options={products}
          selected={productIds}
          onChange={setProductIds}
          searchable
          emptyHint="No products yet."
        />
      )}

      <Field
        label="Coupon code"
        htmlFor="sale-code"
        hint="Leave blank to discount automatically, with no code to type."
      >
        <Input
          id="sale-code"
          name="code"
          defaultValue={sale?.code ?? ""}
          placeholder="EASTER20"
          className="uppercase"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Starts" htmlFor="sale-starts">
          <Input
            id="sale-starts"
            name="starts_at"
            type="datetime-local"
            defaultValue={toDateTimeLocal(sale?.starts_at ?? new Date().toISOString())}
          />
        </Field>
        <Field
          label="Ends"
          htmlFor="sale-ends"
          hint="Leave blank to run until you stop it"
        >
          <Input
            id="sale-ends"
            name="ends_at"
            type="datetime-local"
            defaultValue={toDateTimeLocal(sale?.ends_at)}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Minimum order" htmlFor="sale-min" hint="Optional">
          <MoneyInput
            id="sale-min"
            name="min_order"
            // Blank rather than a lone "0" — the admin shouldn't have to clear
            // it before typing a real figure.
            defaultValue={
              sale?.min_order_kobo
                ? koboToNairaInput(sale.min_order_kobo)
                : undefined
            }
          />
        </Field>
        <Field label="Total uses" htmlFor="sale-limit" hint="Blank for unlimited">
          <NumberInput
            id="sale-limit"
            name="usage_limit"
            min={1}
            step={1}
            defaultValue={sale?.usage_limit ?? ""}
            placeholder="Unlimited"
          />
        </Field>
      </div>

      <Field label="Internal note" htmlFor="sale-description">
        <Textarea
          id="sale-description"
          name="description"
          rows={2}
          defaultValue={sale?.description ?? ""}
          placeholder="Optional — why this sale is running"
        />
      </Field>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={sale?.enabled ?? true}
          className="size-4 rounded border-line-strong accent-brand"
        />
        <span className="font-medium text-ink">Live</span>
        <span className="text-ink-muted">
          Uncheck to set it up without running it yet
        </span>
      </label>

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
          {sale ? "Save sale" : "Start sale"}
        </Button>
      </div>
    </form>
  );
}

/** Checkbox list for choosing which categories or products a sale covers. */
function Picker({
  label,
  options,
  selected,
  onChange,
  searchable = false,
  emptyHint,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  emptyHint: string;
}) {
  const [search, setSearch] = useState("");

  const visible = search
    ? options.filter((option) =>
        option.name.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  return (
    <Field
      label={label}
      hint={`${selected.length} selected`}
      action={
        selected.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-ink-secondary hover:text-ink"
          >
            Clear
          </button>
        ) : undefined
      }
    >
      <div className="rounded-lg bg-plane p-1.5">
        {searchable && (
          <div className="relative mb-1.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="h-8 w-full rounded-md bg-surface pl-8 pr-2 text-[13px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        )}

        <div className="max-h-44 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-ink-muted">
              {search ? "No matches." : emptyHint}
            </p>
          ) : (
            <ul>
              {visible.map((option) => {
                const checked = selected.includes(option.id);
                return (
                  <li key={option.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                        checked
                          ? "bg-brand-soft text-brand"
                          : "text-ink-secondary hover:bg-surface hover:text-ink",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          onChange(
                            checked
                              ? selected.filter((id) => id !== option.id)
                              : [...selected, option.id],
                          )
                        }
                        className="size-3.5 rounded border-line-strong accent-brand"
                      />
                      <span className="truncate">{option.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Field>
  );
}
