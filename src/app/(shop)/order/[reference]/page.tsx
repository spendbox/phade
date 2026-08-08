import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock, MapPin, Package, Store } from "lucide-react";

import { ClearBag } from "@/components/shop/clear-bag";
import { Media } from "@/components/shop/media";
import { formatLongDate, formatNairaShort } from "@/lib/format";
import {
  isPaystackConfigured,
  verifyTransaction,
} from "@/lib/paystack";
import { recordTransaction } from "@/lib/record-payment";
import { getOrderByReference } from "@/lib/shop-queries";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false },
};

/**
 * Where a shopper lands after paying.
 *
 * Paystack sends them back here the moment the payment closes, which is
 * usually before the webhook has been delivered — so rather than showing a
 * pending order and hoping, the page asks Paystack directly and records the
 * answer through exactly the same path the webhook uses. Whichever arrives
 * first, the result is one payment record and one paid order.
 */
export default async function OrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  let order = await getOrderByReference(reference);
  if (!order) notFound();

  if (order.status === "pending" && isPaystackConfigured()) {
    const supabase = getSupabase();
    try {
      const transaction = await verifyTransaction(reference);
      if (supabase) await recordTransaction(supabase, transaction);
      order = (await getOrderByReference(reference)) ?? order;
    } catch {
      // Not paid yet, or Paystack is unreachable. The webhook will settle it,
      // and the page below says as much rather than claiming anything.
    }
  }

  const paid = order.status !== "pending" && order.status !== "cancelled";
  const items = order.items ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {paid && <ClearBag />}

      <div className="rounded-3xl bg-canvas-deep/60 p-6 text-center sm:p-10">
        <span
          className={
            paid
              ? "mx-auto flex size-14 items-center justify-center rounded-full bg-good text-white"
              : "mx-auto flex size-14 items-center justify-center rounded-full bg-warning text-white"
          }
        >
          {paid ? (
            <Check className="size-7" aria-hidden />
          ) : (
            <Clock className="size-7" aria-hidden />
          )}
        </span>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {paid ? "Thank you — that's ordered" : "Order received"}
        </h1>

        <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-ink-secondary">
          {paid
            ? `We've got your payment and we're getting it ready. A confirmation is on its way to ${order.customer?.email ?? "your email"}.`
            : "We haven't seen the payment land yet. If you've just paid, it usually appears within a minute — refresh this page. Nothing is charged twice."}
        </p>

        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-canvas px-4 py-2 text-[13px] text-ink-secondary">
          Reference
          <span className="font-semibold text-ink tabular-nums">
            {order.reference}
          </span>
        </p>

        <p className="mt-2 text-xs text-ink-muted">
          Placed {formatLongDate(order.placed_at)}
        </p>
      </div>

      <section className="mt-6 rounded-3xl bg-canvas-deep/60 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-ink">What&apos;s coming</h2>

        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <Media
                url={item.image_url}
                alt=""
                className="size-16 shrink-0 rounded-xl bg-canvas"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">{item.name}</p>
                <p className="text-xs text-ink-secondary tabular-nums">
                  ×{item.quantity} · {formatNairaShort(item.unit_price_kobo)}
                </p>
              </div>
              <p className="text-[13px] font-semibold text-ink tabular-nums">
                {formatNairaShort(item.unit_price_kobo * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Subtotal</dt>
            <dd className="font-medium text-ink tabular-nums">
              {formatNairaShort(order.subtotal_kobo)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-secondary">
              {order.fulfilment === "pickup" ? "Pickup" : "Delivery"}
            </dt>
            <dd className="font-medium text-ink tabular-nums">
              {order.shipping_kobo === 0
                ? "Free"
                : formatNairaShort(order.shipping_kobo)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <dt className="font-semibold text-ink">Total</dt>
            <dd className="font-semibold text-ink tabular-nums">
              {formatNairaShort(order.total_kobo)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-3xl bg-canvas-deep/60 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          {order.fulfilment === "pickup" ? (
            <Store className="size-4 text-ink-muted" aria-hidden />
          ) : (
            <MapPin className="size-4 text-ink-muted" aria-hidden />
          )}
          {order.fulfilment === "pickup" ? "Collection" : "Delivering to"}
        </h2>

        {order.fulfilment === "pickup" ? (
          <p className="mt-2 text-sm text-ink-secondary">
            We&apos;ll message {order.customer?.phone ?? "you"} when it&apos;s
            ready to collect.
          </p>
        ) : (
          <address className="mt-2 not-italic text-sm text-ink-secondary">
            {order.customer?.full_name && (
              <span className="block text-ink">{order.customer.full_name}</span>
            )}
            {[
              order.shipping_address?.line1,
              order.shipping_address?.line2,
              order.shipping_address?.city,
              order.shipping_address?.state,
              order.shipping_address?.country,
            ]
              .filter(Boolean)
              .map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            {order.shipping_address?.phone && (
              <span className="mt-1 block">{order.shipping_address.phone}</span>
            )}
          </address>
        )}

        {order.note && (
          <p className="mt-3 flex gap-2 rounded-xl bg-canvas px-3 py-2.5 text-[13px] text-ink-secondary">
            <Package className="size-4 shrink-0 text-ink-muted" aria-hidden />
            {order.note}
          </p>
        )}
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/shop"
          className="inline-flex h-11 items-center rounded-full bg-noir px-6 text-sm font-medium text-white transition hover:bg-brand"
        >
          Keep shopping
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full px-6 text-sm font-medium text-ink-secondary ring-1 ring-inset ring-line-strong transition hover:bg-canvas-deep hover:text-ink"
        >
          Back to the front page
        </Link>
      </div>
    </div>
  );
}
