"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Loader2, Lock, ShoppingBag, Store, Truck } from "lucide-react";

import { placeOrder, type CheckoutState } from "@/app/(shop)/checkout/actions";
import { Media } from "@/components/shop/media";
import { useShop } from "@/components/shop/shop-provider";
import { cn } from "@/lib/cn";
import { formatNairaShort } from "@/lib/format";
import { lineKey } from "@/lib/shop";
import { deliveryFor, type StorefrontContent } from "@/lib/storefront";

const initial: CheckoutState = { ok: null };

/**
 * Checkout.
 *
 * One screen, in the order a person actually answers the questions: how it
 * reaches them, who they are, where it goes, then pay. The bag travels as ids
 * and quantities only — the server prices it — so nothing here is worth
 * tampering with.
 *
 * The bag is deliberately not emptied on submit. Payment can be abandoned, and
 * a shopper who comes back to try again should find their bag as they left it;
 * the order page clears it once the money has actually arrived.
 */
export function CheckoutForm({ content }: { content: StorefrontContent }) {
  const { bag, subtotalKobo, ready, cartToken, count } = useShop();
  const [state, formAction, pending] = useActionState(placeOrder, initial);
  const [fulfilment, setFulfilment] = useState<"shipping" | "pickup">(
    "shipping",
  );

  const shipping = deliveryFor(content, subtotalKobo, fulfilment);
  const total = subtotalKobo + shipping;

  // Paystack is a different origin, so this is a real navigation rather than a
  // router push. Internal redirects go the same way for one code path.
  useEffect(() => {
    if (state.ok === true) window.location.assign(state.redirect);
  }, [state]);

  if (!ready) return <div className="min-h-[50dvh]" aria-hidden />;

  if (bag.length === 0) {
    return (
      <div className="mx-auto max-w-sm px-6 py-20 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-canvas-deep text-ink-muted">
          <ShoppingBag className="size-6" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-ink">
          There&apos;s nothing to check out
        </h2>
        <p className="mt-2 text-sm text-ink-secondary">
          Add something to your bag and it will be waiting here.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-noir px-6 text-sm font-medium text-white transition hover:bg-brand"
        >
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="grid gap-8 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:px-8"
    >
      <input type="hidden" name="cart_token" value={cartToken} />
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(
          bag.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            color: line.color,
            size: line.size,
          })),
        )}
      />

      <div className="space-y-8">
        <fieldset>
          <legend className="text-sm font-semibold text-ink">
            How would you like it?
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Choice
              name="fulfilment"
              value="shipping"
              checked={fulfilment === "shipping"}
              onChange={() => setFulfilment("shipping")}
              icon={<Truck className="size-4" aria-hidden />}
              title="Delivered"
              note={
                shipping === 0
                  ? "Free on this order"
                  : `${formatNairaShort(content.deliveryFeeKobo)} nationwide`
              }
            />
            <Choice
              name="fulfilment"
              value="pickup"
              checked={fulfilment === "pickup"}
              onChange={() => setFulfilment("pickup")}
              icon={<Store className="size-4" aria-hidden />}
              title="Picked up"
              note="Free, from Lagos"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-ink">
            Who is it for?
          </legend>

          <Text name="name" label="Full name" autoComplete="name" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Text
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              hint="Your receipt and updates go here."
            />
            <Text
              name="phone"
              label="Phone"
              type="tel"
              autoComplete="tel"
              required
            />
          </div>
        </fieldset>

        {fulfilment === "shipping" && (
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-ink">
              Where is it going?
            </legend>

            <Text
              name="line1"
              label="Street address"
              autoComplete="address-line1"
              required
            />
            <Text
              name="line2"
              label="Apartment, floor, landmark"
              autoComplete="address-line2"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Text
                name="city"
                label="City"
                autoComplete="address-level2"
                required
              />
              <Text
                name="state"
                label="State"
                autoComplete="address-level1"
                required
              />
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="text-sm font-semibold text-ink">
            Anything we should know?
          </legend>
          <textarea
            name="note"
            rows={3}
            placeholder="Delivery instructions, a gift note, a preferred day…"
            className="mt-3 w-full rounded-2xl bg-canvas-deep px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl bg-canvas-deep/60 p-5">
          <h2 className="text-sm font-semibold text-ink">
            Your order
            <span className="ml-1.5 font-normal text-ink-muted tabular-nums">
              ({count})
            </span>
          </h2>

          <ul className="mt-4 space-y-3">
            {bag.map((line) => (
              <li key={lineKey(line)} className="flex gap-3">
                <Media
                  url={line.image}
                  alt=""
                  className="size-14 shrink-0 rounded-xl bg-canvas"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {line.name}
                  </p>
                  <p className="text-xs text-ink-secondary">
                    {[
                      line.color,
                      line.size ? `UK ${line.size}` : null,
                      `×${line.quantity}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <p className="text-[13px] font-semibold text-ink tabular-nums">
                  {formatNairaShort(line.priceKobo * line.quantity)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-secondary">Subtotal</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatNairaShort(subtotalKobo)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-secondary">
                {fulfilment === "pickup" ? "Pickup" : "Delivery"}
              </dt>
              <dd className="font-medium text-ink tabular-nums">
                {shipping === 0 ? "Free" : formatNairaShort(shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="font-semibold text-ink tabular-nums">
                {formatNairaShort(total)}
              </dd>
            </div>
          </dl>

          {state.ok === false && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-critical-soft px-3 py-2.5 text-[13px] text-critical"
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || state.ok === true}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-noir text-sm font-semibold text-white transition hover:bg-brand disabled:opacity-60"
          >
            {pending || state.ok === true ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Lock className="size-4" aria-hidden />
            )}
            {pending || state.ok === true
              ? "Taking you to payment…"
              : `Pay ${formatNairaShort(total)}`}
          </button>

          <p className="mt-3 text-center text-xs text-ink-muted">
            Card, bank transfer and USSD, handled by Paystack. We never see your
            card details.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Choice({
  name,
  value,
  checked,
  onChange,
  icon,
  title,
  note,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  title: string;
  note: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl p-4 transition",
        checked
          ? "bg-canvas ring-2 ring-noir"
          : "bg-canvas-deep/60 ring-1 ring-inset ring-line hover:ring-line-strong",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          checked ? "bg-noir text-white" : "bg-canvas text-ink-secondary",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-xs text-ink-secondary">{note}</span>
      </span>
    </label>
  );
}

function Text({
  name,
  label,
  hint,
  ...props
}: React.ComponentPropsWithoutRef<"input"> & {
  name: string;
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-[13px] font-medium text-ink-secondary"
      >
        {label}
        {props.required && <span className="ml-0.5 text-critical">*</span>}
      </label>
      <input
        id={name}
        name={name}
        className="mt-1.5 h-12 w-full rounded-2xl bg-canvas-deep px-4 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
        {...props}
      />
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
