import { LayoutGrid } from "lucide-react";

import { Ring } from "@/components/shop/category-stories";
import { CategoryIcon } from "@/lib/category-icons";
import type { ShopCategory } from "@/lib/shop";

/**
 * The category navigation on the shop, pinned under the header.
 *
 * A row of story rings you flick sideways, and it stays that way — it used to
 * shrink to chips once you were into the grid, which saved a little room and
 * cost more than it saved: the swap read as the page glitching, and a bar that
 * changes shape as you scroll is a bar you stop trusting. It is simply shorter
 * now, which was the actual problem.
 *
 * No client JavaScript: sticky positioning is a CSS problem, and the only
 * reason this was ever a client component was the collapsing.
 */
export function CategoryBar({
  categories,
  active,
}: {
  categories: ShopCategory[];
  active?: string | null;
}) {
  if (categories.length === 0) return null;

  return (
    <nav
      aria-label="Categories"
      className="sticky top-14 z-30 border-b border-line/70 bg-canvas/95 py-2 backdrop-blur-md sm:top-16"
    >
      <ul className="rail rail-edge gap-4 px-4 sm:gap-5 sm:px-6 lg:px-8">
        <li>
          <Ring
            href="/shop"
            label="All"
            active={!active}
            cover={null}
            compact
            icon={<LayoutGrid className="size-5" aria-hidden />}
          />
        </li>

        {categories.map((category) => (
          <li key={category.id}>
            <Ring
              href={`/shop?category=${category.slug}`}
              label={category.name}
              active={active === category.slug}
              cover={category.cover}
              compact
              icon={<CategoryIcon icon={category.icon} className="size-5" />}
            />
          </li>
        ))}

        {/* Room past the last ring, so it can settle clear of the edge. */}
        <li aria-hidden className="w-1 shrink-0" />
      </ul>
    </nav>
  );
}
