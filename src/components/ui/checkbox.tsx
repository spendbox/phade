"use client";

/**
 * Selection checkbox for tables. `label` is the accessible name — a bare
 * checkbox in a row of fifteen identical ones tells a screen reader nothing.
 */
export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(node) => {
        if (node) node.indeterminate = indeterminate;
      }}
      onChange={onChange}
      className="size-4 shrink-0 cursor-pointer rounded border-line-strong text-brand accent-brand focus:ring-brand"
    />
  );
}
