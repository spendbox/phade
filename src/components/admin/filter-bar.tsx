"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Dropdown, type DropdownOption } from "@/components/ui/dropdown";

export type FilterOption = DropdownOption;

export type FilterDefinition = {
  key: string;
  label: string;
  options: FilterOption[];
};

/**
 * Search + dimension filters in one row above the table, mirrored into the URL
 * so a filtered view can be shared or bookmarked.
 */
export function FilterBar({
  filters = [],
  searchPlaceholder = "Search",
  children,
}: {
  filters?: FilterDefinition[];
  searchPlaceholder?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get("q") ?? "");

  // Debounce the search so each keystroke doesn't trigger a query.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (search === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (search) next.set("q", search);
      else next.delete("q");
      startTransition(() => router.replace(`${pathname}?${next.toString()}`));
    }, 300);

    return () => clearTimeout(timer);
  }, [search, params, pathname, router]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  const activeCount = filters.filter((filter) => params.get(filter.key)).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 w-full rounded-full bg-surface pl-9 pr-3 text-sm text-ink shadow-[0_0_0_1px_rgb(11_11_12_/_0.08)] placeholder:text-ink-muted focus:shadow-[0_0_0_2px_var(--color-brand)] focus:outline-none"
        />
      </div>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
        {filters.map((filter) => (
          <Dropdown
            key={filter.key}
            label={filter.label}
            value={params.get(filter.key) ?? ""}
            options={filter.options}
            onChange={(value) => setFilter(filter.key, value)}
          />
        ))}

        {(activeCount > 0 || search) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              startTransition(() => router.replace(pathname));
            }}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-ink-secondary hover:text-ink"
          >
            <X className="size-3.5" />
            Clear
          </button>
        )}
      </div>

      {children && (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      )}
    </div>
  );
}
