"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Search, ShoppingBag } from "lucide-react";

import { useShop } from "@/components/shop/shop-provider";
import { cn } from "@/lib/cn";

/**
 * The bar along the bottom of a phone.
 *
 * Everything a shopper does repeatedly — go home, browse, check what they
 * saved, open the bag — sits within a thumb's reach and stays there while the
 * page scrolls. It is the single biggest thing separating a shop that is
 * pleasant on a phone from one that is merely legible on a phone.
 *
 * It disappears on wider screens, where the header does this job with a cursor.
 */
export function TabBar() {
  const pathname = usePathname();
  const { count, openBag, saved } = useShop();

  return (
    <nav
      aria-label="Shop"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch">
        <Tab href="/" label="Home" active={pathname === "/"}>
          <Home className="size-5" aria-hidden />
        </Tab>

        <Tab href="/shop" label="Shop" active={pathname.startsWith("/shop")}>
          <Search className="size-5" aria-hidden />
        </Tab>

        <Tab href="/saved" label="Saved" active={pathname === "/saved"}>
          <Heart
            className={cn("size-5", saved.length > 0 && "fill-brand text-brand")}
            aria-hidden
          />
        </Tab>

        <button
          type="button"
          onClick={openBag}
          className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-ink-secondary transition active:scale-95"
        >
          <span className="relative">
            <ShoppingBag className="size-5" aria-hidden />
            {count > 0 && (
              <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-white tabular-nums">
                {count}
              </span>
            )}
          </span>
          <span className="text-[10px] font-medium">Bag</span>
        </button>
      </div>
    </nav>
  );
}

function Tab({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 transition active:scale-95",
        active ? "text-ink" : "text-ink-secondary",
      )}
    >
      {children}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
