import Link from "next/link";
import { LayoutGrid } from "lucide-react";

import { Media } from "@/components/shop/media";
import { CategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/cn";
import type { ShopCategory } from "@/lib/shop";

/**
 * Categories as story rings.
 *
 * A row of circles you flick sideways is the most-used navigation control on
 * any phone in the country, and it costs a shopper nothing to learn. It is
 * also honest about size: a shop with four categories fills the row, a shop
 * with fifteen scrolls, and neither looks broken.
 *
 * Each ring shows the category's own image if the dashboard has one, and falls
 * back to the first product filed under it — so the row is never a line of
 * grey circles on a shop that has products in it.
 */
export function CategoryStories({
  categories,
  active,
  className,
}: {
  categories: ShopCategory[];
  /** Slug of the category being browsed, if any. */
  active?: string | null;
  className?: string;
}) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Categories" className={cn("relative", className)}>
      <ul className="rail gap-4 px-4 py-1 sm:gap-5 sm:px-6 lg:px-8">
        <li>
          <Ring
            href="/shop"
            label="All"
            active={!active}
            cover={null}
            icon={<LayoutGrid className="size-6" aria-hidden />}
          />
        </li>

        {categories.map((category) => (
          <li key={category.id}>
            <Ring
              href={`/shop?category=${category.slug}`}
              label={category.name}
              active={active === category.slug}
              cover={category.cover}
              icon={<CategoryIcon icon={category.icon} className="size-6" />}
            />
          </li>
        ))}

        <li aria-hidden className="w-1 shrink-0" />
      </ul>
    </nav>
  );
}

function Ring({
  href,
  label,
  cover,
  icon,
  active,
}: {
  href: string;
  label: string;
  cover: string | null;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="tap flex w-[4.75rem] flex-col items-center gap-1.5 sm:w-20"
    >
      <span
        className={cn(
          "rounded-full",
          active ? "bg-noir p-[2px]" : "story-ring",
        )}
      >
        <span className="story-ring-inner block rounded-full">
          <span className="flex size-[3.75rem] items-center justify-center overflow-hidden rounded-full bg-canvas-deep text-ink-secondary sm:size-16">
            {cover ? (
              <Media
                url={cover}
                alt=""
                sizes="72px"
                className="size-full"
              />
            ) : (
              icon
            )}
          </span>
        </span>
      </span>

      <span
        className={cn(
          "line-clamp-2 text-center text-[11px] leading-tight",
          active ? "font-semibold text-ink" : "text-ink-secondary",
        )}
      >
        {label}
      </span>
    </Link>
  );
}
