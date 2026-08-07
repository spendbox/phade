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
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        style.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} />
      {children}
    </span>
  );
}

/**
 * Capitalised in JS, not with CSS: `::first-letter` doesn't apply to the inline
 * badge, and `capitalize` would turn "Out of stock" into "Out Of Stock".
 */
function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  return <Badge tone={orderTones[status] ?? "neutral"}>{sentenceCase(status)}</Badge>;
}

const productTones: Record<ProductStatus, Tone> = {
  active: "good",
  draft: "neutral",
  archived: "serious",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge tone={productTones[status] ?? "neutral"}>{sentenceCase(status)}</Badge>;
}

const paymentTones: Record<PaymentStatus, Tone> = {
  success: "good",
  pending: "warning",
  failed: "critical",
  abandoned: "neutral",
  refunded: "serious",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentTones[status] ?? "neutral"}>{sentenceCase(status)}</Badge>;
}

export function stockLevel(
  stock: number,
  threshold: number,
): { label: string; dot: string; text: string } {
  if (stock <= 0) {
    return { label: "Out of stock", dot: "bg-critical", text: "text-critical" };
  }
  if (stock <= threshold) {
    return { label: "Low stock", dot: "bg-warning", text: "text-[#7a5200]" };
  }
  return { label: "In stock", dot: "bg-good", text: "text-good-text" };
}

/**
 * Stock level as a red / amber / green indicator rather than a wordy chip —
 * it keeps the column narrow. The word still reaches assistive tech and hover,
 * so the meaning never rests on colour alone.
 */
export function StockDot({
  stock,
  threshold,
  className,
}: {
  stock: number;
  threshold: number;
  className?: string;
}) {
  const level = stockLevel(stock, threshold);

  return (
    <span
      title={level.label}
      className={cn("inline-flex items-center", className)}
    >
      <span className={cn("size-2.5 rounded-full", level.dot)} aria-hidden />
      <span className="sr-only">{level.label}</span>
    </span>
  );
}

/** The same indicator with its word, for the roomier mobile cards. */
export function StockBadge({
  stock,
  threshold,
}: {
  stock: number;
  threshold: number;
}) {
  const level = stockLevel(stock, threshold);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={cn("size-2 rounded-full", level.dot)} aria-hidden />
      <span className={level.text}>{level.label}</span>
    </span>
  );
}
