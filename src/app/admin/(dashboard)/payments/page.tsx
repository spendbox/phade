import Link from "next/link";
import { CreditCard } from "lucide-react";

import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { SyncButton } from "@/components/admin/sync-button";
import { BarList } from "@/components/admin/status-meter";
import { PaymentStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, StatTile } from "@/components/ui/stat-tile";
import {
  formatDateTime,
  formatNaira,
  formatNairaCompact,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { getPayments, summarisePayments } from "@/lib/queries";
import { isPaystackConfigured } from "@/lib/paystack";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const { data: payments, error } = await getPayments({ search: q, status });

  const totals = summarisePayments(payments);
  const configured = isSupabaseConfigured();
  const paystackReady = isPaystackConfigured();

  const attempted = totals.successCount + totals.failedCount;
  const successRate = attempted > 0 ? (totals.successCount / attempted) * 100 : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        description="Revenue collected through Paystack, in naira."
        actions={<SyncButton enabled={paystackReady && configured} />}
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      {configured && !paystackReady && (
        <SetupNotice
          title="Connect Paystack to track revenue"
          description="Add PAYSTACK_SECRET_KEY in Vercel → Settings → Environment Variables, then point your Paystack webhook at /api/paystack/webhook. Use “Sync from Paystack” to backfill past transactions."
        />
      )}

      <div className="card grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        <div className="border-b border-line p-4 sm:border-b-0 sm:p-5">
          <StatTile
            label="Collected"
            value={formatNairaCompact(totals.successKobo)}
            hint={`${formatNumber(totals.successCount)} successful payments`}
          />
        </div>
        <div className="border-b border-l border-line p-4 sm:border-b-0 sm:border-l-0 sm:p-5">
          <StatTile
            label="Paystack fees"
            value={formatNairaCompact(totals.feesKobo)}
            hint="Deducted at source"
          />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Net revenue"
            value={formatNairaCompact(totals.netKobo)}
            hint="After fees"
          />
        </div>
        <div className="border-l border-line p-4 sm:border-l-0 sm:p-5">
          <StatTile
            label="Success rate"
            value={formatPercent(successRate, 0)}
            hint={`${formatNumber(totals.failedCount)} failed or abandoned`}
          />
        </div>
      </div>

      <FilterBar
        searchPlaceholder="Search reference or email"
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "success", label: "Successful" },
              { value: "failed", label: "Failed" },
              { value: "abandoned", label: "Abandoned" },
              { value: "refunded", label: "Refunded" },
            ],
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          {payments.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="size-5" />}
              title={q || status ? "No matching payments" : "No payments yet"}
              description={
                q || status
                  ? "Try a different search or clear the filters."
                  : "Successful Paystack charges appear here automatically once the webhook is set up."
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="scroll-x hidden md:block">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs font-medium text-ink-secondary">
                      <th className="px-5 py-3 font-medium">Reference</th>
                      <th className="px-3 py-3 font-medium">Customer</th>
                      <th className="px-3 py-3 font-medium">Channel</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 text-right font-medium">Fees</th>
                      <th className="px-3 py-3 text-right font-medium">Amount</th>
                      <th className="px-5 py-3 text-right font-medium">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-plane/60">
                        <td className="px-5 py-3">
                          {payment.order ? (
                            <Link
                              href={`/admin/orders/${payment.order.id}`}
                              className="font-medium text-ink hover:underline"
                            >
                              {payment.reference}
                            </Link>
                          ) : (
                            <span className="font-medium text-ink">
                              {payment.reference}
                            </span>
                          )}
                        </td>
                        <td className="max-w-[14rem] truncate px-3 py-3 text-ink-secondary">
                          {payment.customer_email ?? "—"}
                        </td>
                        <td className="px-3 py-3 capitalize text-ink-secondary">
                          {payment.channel ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-ink-secondary">
                          {formatNaira(payment.fees_kobo)}
                        </td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums text-ink">
                          {formatNaira(payment.amount_kobo)}
                        </td>
                        <td className="px-5 py-3 text-right text-ink-secondary">
                          {formatDateTime(payment.paid_at ?? payment.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <ul className="divide-y divide-line md:hidden">
                {payments.map((payment) => (
                  <li key={payment.id} className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink">
                        {payment.reference}
                      </p>
                      <p className="shrink-0 text-sm font-medium tabular-nums text-ink">
                        {formatNaira(payment.amount_kobo)}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {payment.customer_email ?? "—"} ·{" "}
                      {formatDateTime(payment.paid_at ?? payment.created_at)}
                    </p>
                    <div className="mt-1.5">
                      <PaymentStatusBadge status={payment.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <Panel title="By channel">
          {totals.byChannel.length === 0 ? (
            <p className="py-4 text-sm text-ink-secondary">
              No successful payments to break down yet.
            </p>
          ) : (
            <BarList
              items={totals.byChannel.map((channel) => ({
                label:
                  channel.channel === "other"
                    ? "Other"
                    : channel.channel.replace(/_/g, " "),
                value: channel.amountKobo,
                display: formatNairaCompact(channel.amountKobo),
              }))}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
