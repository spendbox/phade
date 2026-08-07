import Link from "next/link";
import { ArrowUpRight, Boxes, Minus, Plus } from "lucide-react";

import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { StockDialog } from "@/components/admin/stock-dialog";
import { StockBadge, StockDot } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, StatTile } from "@/components/ui/stat-tile";
import { formatNaira, formatNairaCompact, formatNumber, formatRelative } from "@/lib/format";
import { getInventory, getRecentMovements } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { InventoryMovementWithProduct } from "@/lib/types";

import { nudgeStock } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventory" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const { q, view } = await searchParams;

  const [{ data: rows, error }, { data: movements }] = await Promise.all([
    getInventory({ search: q, view }),
    getRecentMovements(5),
  ]);

  const configured = isSupabaseConfigured();

  const lowCount = rows.filter(
    (row) => row.stock > 0 && row.stock <= row.low_stock_threshold,
  ).length;
  const outCount = rows.filter((row) => row.stock <= 0).length;
  const unitsOnHand = rows.reduce((sum, row) => sum + row.stock, 0);
  const stockValueKobo = rows.reduce(
    (sum, row) => sum + row.stock * (row.cost_price_kobo ?? row.price_kobo),
    0,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        description="Track what's on hand and record every stock movement."
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      <div className="card grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        <div className="border-b border-line p-4 sm:border-b-0 sm:p-5">
          <StatTile
            label="Units on hand"
            value={formatNumber(unitsOnHand)}
            hint={`${formatNumber(rows.length)} products tracked`}
          />
        </div>
        <div className="border-b border-l border-line p-4 sm:border-b-0 sm:border-l-0 sm:p-5">
          <StatTile
            label="Stock value"
            value={formatNairaCompact(stockValueKobo)}
            hint="At cost where set"
          />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Low stock"
            value={formatNumber(lowCount)}
            hint="At or below reorder point"
          />
        </div>
        <div className="border-l border-line p-4 sm:border-l-0 sm:p-5">
          <StatTile
            label="Out of stock"
            value={formatNumber(outCount)}
            hint="Needs restocking now"
          />
        </div>
      </div>

      <FilterBar
        searchPlaceholder="Search by name or SKU"
        filters={[
          {
            key: "view",
            label: "Stock level",
            options: [
              { value: "low", label: "Low stock" },
              { value: "out", label: "Out of stock" },
            ],
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Boxes className="size-5" />}
              title={q || view ? "No matches" : "Nothing to track yet"}
              description={
                q || view
                  ? "Try a different search or clear the filters."
                  : "Add products and their stock levels show up here."
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="table-scroll hidden md:block">
                <table className="w-full min-w-[42rem] text-sm">
                  <thead className="table-head">
                    <tr className="text-left text-xs font-medium text-ink-secondary">
                      <th className="px-5 py-3 font-medium">Product</th>
                      <th className="w-40 px-3 py-3 font-medium">Stock</th>
                      <th className="px-3 py-3 text-right font-medium">Value</th>
                      <th className="px-5 py-3 text-right font-medium">
                        Adjust
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-plane/60">
                        <td className="px-5 py-3">
                          <Link href={`/admin/products/${row.id}`}>
                            <span className="block truncate font-medium text-ink">
                              {row.name}
                            </span>
                            <span className="block truncate text-xs text-ink-muted">
                              {row.sku ?? row.category?.name ?? "—"}
                            </span>
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="flex items-center gap-2.5">
                            <StockDot
                              stock={row.stock}
                              threshold={row.low_stock_threshold}
                            />
                            <span className="font-medium tabular-nums text-ink">
                              {row.stock}
                            </span>
                            <span className="text-xs text-ink-muted">
                              reorder at {row.low_stock_threshold}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-ink-secondary">
                          {formatNaira(
                            row.stock * (row.cost_price_kobo ?? row.price_kobo),
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <NudgeButton id={row.id} delta={-1} />
                            <NudgeButton id={row.id} delta={1} />
                            <StockDialog
                              productId={row.id}
                              productName={row.name}
                              currentStock={row.stock}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <ul className="divide-y divide-line md:hidden">
                {rows.map((row) => (
                  <li key={row.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/admin/products/${row.id}`} className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {row.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">
                          {row.sku ?? row.category?.name ?? "—"}
                        </p>
                      </Link>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold tabular-nums text-ink">
                          {row.stock}
                        </span>
                        <span className="text-xs text-ink-muted">on hand</span>
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <StockBadge
                        stock={row.stock}
                        threshold={row.low_stock_threshold}
                      />
                      <div className="flex items-center gap-1.5">
                        <NudgeButton id={row.id} delta={-1} />
                        <NudgeButton id={row.id} delta={1} />
                        <StockDialog
                          productId={row.id}
                          productName={row.name}
                          currentStock={row.stock}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <Panel
          title="Recent movements"
          action={
            <Link
              href="/admin/inventory/movements"
              className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink"
            >
              View all <ArrowUpRight className="size-3.5" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {movements.length === 0 ? (
            <p className="px-4 py-5 text-sm text-ink-secondary sm:px-5">
              Stock changes will be listed here.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {(movements as InventoryMovementWithProduct[]).map((movement) => (
                <li
                  key={movement.id}
                  className="flex items-start gap-3 px-4 py-3 sm:px-5"
                >
                  <span
                    className={
                      movement.delta > 0
                        ? "mt-0.5 shrink-0 text-sm font-semibold tabular-nums text-good-text"
                        : "mt-0.5 shrink-0 text-sm font-semibold tabular-nums text-critical"
                    }
                  >
                    {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {movement.product?.name ?? "Deleted product"}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      <span className="capitalize">{movement.reason}</span> ·{" "}
                      {formatRelative(movement.created_at)}
                      {movement.note ? ` · ${movement.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function NudgeButton({ id, delta }: { id: string; delta: number }) {
  return (
    <form action={nudgeStock}>
      <input type="hidden" name="product_id" value={id} />
      <input type="hidden" name="delta" value={delta} />
      <button
        type="submit"
        aria-label={delta > 0 ? "Add one" : "Remove one"}
        className="flex size-8 items-center justify-center rounded-lg text-ink-secondary ring-1 ring-inset ring-line-strong transition-colors hover:bg-plane hover:text-ink"
      >
        {delta > 0 ? <Plus className="size-3.5" /> : <Minus className="size-3.5" />}
      </button>
    </form>
  );
}
