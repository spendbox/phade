import { Pause, Pencil, Play, Tag, Ticket, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import {
  ConfirmSubmit,
  RowMenu,
  menuItemClass,
} from "@/components/admin/row-menu";
import { SaleDialog } from "@/components/admin/sale-dialog";
import { ErrorNotice, SetupNotice } from "@/components/admin/setup-notice";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import { formatDate, formatNaira, formatNumber } from "@/lib/format";
import { getCategories, getDiscounts, getProductOptions } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";
import { discountState, type DiscountState, type DiscountWithTargets } from "@/lib/types";

import { deleteSale, toggleSale } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sales" };

const STATE_TONE: Record<DiscountState, "good" | "info" | "neutral" | "serious"> = {
  active: "good",
  scheduled: "info",
  paused: "neutral",
  ended: "serious",
};

export default async function SalesPage() {
  const [{ data: sales, error }, { data: categories }, { data: products }] =
    await Promise.all([getDiscounts(), getCategories(), getProductOptions()]);

  const configured = isSupabaseConfigured();
  const options = categories.map((item) => ({ id: item.id, name: item.name }));

  const live = sales.filter((sale) => discountState(sale) === "active").length;
  const coupons = sales.filter((sale) => sale.code).length;
  const redemptions = sales.reduce((sum, sale) => sum + sale.used_count, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales"
        description="Discount everything, a category, or a handful of products — with or without a coupon code."
        actions={<SaleDialog categories={options} products={products} />}
      />

      {!configured && <SetupNotice />}
      {configured && error && <ErrorNotice message={error} />}

      <div className="card grid grid-cols-3 divide-x divide-line">
        <div className="p-4 sm:p-5">
          <StatTile label="Running now" value={formatNumber(live)} />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Coupon codes"
            value={formatNumber(coupons)}
            hint="The rest apply automatically"
          />
        </div>
        <div className="p-4 sm:p-5">
          <StatTile
            label="Times used"
            value={formatNumber(redemptions)}
            hint="Across every sale"
          />
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Ticket className="size-5" />}
            title="No sales yet"
            description="Start a sale to take a percentage or a fixed amount off your whole catalogue, a category, or specific products."
            action={<SaleDialog categories={options} products={products} />}
          />
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {sales.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              categories={options}
              products={products}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SaleCard({
  sale,
  categories,
  products,
}: {
  sale: DiscountWithTargets;
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const state = discountState(sale);

  const amount =
    sale.kind === "percentage"
      ? `${sale.value}% off`
      : `${formatNaira(sale.value)} off`;

  const applies =
    sale.scope === "all"
      ? "Everything in the store"
      : sale.targetNames.length === 0
        ? "Nothing selected yet"
        : sale.targetNames.length <= 3
          ? sale.targetNames.join(", ")
          : `${sale.targetNames.slice(0, 3).join(", ")} +${
              sale.targetNames.length - 3
            } more`;

  return (
    <li className="card flex flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-medium text-ink">{sale.name}</h2>
            <Badge tone={STATE_TONE[state]}>
              {state[0].toUpperCase() + state.slice(1)}
            </Badge>
          </div>

          <p className="mt-1 text-2xl font-semibold tracking-tight text-brand">
            {amount}
          </p>
        </div>

        <RowMenu label={`Actions for ${sale.name}`}>
          <SaleDialog
            sale={sale}
            categories={categories}
            products={products}
            trigger={
              <button type="button" className={menuItemClass}>
                <Pencil className="size-3.5" />
                Edit
              </button>
            }
          />

          <form action={toggleSale}>
            <input type="hidden" name="id" value={sale.id} />
            <input
              type="hidden"
              name="enabled"
              value={sale.enabled ? "false" : "true"}
            />
            <button type="submit" className={menuItemClass}>
              {sale.enabled ? (
                <>
                  <Pause className="size-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  Resume
                </>
              )}
            </button>
          </form>

          <form action={deleteSale}>
            <input type="hidden" name="id" value={sale.id} />
            <ConfirmSubmit
              message={`Delete "${sale.name}"? This can't be undone.`}
            >
              <Trash2 className="size-3.5" />
              Delete
            </ConfirmSubmit>
          </form>
        </RowMenu>
      </div>

      <dl className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
        <Row label="Applies to" value={applies} />

        <Row
          label="Coupon"
          value={
            sale.code ? (
              <code className="rounded bg-plane px-1.5 py-0.5 font-mono text-[12px] text-ink">
                {sale.code}
              </code>
            ) : (
              "Automatic — no code needed"
            )
          }
        />

        <Row
          label="Runs"
          value={
            sale.ends_at
              ? `${formatDate(sale.starts_at)} – ${formatDate(sale.ends_at)}`
              : `From ${formatDate(sale.starts_at)}`
          }
        />

        {sale.min_order_kobo > 0 && (
          <Row
            label="Minimum order"
            value={formatNaira(sale.min_order_kobo)}
          />
        )}

        <Row
          label="Used"
          value={
            sale.usage_limit
              ? `${formatNumber(sale.used_count)} of ${formatNumber(sale.usage_limit)}`
              : `${formatNumber(sale.used_count)} times`
          }
        />
      </dl>

      {sale.scope !== "all" && sale.targetNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sale.targetNames.slice(0, 6).map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full bg-plane px-2 py-0.5 text-xs text-ink-secondary"
            >
              <Tag className="size-3" />
              {name}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-ink-secondary">{value}</dd>
    </div>
  );
}
