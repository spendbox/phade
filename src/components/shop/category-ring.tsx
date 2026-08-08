import Link from "next/link";

import { Media } from "@/components/shop/media";
import { cn } from "@/lib/cn";

/**
 * One category, as a story ring.
 *
 * A row of circles you flick sideways is the most-used navigation control on
 * any phone in the country, and it costs a shopper nothing to learn. The shop
 * pins a row of them under its header; the front page shows its collections
 * far larger instead, because there a category is a room to walk into rather
 * than a filter to flick between.
 *
 * Each ring shows the category's own image if the dashboard has one, and falls
 * back to the first product filed under it — so the row is never a line of
 * grey circles on a shop that has products in it.
 */
export function Ring({
  href,
  label,
  cover,
  icon,
  active,
  compact = false,
}: {
  href: string;
  label: string;
  cover: string | null;
  icon: React.ReactNode;
  active: boolean;
  /** The shorter ring the shop's sticky bar uses, to buy back screen. */
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "tap flex flex-col items-center",
        compact ? "w-[4.25rem] gap-1" : "w-[4.75rem] gap-1.5 sm:w-20",
      )}
    >
      <span
        className={cn("rounded-full", active ? "bg-noir p-[2px]" : "story-ring")}
      >
        <span className="story-ring-inner block rounded-full">
          <span
            className={cn(
              "flex items-center justify-center overflow-hidden rounded-full bg-canvas-deep text-ink-secondary",
              compact ? "size-11" : "size-[3.75rem] sm:size-16",
            )}
          >
            {cover ? (
              <Media url={cover} alt="" sizes="72px" className="size-full" />
            ) : (
              icon
            )}
          </span>
        </span>
      </span>

      <span
        className={cn(
          "text-center leading-tight",
          compact ? "line-clamp-1 text-[10px]" : "line-clamp-2 text-[11px]",
          active ? "font-semibold text-ink" : "text-ink-secondary",
        )}
      >
        {label}
      </span>
    </Link>
  );
}
