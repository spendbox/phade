import Link from "next/link";
import { Users } from "lucide-react";

import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { Avatar, EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import {
  formatDate,
  formatNaira,
  formatNairaCompact,
  formatNumber,
} from "@/lib/format";
import { getCustomers } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { data: customers, error } = await getCustomers(q);
  const configured = isSupabaseConfigured();

  const totalSpend = customers.reduce(
    (sum, customer) => sum + customer.spendKobo,
    0,
  );
  const repeat = customers.filter((customer) => customer.orderCount > 1).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Everyone who has shopped with phadewoman."
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      <div className="card grid grid-cols-3 divide-x divide-line">
        <div className="p-4 sm:p-5">
          <StatTile label="Customers" value={formatNumber(customers.length)} />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Lifetime value"
            value={formatNairaCompact(totalSpend)}
            hint="Across all paid orders"
          />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Repeat buyers"
            value={formatNumber(repeat)}
            hint="More than one order"
          />
        </div>
      </div>

      <FilterBar searchPlaceholder="Search name, email or phone" />

      {customers.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users className="size-5" />}
            title={q ? "No matching customers" : "No customers yet"}
            description={
              q
                ? "Try a different search."
                : "Customers are created automatically from Paystack payments and storefront checkouts."
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="scroll-x hidden md:block">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-ink-secondary">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Phone</th>
                  <th className="px-3 py-3 text-right font-medium">Orders</th>
                  <th className="px-3 py-3 text-right font-medium">Spend</th>
                  <th className="px-3 py-3 text-right font-medium">Last order</th>
                  <th className="px-5 py-3 text-right font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-plane/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar name={customer.full_name ?? customer.email} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">
                            {customer.full_name ?? "—"}
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            {customer.email}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink-secondary">
                      {customer.phone ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-secondary">
                      {customer.orderCount}
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums text-ink">
                      {formatNaira(customer.spendKobo)}
                    </td>
                    <td className="px-3 py-3 text-right text-ink-secondary">
                      {customer.lastOrderAt
                        ? formatDate(customer.lastOrderAt)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-secondary">
                      {formatDate(customer.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-line md:hidden">
            {customers.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="flex items-center gap-3 p-4"
                >
                  <Avatar name={customer.full_name ?? customer.email} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {customer.full_name ?? customer.email}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {customer.orderCount} order
                      {customer.orderCount === 1 ? "" : "s"} ·{" "}
                      {formatNaira(customer.spendKobo)}
                    </p>
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
