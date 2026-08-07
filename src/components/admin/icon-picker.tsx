"use client";

import { useState } from "react";

import {
  CATEGORY_ICONS,
  CATEGORY_ICON_KEYS,
  DEFAULT_CATEGORY_ICON,
  isCategoryIconKey,
  type CategoryIconKey,
} from "@/lib/category-icons";
import { cn } from "@/lib/cn";

/**
 * Icon chooser for a category. The selection rides in a hidden input so the
 * surrounding server-action form picks it up with everything else.
 */
export function IconPicker({
  name = "icon",
  defaultValue,
}: {
  name?: string;
  defaultValue?: string | null;
}) {
  const [selected, setSelected] = useState<CategoryIconKey>(
    isCategoryIconKey(defaultValue) ? defaultValue : DEFAULT_CATEGORY_ICON,
  );

  return (
    <div>
      <input type="hidden" name={name} value={selected} />

      <div
        role="radiogroup"
        aria-label="Category icon"
        className="grid grid-cols-8 gap-1.5 rounded-lg bg-plane p-2 sm:grid-cols-9"
      >
        {CATEGORY_ICON_KEYS.map((key) => {
          const { label, Icon } = CATEGORY_ICONS[key];
          const active = key === selected;

          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              title={label}
              onClick={() => setSelected(key)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md transition-colors",
                active
                  ? "bg-brand text-white"
                  : "text-ink-secondary hover:bg-surface hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
