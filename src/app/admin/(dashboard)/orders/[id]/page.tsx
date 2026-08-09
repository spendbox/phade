import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Truck } from "lucide-react";

import { OrderNote, OrderStatusSelect } from "@/components/admin/order-controls";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorNotice } from "@/components/admin/setup-notice";
import { PaymentStatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/stat-tile";
import { cn } from "@/lib/cn";
import { formatDateTime, formatNaira } from "@/lib/format";
import { getOrder } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await getOrder(id);
  return { title: data ? `Order #${data.reference}` : "Order" };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: order, error } = await getOrder(id);

  if (error) return <ErrorNotice message={error} />;
  if (!order) notFound();

  const address = order.shipping_address;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Orders
      </Link>

      <PageHeader
        title={`Order #${order.reference}`}
        description={`${formatDateTime(order.placed_at)} · ${itemCount} item${
          itemCount === 1 ? "" : "s"
        } · ${order.fulfilment === "pickup" ? "Pickup" : "Shipping"}`}
        actions={<OrderStatusSelect orderId={order.id} status={order.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Items" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt=""
                      className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-inset ring-line"
                    />
                  ) : (
                    <span className="size-11 shrink-0 rounded-lg bg-plane ring-1 ring-inset ring-line" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {item.name}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {item.quantity} × {formatNaira(item.unit_price_kobo)}
                    </p>
                  </div>

                  <span className="shrink-0 text-sm font-medium tabular-nums text-ink">
                    {formatNaira(item.unit_price_kobo * item.quantity)}
                  </span>
                </li>
              ))}

              {order.items.length === 0 && (
                <li className="px-5 py-6 text-sm text-ink-secondary">
                  No line items recorded for this order.
                </li>
              )}
            </ul>

            <dl className="space-y-2 border-t border-line px-4 py-4 text-sm sm:px-5">
              <div className="flex justify-between">
                <dt className="text-ink-secondary">Subtotal</dt>
                <dd className="tabular-nums text-ink">
                  {formatNaira(order.subtotal_kobo)}
                </dd>
              </div>
              {order.discount_kobo > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="min-w-0 truncate text-ink-secondary">
                    Coupon{order.discount_code ? ` · ${order.discount_code}` : ""}
                  </dt>
                  <dd className="shrink-0 tabular-nums text-good-text">
                    −{formatNaira(order.discount_kobo)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-secondary">
                  {order.fulfilment === "pickup" ? "Pickup" : "Shipping"}
                </dt>
                <dd className="tabular-nums text-ink">
                  {formatNaira(order.shipping_kobo)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatNaira(order.total_kobo)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Payments" bodyClassName="p-0">
            {order.payments.length === 0 ? (
              <p className="px-4 py-5 text-sm text-ink-secondary sm:px-5">
                No payment recorded against this order yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {order.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {payment.reference}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {payment.channel ?? "Paystack"} ·{" "}
                        {formatDateTime(payment.paid_at ?? payment.created_at)}
                      </p>
                    </div>
                    <PaymentStatusBadge status={payment.status} />
                    <span className="shrink-0 text-sm font-medium tabular-nums text-ink">
                      {formatNaira(payment.amount_kobo)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Internal note">
            <OrderNote orderId={order.id} note={order.note} />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Customer">
            {order.customer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={order.customer.full_name ?? order.customer.email}
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/admin/customers/${order.customer.id}`}
                      className="block truncate text-sm font-medium text-ink hover:underline"
                    >
                      {order.customer.full_name ?? "Customer"}
                    </Link>
                    <p className="truncate text-xs text-ink-muted">
                      Customer since{" "}
                      {formatDateTime(order.customer.created_at)}
                    </p>
                  </div>
                </div>

                <a
                  href={`mailto:${order.customer.email}`}
                  className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink"
                >
                  <Mail className="size-4 shrink-0 text-ink-muted" />
                  <span className="truncate">{order.customer.email}</span>
                </a>

                {order.customer.phone && (
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink"
                  >
                    <Phone className="size-4 shrink-0 text-ink-muted" />
                    <span className="truncate">{order.customer.phone}</span>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-secondary">
                Guest checkout — no customer record linked.
              </p>
            )}
          </Panel>

          <Panel
            title={order.fulfilment === "pickup" ? "Pickup" : "Delivery address"}
          >
            {address ? (
              <address className="flex gap-2 text-sm not-italic leading-relaxed text-ink-secondary">
                <Truck className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                <span>
                  {[
                    address.line1,
                    address.line2,
                    address.area,
                    address.city,
                    address.state,
                    address.country,
                  ]
                    .filter(Boolean)
                    .map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  {/* Every number the customer gave, so a courier who can't
                      get through has somewhere else to try. */}
                  {(address.phones ?? [address.phone])
                    .filter((line): line is string => Boolean(line))
                    .map((line, index) => (
                      <a
                        key={line}
                        href={`tel:${line.replace(/[^\d+]/g, "")}`}
                        className={cn(
                          "block text-ink-muted hover:text-ink",
                          index === 0 && "mt-1",
                        )}
                      >
                        {line}
                        {index > 0 && (
                          <span className="ml-1.5 text-xs">(alternate)</span>
                        )}
                      </a>
                    ))}
                </span>
              </address>
            ) : order.shipping_address?.pickup ? (
              <address className="text-sm not-italic text-ink-secondary">
                <span className="block font-medium text-ink">
                  Collecting from {order.shipping_address.pickup.name}
                </span>
                {order.shipping_address.pickup.address}
                {order.shipping_address.phone && (
                  <a
                    href={`tel:${order.shipping_address.phone.replace(/[^\d+]/g, "")}`}
                    className="mt-1 block text-ink-muted hover:text-ink"
                  >
                    {order.shipping_address.phone}
                  </a>
                )}
              </address>
            ) : (
              <p className="text-sm text-ink-secondary">
                {order.fulfilment === "pickup"
                  ? "Customer is collecting this order in store."
                  : "No address recorded."}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
