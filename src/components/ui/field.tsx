import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg bg-surface px-3 text-sm text-ink shadow-[0_0_0_1px_rgb(11_11_12_/_0.10)] transition placeholder:text-ink-muted focus:shadow-[0_0_0_2px_var(--color-series)] focus:outline-none disabled:opacity-60";

export function Field({
  label,
  hint,
  htmlFor,
  required,
  children,
  className,
  action,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-medium text-ink-secondary"
        >
          {label}
          {required && <span className="ml-0.5 text-critical">*</span>}
        </label>
        {action}
      </div>
      {children}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Input({
  className,
  ...props
}: ComponentPropsWithRef<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: ComponentPropsWithRef<"textarea">) {
  return (
    <textarea
      className={cn(control, "py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: ComponentPropsWithRef<"select">) {
  return (
    <select className={cn(control, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

/** Naira-prefixed money input. The value is plain naira; convert at the edge. */
export function MoneyInput({
  className,
  ...props
}: ComponentPropsWithRef<"input">) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
        ₦
      </span>
      <input
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        className={cn(control, "h-10 pl-7 tabular-nums", className)}
        {...props}
      />
    </div>
  );
}
