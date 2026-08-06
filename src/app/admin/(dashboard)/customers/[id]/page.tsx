import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CustomerForm } from "@/components/admin/customer-form";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorNotice } from "@/components/admin/setup-notice";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Panel, StatTile } from "@/components/ui/stat-tile";
import { formatDate, formatLongDate, formatNaira } from "@/lib/format";
import { getCustomer } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await getCustomer(id);
  return { title: data?.customer.full_name ?? data?.customer.email ?? "Customer" };
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, error } = await getCustomer(id);

  if (error) return <ErrorNotice message={error} />;
  if (!data) notFound();

  const { customer, orders } = data;

  const paidStatuses = ["paid", "processing", "shipped", "delivered"];
  const spendKobo = orders
    .filter((order) => paidStatuses.includes(order.status))
    .reduce((sum, order) => sum + order.total_kobo, 0);
  const paidOrders = orders.filter((order) =>
    paidStatuses.includes(order.status),
  ).length;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Customers
      </Link>

      <PageHeader
        title={customer.full_name ?? customer.email}
        description={`Customer since ${formatLongDate(customer.created_at)}`}
      />

      <div className="card grid grid-cols-3 divide-x divide-line">
        <div className="p-4 sm:p-5">
          <StatTile label="Orders" value={String(orders.length)} />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Lifetime spend"
            value={formatNaira(spendKobo)}
            hint={`${paidOrders} paid`}
          />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Average order"
            value={formatNaira(
              paidOrders > 0 ? Math.round(spendKobo / paidOrders) : 0,
            )}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Order history" className="lg:col-span-2" bodyClassName="p-0">
          {orders.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-secondary sm:px-5">
              This customer hasn&apos;t placed an order yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-plane sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        #{order.reference}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {formatDate(order.placed_at)} ·{" "}
                        {order.items?.reduce(
                          (sum, item) => sum + item.quantity,
                          0,
                        ) ?? 0}{" "}
                        item(s)
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

        <Panel title="Details">
          <CustomerForm customer={customer} />
        </Panel>
      </div>
    </div>
  );
}
