"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNaira, formatNairaCompact } from "@/lib/format";
import type { DailyPoint } from "@/lib/queries";

/**
 * Revenue over time — a single series, so no legend is needed: the panel title
 * says what is plotted. 2px line over a 10% wash, hairline solid gridlines, and
 * a hover tooltip carrying the values that aren't directly labelled.
 */
export function RevenueChart({ data }: { data: DailyPoint[] }) {
  const points = data.map((point) => ({
    ...point,
    revenue: point.revenueKobo / 100,
  }));

  const everyNth = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="h-[240px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="revenue-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#2a78d6" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="#e1e0d9"
            strokeWidth={1}
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={{ stroke: "#c3c2b7" }}
            tick={{ fill: "#898781", fontSize: 11 }}
            tickMargin={8}
            interval={everyNth - 1}
            tickFormatter={(value: string) =>
              new Date(value).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
              })
            }
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            width={62}
            tick={{ fill: "#898781", fontSize: 11 }}
            tickFormatter={(value: number) => formatNairaCompact(value * 100)}
          />

          <Tooltip
            cursor={{ stroke: "#c3c2b7", strokeWidth: 1 }}
            content={<RevenueTooltip />}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#2a78d6"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#revenue-wash)"
            activeDot={{
              r: 4,
              fill: "#2a78d6",
              stroke: "#ffffff",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

type TooltipPayload = {
  payload?: { date: string; revenueKobo: number; orders: number };
};

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="card px-3 py-2 text-xs">
      <p className="font-medium text-ink">
        {new Date(point.date).toLocaleDateString("en-NG", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-ink-secondary">
        <span className="size-2 rounded-full bg-series" />
        <span className="tabular-nums text-ink">
          {formatNaira(point.revenueKobo)}
        </span>
      </p>
      <p className="mt-0.5 text-ink-muted">
        {point.orders} order{point.orders === 1 ? "" : "s"}
      </p>
    </div>
  );
}
