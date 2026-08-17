"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Heart, Search, ShoppingBag, X } from "lucide-react";

import { useShop } from "@/components/shop/shop-provider";
import { SiteMenu } from "@/components/shop/site-menu";
import { LOGO_TYPE } from "@/lib/brand";
import { cn } from "@/lib/cn";
import type { MenuLink, SupportDetails } from "@/lib/storefront";

/**
 * The bar across the top of every shop page.
 *
 * The wordmark, and the three things a shopper reaches for from anywhere:
 * search, what they saved, and the bag.
 *
 * It carries no category links laid out across it. The shop has a rail of them
 * pinned under this bar and the landing page has a row of them, so a third
 * copy up here would only repeat what is already on screen — but "where is
 * everything, and how do I reach you" is a question people ask of the top-left
 * corner, so that is where the menu is.
 */
export function SiteHeader({
  menu,
  support,
}: {
  menu: MenuLink[];
  support: SupportDetails;
}) {
  const { count, openBag, saved } = useShop();
  const [searching, setSearching] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
        <SiteMenu links={menu} support={support} />

        {/* Ordered, not placed: the hamburger belongs left of the wordmark on a
            phone, and the same lines belong right of it on a desktop. */}
        <Link href="/" className="order-2 shrink-0" aria-label="phadewoman — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_TYPE}
            alt="phadewoman"
            className="h-5 w-auto sm:h-6"
            fetchPriority="high"
          />
        </Link>

        <div className="order-4 ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setSearching(true)}
            aria-label="Search"
            className="flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-canvas-deep active:scale-90"
          >
            <Search className="size-5" aria-hidden />
          </button>

          <Link
            href="/saved"
            aria-label={`Saved${saved.length > 0 ? ` (${saved.length})` : ""}`}
            className={cn(
              "relative flex size-10 items-center justify-center rounded-full transition hover:bg-canvas-deep active:scale-90",
              pathname === "/saved" ? "text-brand" : "text-ink",
            )}
          >
            <Heart
              className={cn("size-5", saved.length > 0 && "fill-brand text-brand")}
              aria-hidden
            />
          </Link>

          <button
            type="button"
            onClick={openBag}
            aria-label={`Bag${count > 0 ? `, ${count} item${count === 1 ? "" : "s"}` : ", empty"}`}
            className="relative flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-canvas-deep active:scale-90"
          >
            <ShoppingBag className="size-5" aria-hidden />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-white tabular-nums">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {searching && <SearchOverlay onClose={() => setSearching(false)} />}
    </header>
  );
}

/**
 * Search drops a sheet over the page instead of moving to a search page: you
 * type, you get taken to results, and if you change your mind you are exactly
 * where you were.
 */
function SearchOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");

  useEffect(() => {
    input.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-x-0 top-0 z-50 border-b border-line bg-canvas p-3 shadow-lg sheet-up sm:p-4">
      <form
        className="mx-auto flex max-w-3xl items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const query = term.trim();
          onClose();
          router.push(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
        }}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            ref={input}
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search dresses, bags, shoes…"
            aria-label="Search the shop"
            className="h-11 w-full rounded-full bg-canvas-deep pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-full bg-noir px-5 text-sm font-medium text-white transition hover:bg-brand"
        >
          Search
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="flex size-11 items-center justify-center rounded-full text-ink-secondary transition hover:bg-canvas-deep"
        >
          <X className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}
