import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Media } from "@/components/shop/media";
import { Rail } from "@/components/shop/rail";
import { CategoryIcon } from "@/lib/category-icons";
import type { ShopCategory } from "@/lib/shop";

/**
 * The collections, on the front page: big soft-cornered squares you flick
 * sideways through.
 *
 * Rings were too small for the job. A category here is not a filter chip — it
 * is the first real decision a shopper makes, and it deserves a photograph big
 * enough to be looked at. Squares rather than a grid of full-width tiles
 * because a rail keeps the row to one line whatever the shop has: four
 * categories or fourteen, the page underneath does not move.
 *
 * The rail says when there is more: the edge fades towards whichever side is
 * still scrollable, and a pointer gets buttons it can press. A thumb needs
 * neither — it already knows — so the buttons only exist where there's a
 * cursor to use them.
 */
export function CollectionRail({
  categories,
}: {
  categories: ShopCategory[];
}) {
  if (categories.length === 0) return null;

  return (
    <Rail
      as="ul"
      arrows
      aria-label="Collections"
      className="gap-3 px-4 pb-1 sm:gap-4 sm:px-6 lg:px-8"
    >
      {categories.map((category, index) => (
        <li
          key={category.id}
          className="w-[58vw] max-w-[19rem] shrink-0 sm:w-64 lg:w-72"
        >
          <Link
            href={`/shop?category=${category.slug}`}
            className="group relative block aspect-square overflow-hidden rounded-[1.75rem] bg-canvas-deep"
          >
            {category.imageUrl ? (
              <Media
                url={category.imageUrl}
                alt=""
                priority={index < 2}
                sizes="(min-width: 1024px) 18rem, 58vw"
                className="size-full transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              // No photograph yet: the icon carries it, large and quiet,
              // rather than a grey box that looks like a failed load.
              <span className="flex size-full items-center justify-center bg-canvas-deep text-ink-muted">
                <CategoryIcon icon={category.icon} className="size-12" />
              </span>
            )}

            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-noir/75 via-noir/10 to-transparent"
            />

            <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold tracking-tight text-white">
                  {category.name}
                </span>
                <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
                  {category.count} piece{category.count === 1 ? "" : "s"}
                </span>
              </span>

              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-noir transition group-hover:bg-white">
                <ArrowUpRight className="size-4" aria-hidden />
              </span>
            </span>
          </Link>
        </li>
      ))}

      {/* A hair of room past the last square, so it can settle clear. */}
      <li aria-hidden className="w-1 shrink-0" />
    </Rail>
  );
}
