import { cn } from "@/lib/cn";
import type { OrderStatus, PaymentStatus, ProductStatus } from "@/lib/types";

/**
 * Status is never carried by colour alone — every badge pairs its dot with the
 * status word, so the meaning survives colour-blindness, greyscale print, and
 * forced-colors mode.
 */

type Tone = "good" | "warning" | "serious" | "critical" | "neutral" | "info";

const tones: Record<Tone, { chip: string; dot: string }> = {
  good: { chip: "bg-good-soft text-good-text", dot: "bg-good" },
  warning: { chip: "bg-warning-soft text-[#7a5200]", dot: "bg-warning" },
  serious: { chip: "bg-serious-soft text-[#8f4522]", dot: "bg-serious" },
  critical: { chip: "bg-critical-soft text-critical", dot: "bg-critical" },
  neutral: { chip: "bg-plane text-ink-secondary", dot: "bg-ink-muted" },
  info: { chip: "bg-series-soft/60 text-[#1c5cab]", dot: "bg-series" },
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const style = tones[tone];
  return (
    <span
      className={cn(
        // first-letter, not `capitalize` — otherwise "Out of stock" would render
        // as "Out Of Stock".
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium first-letter:uppercase",
        style.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} />
      {children}
    </span>
  );
}

const orderTones: Record<OrderStatus, Tone> = {
  pending: "warning",
  paid: "good",
  processing: "info",
  shipped: "info",
  delivered: "good",
  cancelled: "critical",
  refunded: "serious",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderTones[status] ?? "neutral"}>{status}</Badge>;
}

const productTones: Record<ProductStatus, Tone> = {
  active: "good",
  draft: "neutral",
  archived: "serious",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge tone={productTones[status] ?? "neutral"}>{status}</Badge>;
}

const paymentTones: Record<PaymentStatus, Tone> = {
  success: "good",
  pending: "warning",
  failed: "critical",
  abandoned: "neutral",
  refunded: "serious",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentTones[status] ?? "neutral"}>{status}</Badge>;
}

export function StockBadge({
  stock,
  threshold,
}: {
  stock: number;
  threshold: number;
}) {
  if (stock <= 0) return <Badge tone="critical">Out of stock</Badge>;
  if (stock <= threshold) return <Badge tone="warning">Low stock</Badge>;
  return <Badge tone="good">In stock</Badge>;
}
