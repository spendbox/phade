import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Avatar, EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import {
  formatDate,
  formatNaira,
  formatNairaCompact,
  formatNumber,
} from "@/lib/format";
import { getOrders } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ORDER_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; fulfilment?: string }>;
}) {
  const { q, status, fulfilment } = await searchParams;
  const { data: orders, error } = await getOrders({
    search: q,
    status,
    fulfilment,
  });

  const configured = isSupabaseConfigured();

  const paidStatuses = ["paid", "processing", "shipped", "delivered"];
  const revenueKobo = orders
    .filter((order) => paidStatuses.includes(order.status))
    .reduce((sum, order) => sum + order.total_kobo, 0);
  const pending = orders.filter((order) => order.status === "pending").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        description="Every order, newest first."
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      <div className="card grid grid-cols-3 divide-x divide-line">
        <div className="p-4 sm:p-5">
          <StatTile label="Orders shown" value={formatNumber(orders.length)} />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Value"
            value={formatNairaCompact(revenueKobo)}
            hint="Paid and beyond"
          />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Awaiting payment"
            value={formatNumber(pending)}
            hint="Still pending"
          />
        </div>
      </div>

      <FilterBar
        searchPlaceholder="Search by order reference"
        filters={[
          {
            key: "status",
            label: "Status",
            options: ORDER_STATUSES.map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            })),
          },
          {
            key: "fulfilment",
            label: "Type",
            options: [
              { value: "shipping", label: "Shipping" },
              { value: "pickup", label: "Pickup" },
            ],
          },
        ]}
      />

      {orders.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ShoppingBag className="size-5" />}
            title={q || status || fulfilment ? "No matching orders" : "No orders yet"}
            description={
              q || status || fulfilment
                ? "Try a different search or clear the filters."
                : "Orders land here the moment a customer checks out. Paystack payments create them automatically."
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
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Items</th>
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-plane/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        #{order.reference}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <Avatar
                          size="sm"
                          name={
                            order.customer?.full_name ??
                            order.customer?.email ??
                            "Guest"
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-ink">
                            {order.customer?.full_name ?? "Guest"}
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            {order.customer?.email ?? "—"}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 capitalize text-ink-secondary">
                      {order.fulfilment}
                    </td>
                    <td className="px-3 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-secondary">
                      {order.items?.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      ) ?? 0}
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums text-ink">
                      {formatNaira(order.total_kobo)}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-secondary">
                      {formatDate(order.placed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-line md:hidden">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex items-start gap-3 p-4"
                >
                  <Avatar
                    name={
                      order.customer?.full_name ?? order.customer?.email ?? "Guest"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink">
                        #{order.reference}
                      </p>
                      <p className="shrink-0 text-sm font-medium tabular-nums text-ink">
                        {formatNaira(order.total_kobo)}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {order.customer?.full_name ?? "Guest"} ·{" "}
                      {formatDate(order.placed_at)}
                    </p>
                    <div className="mt-1.5">
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
