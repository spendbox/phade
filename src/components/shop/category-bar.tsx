"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";

import { Ring } from "@/components/shop/category-stories";
import { CategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/cn";
import type { ShopCategory } from "@/lib/shop";

/**
 * The category navigation on the shop, pinned under the header.
 *
 * It arrives as a row of story rings — big, tappable, with the pictures that
 * make a category worth opening. Then it gets out of the way: once the grid
 * starts moving it collapses to a single row of chips, because two thirds of a
 * phone screen is too much rent for navigation you have already read.
 *
 * The collapse is driven by a sentinel above the bar rather than a scroll
 * handler. An IntersectionObserver fires twice — once on the way down, once on
 * the way back — where a scroll listener fires on every frame of every scroll,
 * on the one page where the main thread is already busy rendering a grid.
 *
 * The height is animated between two fixed values with both rows stacked in the
 * same grid cell. That is what stops the products underneath from jumping as it
 * changes: the bar's own box is the only thing that moves.
 */
export function CategoryBar({
  categories,
  active,
}: {
  categories: ShopCategory[];
  active?: string | null;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      // The sentinel sits above the bar; once it has passed under the header
      // the shopper is into the grid.
      { rootMargin: "0px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (categories.length === 0) return null;

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />

      <div
        className={cn(
          "sticky top-14 z-30 grid overflow-hidden border-b border-line/70 bg-canvas/95 backdrop-blur-md transition-[height] duration-300 ease-out sm:top-16",
          collapsed ? "h-[3.5rem]" : "h-[7.5rem]",
        )}
      >
        {/* Both rows live in the same grid cell, so neither reserves height. */}
        <nav
          aria-label="Categories"
          aria-hidden={collapsed}
          className={cn(
            "col-start-1 row-start-1 self-center transition-opacity duration-200",
            collapsed ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
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

        <nav
          aria-label="Categories"
          aria-hidden={!collapsed}
          className={cn(
            "col-start-1 row-start-1 self-center transition-opacity duration-200",
            collapsed ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <ul className="rail gap-2 px-4 sm:px-6 lg:px-8">
            <li>
              <Chip href="/shop" active={!active}>
                All
              </Chip>
            </li>

            {categories.map((category) => (
              <li key={category.id}>
                <Chip
                  href={`/shop?category=${category.slug}`}
                  active={active === category.slug}
                >
                  {category.name}
                </Chip>
              </li>
            ))}

            <li aria-hidden className="w-1 shrink-0" />
          </ul>
        </nav>
      </div>
    </>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] transition",
        active
          ? "bg-noir font-medium text-white"
          : "bg-canvas-deep text-ink-secondary hover:bg-line-strong hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
