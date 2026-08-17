import { LayoutGrid } from "lucide-react";

import { Ring } from "@/components/shop/category-ring";
import { Rail } from "@/components/shop/rail";
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
 * The bar itself stays on the server — sticky positioning is a CSS problem.
 * Only the rail inside it is a client component, and only so the edge fade can
 * tell the truth about whether there are categories past the fold.
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
      <Rail as="ul" className="gap-4 px-4 sm:gap-5 sm:px-6 lg:px-8">
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
              // The category's own photograph, uploaded in Settings →
              // Categories, with its icon standing in until there is one. The
              // icon gets its moment at the head of the category's own page.
              cover={category.imageUrl}
              compact
              icon={<CategoryIcon icon={category.icon} className="size-5" />}
            />
          </li>
        ))}

        {/* Room past the last ring, so it can settle clear of the edge. */}
        <li aria-hidden className="w-1 shrink-0" />
      </Rail>
    </nav>
  );
}
