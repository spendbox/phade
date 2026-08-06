import { cn } from "@/lib/cn";

/**
 * Stat tile: label (sentence case) · value · optional delta vs a named period.
 * Large standalone values use proportional figures — tabular-nums is reserved
 * for columns that must align vertically.
 */
export function StatTile({
  label,
  value,
  delta,
  hint,
  className,
}: {
  label: string;
  value: string;
  delta?: { value: number; period: string; upIsGood?: boolean };
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[13px] text-ink-secondary">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {delta && <Delta {...delta} />}
      {hint && !delta && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

function Delta({
  value,
  period,
  upIsGood = true,
}: {
  value: number;
  period: string;
  upIsGood?: boolean;
}) {
  if (!Number.isFinite(value)) return null;

  const up = value >= 0;
  const good = up === upIsGood;
  const sign = up ? "+" : "−";

  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "font-medium tabular-nums",
          value === 0
            ? "text-ink-muted"
            : good
              ? "text-good-text"
              : "text-critical",
        )}
      >
        {value === 0 ? "0%" : `${sign}${Math.abs(value).toFixed(1)}%`}
      </span>
      <span className="truncate text-ink-muted">{period}</span>
    </p>
  );
}

/** Section card used across the dashboard. */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          {title && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      <div className={cn(bodyClassName ?? "p-4 sm:p-5")}>{children}</div>
    </section>
  );
}
