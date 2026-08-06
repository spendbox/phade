import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import type { StatusSlice } from "@/lib/queries";

/**
 * Order status mix. Status colours are reserved (never reused as a series
 * colour) and always ship beside their label, so nothing is carried by hue
 * alone. Segments are separated by a 2px gap in the surface colour rather than
 * by a stroke.
 */

const STATUS_FILL: Record<OrderStatus, string> = {
  paid: "bg-good",
  delivered: "bg-good",
  processing: "bg-series",
  shipped: "bg-series",
  pending: "bg-warning",
  refunded: "bg-serious",
  cancelled: "bg-critical",
};

const STATUS_DOT: Record<OrderStatus, string> = STATUS_FILL;

export function StatusMeter({ slices }: { slices: StatusSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  if (total === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-secondary">
        No orders in this period yet.
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-plane">
        {slices.map((slice) => (
          <div
            key={slice.status}
            className={cn("h-full rounded-full", STATUS_FILL[slice.status])}
            style={{ width: `${(slice.count / total) * 100}%` }}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-2.5">
        {slices.map((slice) => (
          <li
            key={slice.status}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  STATUS_DOT[slice.status],
                )}
              />
              <span className="truncate capitalize text-ink-secondary">
                {slice.status}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="tabular-nums text-ink-muted">
                {formatNumber(slice.count)}
              </span>
              <span className="w-11 text-right font-medium tabular-nums text-ink">
                {((slice.count / total) * 100).toFixed(0)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Top products — horizontal bars in one hue. Identity comes from the row label,
 * so a single series colour is correct here; the value rides the bar's tip.
 */
export function BarList({
  items,
}: {
  items: { label: string; value: number; display: string }[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{item.label}</span>
            <span className="shrink-0 tabular-nums text-ink-secondary">
              {item.display}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-plane">
            <div
              className="h-full rounded-full bg-series"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
