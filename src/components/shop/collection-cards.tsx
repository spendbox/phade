import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Media } from "@/components/shop/media";
import { cn } from "@/lib/cn";
import type { ShopCategory } from "@/lib/shop";

/**
 * The collections, at the size a collection deserves.
 *
 * A category is a room in the shop, and a row of thumbnail-sized rings asked a
 * shopper to squint at four of them and guess. These are big enough to be
 * looked at rather than read: one picture, one name, one way in. The first card
 * runs wide, because a front page needs somewhere for the eye to land before it
 * starts comparing.
 *
 * No buttons live on them. The whole card is the target — the arrow is a mark,
 * not a control — which is one of the few honest simplifications a shop can
 * make on a phone.
 */
/**
 * How wide each card runs on a large screen, out of six columns.
 *
 * Chosen by how many collections there are so that every row comes out full:
 * four rooms are two rows of two, five are a pair over a trio. A layout that
 * leaves one card stranded in a three-across row is the thing that makes a
 * shop's own front page look unfinished, and it happens to every shop the day
 * they add a fourth category.
 */
function widths(count: number): number[] {
  if (count <= 1) return [6];
  if (count === 2) return [3, 3];
  if (count === 3) return [2, 2, 2];
  if (count === 4) return [3, 3, 3, 3];
  if (count === 5) return [3, 3, 2, 2, 2];
  return [2, 2, 2, 2, 2, 2];
}

const COLUMNS: Record<number, string> = {
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  6: "lg:col-span-6",
};

const SHAPES: Record<number, string> = {
  2: "lg:aspect-[4/5]",
  3: "lg:aspect-[3/2]",
  6: "lg:aspect-[3/1]",
};

export function CollectionCards({
  categories,
}: {
  categories: ShopCategory[];
}) {
  if (categories.length === 0) return null;

  const shown = categories.slice(0, 6);
  const layout = widths(shown.length);
  // An odd number of rooms would leave a half-width card alone at the foot of
  // a two-across phone, so the first one takes the whole width instead.
  const leadWide = shown.length % 2 === 1 && shown.length > 1;

  return (
    <ul className="grid grid-cols-2 gap-3 px-4 sm:gap-4 sm:px-6 lg:grid-cols-6 lg:px-8">
      {shown.map((category, index) => {
        const span = layout[index];
        const full = leadWide && index === 0;

        return (
        <li
          key={category.id}
          className={cn(full ? "col-span-2" : "col-span-1", COLUMNS[span])}
        >
          <Link
            href={`/shop?category=${category.slug}`}
            className="group relative block overflow-hidden rounded-3xl bg-canvas-deep"
          >
            <div
              className={cn(
                full ? "aspect-[16/10]" : "aspect-[3/4]",
                SHAPES[span],
              )}
            >
              <Media
                url={category.cover}
                alt=""
                priority={index === 0}
                sizes={
                  span >= 3
                    ? "(min-width: 1024px) 50vw, 100vw"
                    : "(min-width: 1024px) 33vw, 50vw"
                }
                className="size-full transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            {/* Dark at the foot, clear at the top: the name stays readable over
                a pale studio shot without dulling the picture itself. */}
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-noir/75 via-noir/10 to-transparent"
            />

            <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 sm:inset-x-5 sm:bottom-5">
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {category.name}
                </span>
                <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
                  {category.count} piece{category.count === 1 ? "" : "s"}
                </span>
              </span>

              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-noir transition group-hover:bg-white sm:size-10">
                <ArrowUpRight className="size-4 sm:size-5" aria-hidden />
              </span>
            </span>
          </Link>
        </li>
        );
      })}
    </ul>
  );
}
