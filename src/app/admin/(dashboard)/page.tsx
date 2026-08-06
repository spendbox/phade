import Link from "next/link";
import { AlertTriangle, ArrowUpRight, PackageSearch } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { BarList, StatusMeter } from "@/components/admin/status-meter";
import { OrderStatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Avatar, EmptyState } from "@/components/ui/empty-state";
import { Panel, StatTile } from "@/components/ui/stat-tile";
import { cn } from "@/lib/cn";
import {
  formatDate,
  formatNaira,
  formatNairaCompact,
  formatNumber,
} from "@/lib/format";
import { getDashboard } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

function growth(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = RANGES.some((range) => String(range.days) === daysParam)
    ? Number(daysParam)
    : 30;

  const { data, error } = await getDashboard(days);
  const configured = isSupabaseConfigured();
  const periodLabel = `vs previous ${days} days`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Revenue, orders and stock at a glance."
        actions={
          <div className="flex items-center gap-1 rounded-lg bg-surface p-1 shadow-[0_0_0_1px_rgb(11_11_12_/_0.06)]">
            {RANGES.map((range) => (
              <Link
                key={range.days}
                href={`/admin?days=${range.days}`}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                  range.days === days
                    ? "bg-ink text-white"
                    : "text-ink-secondary hover:bg-plane",
                )}
              >
                {range.label}
              </Link>
            ))}
          </div>
        }
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      {/* Headline figures */}
      <div className="card grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        <div className="border-b border-line p-4 sm:border-b-0 sm:p-5">
          <StatTile
            label="Revenue"
            value={formatNairaCompact(data.revenueKobo)}
            delta={{
              value: growth(data.revenueKobo, data.previousRevenueKobo),
              period: periodLabel,
            }}
          />
        </div>
        <div className="border-b border-l border-line p-4 sm:border-b-0 sm:border-l-0 sm:p-5">
          <StatTile
            label="Orders"
            value={formatNumber(data.orderCount)}
            delta={{
              value: growth(data.orderCount, data.previousOrderCount),
              period: periodLabel,
            }}
          />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Average order"
            value={formatNairaCompact(data.averageOrderKobo)}
            hint={`${formatNumber(data.pendingOrders)} awaiting payment`}
          />
        </div>
        <div className="border-l border-line p-4 sm:border-l-0 sm:p-5">
          <StatTile
            label="Customers"
            value={formatNumber(data.customerCount)}
            hint={`${formatNumber(data.newCustomerCount)} new this period`}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Revenue */}
        <Panel
          className="xl:col-span-2"
          title="Revenue"
          action={
            <span className="text-xs text-ink-muted">
              Successful Paystack payments · last {days} days
            </span>
          }
          bodyClassName="p-2 pt-4 sm:p-4"
        >
          {data.series.some((point) => point.revenueKobo > 0) ? (
            <RevenueChart data={data.series} />
          ) : (
            <EmptyState
              title="No revenue recorded yet"
              description="Successful Paystack payments will chart here once they start coming in."
            />
          )}
        </Panel>

        {/* Order status */}
        <Panel title="Order status">
          <StatusMeter slices={data.statusBreakdown} />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Recent orders */}
        <Panel
          className="xl:col-span-2"
          title="Recent orders"
          action={
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink"
            >
              View all <ArrowUpRight className="size-3.5" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {data.recentOrders.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="size-5" />}
              title="No orders yet"
              description="Orders appear here as soon as customers start checking out."
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-plane sm:px-5"
                  >
                    <Avatar
                      name={order.customer?.full_name ?? order.customer?.email ?? "?"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {order.customer?.full_name ??
                          order.customer?.email ??
                          "Guest"}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        #{order.reference} · {formatDate(order.placed_at)}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                    <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums text-ink">
                      {formatNaira(order.total_kobo)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          {/* Top sellers */}
          <Panel title="Top sellers">
            {data.topProducts.length === 0 ? (
              <p className="py-4 text-sm text-ink-secondary">
                No sales recorded in this period.
              </p>
            ) : (
              <BarList
                items={data.topProducts.map((product) => ({
                  label: product.name,
                  value: product.revenueKobo,
                  display: formatNairaCompact(product.revenueKobo),
                }))}
              />
            )}
          </Panel>

          {/* Low stock */}
          <Panel
            title="Needs restocking"
            action={
              <Link
                href="/admin/inventory?view=low"
                className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink"
              >
                Inventory <ArrowUpRight className="size-3.5" />
              </Link>
            }
            bodyClassName="p-0"
          >
            {data.lowStock.length === 0 ? (
              <p className="px-4 py-5 text-sm text-ink-secondary sm:px-5">
                Every product is comfortably in stock.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.lowStock.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center gap-3 px-4 py-3 sm:px-5"
                  >
                    <AlertTriangle
                      className={cn(
                        "size-4 shrink-0",
                        product.stock <= 0 ? "text-critical" : "text-warning",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">
                        {product.name}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {product.stock <= 0
                          ? "Out of stock"
                          : `${product.stock} left · reorder at ${product.low_stock_threshold}`}
                      </p>
                    </div>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className={buttonClass("secondary", "sm")}
                    >
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
