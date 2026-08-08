"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Lock, ShoppingBag, Store, Truck, X } from "lucide-react";

import {
  placeOrder,
  tryCoupon,
  type CheckoutState,
} from "@/app/(shop)/checkout/actions";
import { Media } from "@/components/shop/media";
import { useShop } from "@/components/shop/shop-provider";
import { usePersistent } from "@/lib/browser-store";
import { cn } from "@/lib/cn";
import { formatNairaShort } from "@/lib/format";
import { lineKey } from "@/lib/shop";
import {
  detailsFrom,
  detailsStore,
  hasDetails,
  NO_DETAILS,
  safeDetails,
} from "@/lib/shopper-details";
import {
  cheapestFee,
  NIGERIAN_STATES,
  quoteDelivery,
  type ShippingSettings,
} from "@/lib/shipping";

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
export function CheckoutForm({ shipping }: { shipping: ShippingSettings }) {
  const { bag, ready } = useShop();

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

  // Mounted only once the browser's own state is readable, so the fields can
  // be uncontrolled and still open with what was typed last time.
  return <CheckoutFields shipping={shipping} />;
}

function CheckoutFields({ shipping }: { shipping: ShippingSettings }) {
  const { bag, subtotalKobo, cartToken, count, say } = useShop();
  const [state, formAction, pending] = useActionState(placeOrder, initial);

  const stored = safeDetails(usePersistent(detailsStore));
  const [fulfilment, setFulfilment] = useState<"shipping" | "pickup">(
    shipping.pickupEnabled ? stored.fulfilment : "shipping",
  );
  // The delivery charge depends on where it's going, so the state field is the
  // one input on this form that changes the total as you use it.
  const [state_, setState] = useState(stored.state);

  // The bag, as the server will read it. It is also what a coupon is judged
  // against, so the two always describe the same order.
  const lines = JSON.stringify(
    bag.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      color: line.color,
      size: line.size,
    })),
  );

  const coupon = useCoupon(lines);

  const cheapest = cheapestFee(shipping);
  // Delivery is quoted on the merchandise total, before the coupon — the same
  // way the server prices it, so this figure is never a surprise.
  const quote = quoteDelivery(shipping, subtotalKobo, {
    fulfilment,
    state: state_,
  });
  const total = subtotalKobo - (coupon.applied?.amountKobo ?? 0) + quote.feeKobo;

  // Paystack is a different origin, so this is a real navigation rather than a
  // router push. Internal redirects go the same way for one code path.
  useEffect(() => {
    if (state.ok === true) window.location.assign(state.redirect);
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        // Captured here rather than on success: a payment that fails should
        // still leave the shopper with their details filled in next time.
        detailsStore.set(detailsFrom(new FormData(event.currentTarget)));
      }}
      className="grid gap-8 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:px-8"
    >
      <input type="hidden" name="cart_token" value={cartToken} />
      <input type="hidden" name="lines" value={lines} />
      {coupon.applied && (
        <input type="hidden" name="coupon" value={coupon.applied.code} />
      )}

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
                fulfilment === "pickup"
                  ? "Anywhere in Nigeria"
                  : quote.free
                    ? "Free on this order"
                    : state_
                      ? `${formatNairaShort(quote.feeKobo)} to ${state_}`
                      : `From ${formatNairaShort(cheapest)} — pick a state below`
              }
            />
            {shipping.pickupEnabled && (
              <Choice
                name="fulfilment"
                value="pickup"
                checked={fulfilment === "pickup"}
                onChange={() => setFulfilment("pickup")}
                icon={<Store className="size-4" aria-hidden />}
                title="Picked up"
                note="Free"
              />
            )}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <legend className="text-sm font-semibold text-ink">
              Who is it for?
            </legend>

            {hasDetails(stored) && (
              <p className="text-xs text-ink-muted">
                Filled in from last time ·{" "}
                <button
                  type="button"
                  onClick={() => {
                    detailsStore.set(NO_DETAILS);
                    say("Details forgotten on this device");
                  }}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Forget them
                </button>
              </p>
            )}
          </div>

          <Text
            name="name"
            label="Full name"
            autoComplete="name"
            required
            defaultValue={stored.name}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Text
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              hint="Your receipt and updates go here."
              defaultValue={stored.email}
            />
            <Text
              name="phone"
              label="Phone"
              type="tel"
              autoComplete="tel"
              required
              defaultValue={stored.phone}
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
              defaultValue={stored.line1}
            />
            <Text
              name="line2"
              label="Apartment, floor, landmark"
              autoComplete="address-line2"
              defaultValue={stored.line2}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Text
                name="city"
                label="City"
                autoComplete="address-level2"
                required
                defaultValue={stored.city}
              />
              <div>
                <label
                  htmlFor="state"
                  className="block text-[13px] font-medium text-ink-secondary"
                >
                  State<span className="ml-0.5 text-critical">*</span>
                </label>
                <select
                  id="state"
                  name="state"
                  required
                  autoComplete="address-level1"
                  value={state_}
                  onChange={(event) => setState(event.target.value)}
                  className="mt-1.5 h-12 w-full rounded-2xl bg-canvas-deep px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Choose a state</option>
                  {NIGERIAN_STATES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ink-muted">
                  Delivery is priced from here.
                </p>
              </div>
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

          <CouponField coupon={coupon} />

          <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-secondary">Subtotal</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatNairaShort(subtotalKobo)}
              </dd>
            </div>
            {coupon.applied && (
              <div className="flex justify-between gap-3">
                <dt className="min-w-0 truncate text-ink-secondary">
                  {coupon.applied.name}
                  <span className="text-ink-muted"> · {coupon.applied.code}</span>
                </dt>
                <dd className="shrink-0 font-medium text-good-text tabular-nums">
                  −{formatNairaShort(coupon.applied.amountKobo)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="min-w-0 text-ink-secondary">
                {fulfilment === "pickup"
                  ? "Pickup"
                  : state_
                    ? `Delivery · ${state_}`
                    : "Delivery"}
              </dt>
              <dd className="shrink-0 font-medium text-ink tabular-nums">
                {fulfilment === "shipping" && !state_
                  ? `from ${formatNairaShort(cheapest)}`
                  : quote.free
                    ? "Free"
                    : formatNairaShort(quote.feeKobo)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="font-semibold text-ink tabular-nums">
                {formatNairaShort(total)}
              </dd>
            </div>
          </dl>

          {fulfilment === "pickup" && shipping.pickupNote && (
            <p className="mt-4 rounded-xl bg-canvas px-3 py-2.5 text-[13px] text-ink-secondary">
              {shipping.pickupNote}
            </p>
          )}

          {quote.toFreeKobo !== null && quote.toFreeKobo > 0 && (
            <p className="mt-4 rounded-xl bg-brand-soft px-3 py-2.5 text-[13px] text-brand">
              {formatNairaShort(quote.toFreeKobo)} more and delivery is free.
            </p>
          )}

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
            card details. Your name and address stay on this device so the next
            checkout is quicker.
          </p>
        </div>
      </aside>
    </form>
  );
}

type Applied = { code: string; name: string; amountKobo: number };

type Coupon = ReturnType<typeof useCoupon>;

/**
 * A coupon code, checked by the shop rather than by the browser.
 *
 * The code alone is state; what it is worth is always the server's answer to
 * this exact bag. So it is re-checked whenever the bag changes — a shopper who
 * opens the drawer and drops a dress that the code depended on is told, rather
 * than finding out at the payment page that the total moved.
 */
function useCoupon(lines: string) {
  // Every press of Apply is its own attempt, timestamp and all, so retyping a
  // code that failed a moment ago actually asks again.
  const [attempt, setAttempt] = useState<{ code: string; at: number } | null>(
    null,
  );
  const [applied, setApplied] = useState<Applied | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!attempt) return;

    let cancelled = false;

    void tryCoupon({ code: attempt.code, lines })
      .then((result) => {
        if (cancelled) return;
        setApplied(result.ok ? result : null);
        setError(result.ok ? null : result.error);
      })
      .catch(() => {
        if (cancelled) return;
        setApplied(null);
        setError("We couldn't check that code just now.");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, lines]);

  return {
    applied,
    error,
    checking,
    apply(raw: string) {
      const code = raw.trim().toUpperCase();
      if (!code) {
        setError("Type a code first.");
        return;
      }
      setAttempt({ code, at: Date.now() });
      setError(null);
      setChecking(true);
    },
    clear() {
      setAttempt(null);
      setApplied(null);
      setError(null);
      setChecking(false);
    },
  };
}

/** Where a code from a sale gets typed in. */
function CouponField({ coupon }: { coupon: Coupon }) {
  const field = useRef<HTMLInputElement>(null);
  const { applied, error, checking } = coupon;

  if (applied) {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-brand-soft px-3 py-2.5">
        <p className="min-w-0 flex-1 text-[13px] text-brand">
          <span className="font-semibold">{applied.code}</span> applied ·{" "}
          {formatNairaShort(applied.amountKobo)} off
        </p>
        <button
          type="button"
          onClick={coupon.clear}
          aria-label={`Remove coupon ${applied.code}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-brand transition hover:bg-canvas"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  const send = () => coupon.apply(field.current?.value ?? "");

  return (
    <div className="mt-5">
      <label
        htmlFor="coupon"
        className="block text-[13px] font-medium text-ink-secondary"
      >
        Coupon code
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="coupon"
          ref={field}
          name="coupon_input"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="From a sale or a post"
          // Enter inside a form submits it, and this field is a guest in the
          // checkout form — so Enter applies the code instead of paying.
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            send();
          }}
          className="h-11 min-w-0 flex-1 rounded-2xl bg-canvas-deep px-4 text-sm uppercase tracking-wide text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button
          type="button"
          onClick={send}
          disabled={checking}
          className="h-11 shrink-0 rounded-full px-4 text-sm font-medium text-ink ring-1 ring-inset ring-line-strong transition hover:bg-canvas-deep disabled:opacity-60"
        >
          {checking ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            "Apply"
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-critical">
          {error}
        </p>
      )}
    </div>
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
