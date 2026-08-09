import { Check, Clock, PackageCheck, Truck, X } from "lucide-react";

import { cn } from "@/lib/cn";
import type { Fulfilment, OrderStatus } from "@/lib/types";

/**
 * Where an order has got to.
 *
 * The dashboard already moves an order along — paid, then being made ready,
 * then out for delivery, then done. Until now that was a word only the shop
 * could see, and a customer's only way of asking "where is my dress" was to
 * message and wait. This is the same word, on the page they already have a
 * link to, drawn as the line it actually is.
 *
 * Cancelled and refunded aren't steps on that line, so they don't pretend to
 * be: the line is replaced by what happened instead.
 */

const STEPS = [
  {
    key: "paid",
    title: "Paid",
    note: "Payment received.",
  },
  {
    key: "processing",
    title: "Being packed",
    note: "Your pieces are being checked and wrapped.",
  },
  {
    key: "shipped",
    title: "On its way",
    shipped: "Handed to the courier.",
    pickup: "Ready to collect.",
  },
  {
    key: "delivered",
    title: "Delivered",
    shipped: "Signed for.",
    pickup: "Collected.",
  },
] as const;

/** How far along the line a status sits. Pending is before the first step. */
const REACHED: Record<OrderStatus, number> = {
  pending: -1,
  paid: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1,
  refunded: -1,
};

export function OrderProgress({
  status,
  fulfilment,
}: {
  status: OrderStatus;
  fulfilment: Fulfilment;
}) {
  if (status === "cancelled" || status === "refunded") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-canvas px-4 py-3.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-critical-soft text-critical">
          <X className="size-4" aria-hidden />
        </span>
        <p className="text-[13px] text-ink-secondary">
          <span className="block text-sm font-medium text-ink">
            {status === "cancelled" ? "Cancelled" : "Refunded"}
          </span>
          {status === "cancelled"
            ? "This order was cancelled. Nothing further will be charged."
            : "The money for this order has been sent back to your card."}
        </p>
      </div>
    );
  }

  const at = REACHED[status];
  const collecting = fulfilment === "pickup";

  return (
    <ol className="space-y-0">
      {STEPS.map((step, index) => {
        const done = index <= at;
        const now = index === at;
        const last = index === STEPS.length - 1;

        const note =
          "note" in step
            ? step.note
            : collecting
              ? step.pickup
              : step.shipped;

        const title =
          collecting && step.key === "shipped" ? "Ready to collect" : step.title;

        return (
          <li key={step.key} className="flex gap-3">
            {/* The rail: a dot for each step and the thread between them. */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
                  done
                    ? "bg-noir text-white"
                    : "bg-canvas text-ink-muted ring-1 ring-inset ring-line",
                )}
              >
                {done ? (
                  step.key === "shipped" ? (
                    <Truck className="size-3.5" aria-hidden />
                  ) : step.key === "delivered" ? (
                    <PackageCheck className="size-3.5" aria-hidden />
                  ) : (
                    <Check className="size-3.5" aria-hidden />
                  )
                ) : (
                  <Clock className="size-3.5" aria-hidden />
                )}
              </span>
              {!last && (
                <span
                  className={cn(
                    "w-px flex-1",
                    index < at ? "bg-noir" : "bg-line",
                  )}
                />
              )}
            </div>

            <div className={cn("min-w-0 pb-5", last && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  done ? "text-ink" : "text-ink-muted",
                )}
              >
                {title}
                {now && (
                  <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                    Now
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-secondary">{note}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
