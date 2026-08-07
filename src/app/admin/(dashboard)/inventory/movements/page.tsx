import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelative } from "@/lib/format";
import { getMovementHistory } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { InventoryMovementWithProduct } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stock movements" };

export default async function MovementsPage() {
  const { data, error } = await getMovementHistory();
  const movements = data as InventoryMovementWithProduct[];
  const configured = isSupabaseConfigured();

  return (
    <div className="space-y-5">
      <Link
        href="/admin/inventory"
        className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Inventory
      </Link>

      <PageHeader
        title="Stock movements"
        description="Every change to stock, newest first."
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      {movements.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<History className="size-5" />}
            title="No movements yet"
            description="Restocks, sales and corrections all show up here as they happen."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="table-scroll hidden md:block">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="table-head">
                <tr className="text-left text-xs font-medium text-ink-secondary">
                  <th className="w-20 px-5 py-3 text-right font-medium">
                    Change
                  </th>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Reason</th>
                  <th className="px-3 py-3 font-medium">Note</th>
                  <th className="px-5 py-3 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-plane/60">
                    <td
                      className={cn(
                        "px-5 py-3 text-right font-semibold tabular-nums",
                        movement.delta > 0 ? "text-good-text" : "text-critical",
                      )}
                    >
                      {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                    </td>
                    <td className="px-3 py-3">
                      {movement.product ? (
                        <Link
                          href={`/admin/products/${movement.product.id}`}
                          className="font-medium text-ink hover:underline"
                        >
                          {movement.product.name}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">Deleted product</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink-secondary first-letter:uppercase">
                      {movement.reason}
                    </td>
                    <td className="max-w-[18rem] truncate px-3 py-3 text-ink-secondary">
                      {movement.note ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-ink-secondary">
                      {formatDateTime(movement.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-line md:hidden">
            {movements.map((movement) => (
              <li key={movement.id} className="flex items-start gap-3 p-4">
                <span
                  className={cn(
                    "mt-0.5 shrink-0 text-sm font-semibold tabular-nums",
                    movement.delta > 0 ? "text-good-text" : "text-critical",
                  )}
                >
                  {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {movement.product?.name ?? "Deleted product"}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    <span className="first-letter:uppercase">
                      {movement.reason}
                    </span>{" "}
                    · {formatRelative(movement.created_at)}
                    {movement.note ? ` · ${movement.note}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
