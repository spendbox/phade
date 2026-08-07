import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { FilterBar } from "@/components/admin/filter-bar";
import { MediaThumb } from "@/components/admin/media-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { Badge } from "@/components/ui/badge";
import { Avatar, EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import {
  formatDateTime,
  formatNaira,
  formatNairaCompact,
  formatNumber,
  formatRelative,
} from "@/lib/format";
import { ABANDONED_AFTER_MINUTES, getCarts, type CartRow } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkouts" };

export default async function CheckoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const { data: carts, error } = await getCarts({ search: q, status });

  const configured = isSupabaseConfigured();
  const tracking = Boolean(process.env.STOREFRONT_API_KEY);

  const abandoned = carts.filter((cart) => cart.isAbandoned);
  const abandonedValue = abandoned.reduce(
    (sum, cart) => sum + cart.subtotal_kobo,
    0,
  );
  const converted = carts.filter((cart) => cart.status === "converted").length;
  const recoveryRate =
    converted + abandoned.length > 0
      ? (converted / (converted + abandoned.length)) * 100
      : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Checkouts"
        description="Carts that were started but never paid for — and the ones that made it."
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      {configured && !tracking && (
        <SetupNotice
          title="Turn on cart tracking"
          description="Set STOREFRONT_API_KEY in Vercel, then have the storefront POST each cart change to /api/cart with that key in an x-storefront-key header. Until then this endpoint stays closed and no carts are recorded."
        />
      )}

      <div className="card grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        <div className="border-b border-line p-4 sm:border-b-0 sm:p-5">
          <StatTile
            label="Abandoned"
            value={formatNumber(abandoned.length)}
            hint={`Idle over ${ABANDONED_AFTER_MINUTES} min`}
          />
        </div>
        <div className="border-b border-l border-line p-4 sm:border-b-0 sm:border-l-0 sm:p-5">
          <StatTile
            label="Left in carts"
            value={formatNairaCompact(abandonedValue)}
            hint="Value not checked out"
          />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Completed"
            value={formatNumber(converted)}
            hint="Became an order"
          />
        </div>
        <div className="border-l border-line p-4 sm:border-l-0 sm:p-5">
          <StatTile
            label="Completion rate"
            value={`${recoveryRate.toFixed(0)}%`}
            hint="Of finished carts"
          />
        </div>
      </div>

      <FilterBar
        searchPlaceholder="Search by email"
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "active", label: "In progress" },
              { value: "abandoned", label: "Abandoned" },
              { value: "converted", label: "Completed" },
            ],
          },
        ]}
      />

      {carts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ShoppingCart className="size-5" />}
            title={q || status ? "No matching checkouts" : "No checkouts yet"}
            description={
              q || status
                ? "Try a different search or clear the filters."
                : "Once the storefront posts cart activity here, every unfinished checkout shows up with what was left behind."
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="table-scroll hidden md:block">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="table-head">
                <tr className="text-left text-xs font-medium text-ink-secondary">
                  <th className="px-5 py-3 font-medium">Shopper</th>
                  <th className="px-3 py-3 font-medium">In the cart</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Value</th>
                  <th className="px-5 py-3 text-right font-medium">
                    Last activity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {carts.map((cart) => (
                  <tr key={cart.id} className="hover:bg-plane/60">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5">
                        <Avatar size="sm" name={cart.email ?? "Guest"} />
                        <span className="min-w-0">
                          <span className="block truncate text-ink">
                            {cart.email ?? "Anonymous"}
                          </span>
                          {cart.phone && (
                            <span className="block truncate text-xs text-ink-muted">
                              {cart.phone}
                            </span>
                          )}
                        </span>
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <CartItems cart={cart} />
                    </td>

                    <td className="px-3 py-3">
                      <CartStatusBadge cart={cart} />
                    </td>

                    <td className="px-3 py-3 text-right font-medium tabular-nums text-ink">
                      {formatNaira(cart.subtotal_kobo)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-3 text-right text-ink-secondary">
                      {formatDateTime(cart.last_active_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-line md:hidden">
            {carts.map((cart) => (
              <li key={cart.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {cart.email ?? "Anonymous"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {formatRelative(cart.last_active_at)}
                    </p>
                  </div>
                  <CartStatusBadge cart={cart} />
                </div>

                <div className="mt-2.5">
                  <CartItems cart={cart} />
                </div>

                <p className="mt-2 text-sm font-medium tabular-nums text-ink">
                  {formatNaira(cart.subtotal_kobo)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CartItems({ cart }: { cart: CartRow }) {
  if (cart.items.length === 0) {
    return <span className="text-xs text-ink-muted">Empty</span>;
  }

  return (
    <span className="flex items-center gap-2">
      <span className="flex -space-x-2">
        {cart.items.slice(0, 4).map((item, index) => (
          <MediaThumb
            key={`${item.product_id ?? item.name}-${index}`}
            url={item.image_url}
            className="size-8 rounded-md ring-2 ring-surface"
          />
        ))}
      </span>
      <span className="truncate text-xs text-ink-secondary">
        {cart.items.reduce((sum, item) => sum + item.quantity, 0)} item
        {cart.items.length === 1 ? "" : "s"} · {cart.items[0].name}
        {cart.items.length > 1 ? ` +${cart.items.length - 1}` : ""}
      </span>
    </span>
  );
}

function CartStatusBadge({ cart }: { cart: CartRow }) {
  if (cart.status === "converted") {
    return cart.order_id ? (
      <Link href={`/admin/orders/${cart.order_id}`}>
        <Badge tone="good">Completed</Badge>
      </Link>
    ) : (
      <Badge tone="good">Completed</Badge>
    );
  }
  if (cart.isAbandoned) return <Badge tone="critical">Abandoned</Badge>;
  return <Badge tone="warning">In progress</Badge>;
}
