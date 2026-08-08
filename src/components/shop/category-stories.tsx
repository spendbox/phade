import { LayoutGrid } from "lucide-react";

import { Ring } from "@/components/shop/category-ring";
import { Rail } from "@/components/shop/rail";
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
 * Big picture tiles were tried here and they were too much: the front page's
 * job at that point is to get someone into a room, not to spend half a screen
 * on the door. The rings do it in a strip, and the pictures below can be as
 * large as they like.
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
      <Rail as="ul" className="gap-4 px-4 py-1 sm:gap-5 sm:px-6 lg:px-8">
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
      </Rail>
    </nav>
  );
}
