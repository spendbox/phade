"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { ProductCard } from "@/components/shop/product-card";
import { useShop } from "@/components/shop/shop-provider";
import type { ShopProduct } from "@/lib/shop";

/**
 * What a shopper saved.
 *
 * The list lives in their browser, so the server sends the whole catalogue and
 * the filtering happens here. Until localStorage has been read the page shows
 * nothing rather than an empty state — telling someone they have saved nothing
 * a beat before their eleven saved dresses appear is worse than a beat of
 * quiet.
 */
export function SavedGrid({ products }: { products: ShopProduct[] }) {
  const { saved, ready } = useShop();

  if (!ready) return <div className="min-h-[50dvh]" aria-hidden />;

  const chosen = saved.flatMap((id) => {
    const product = products.find((entry) => entry.id === id);
    return product ? [product] : [];
  });

  if (chosen.length === 0) {
    return (
      <div className="mx-auto max-w-sm px-6 py-20 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-canvas-deep text-ink-muted">
          <Heart className="size-6" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-ink">
          Nothing saved yet
        </h2>
        <p className="mt-2 text-sm text-ink-secondary">
          Tap the heart on anything you like — or double-tap the picture — and
          it waits for you here.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-noir px-6 text-sm font-medium text-white transition hover:bg-brand"
        >
          Find something
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="px-4 pt-1 text-sm text-ink-secondary sm:px-6 lg:px-8">
        {chosen.length} piece{chosen.length === 1 ? "" : "s"} saved on this
        device.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:gap-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {chosen.map((product, index) => (
          <ProductCard key={product.id} product={product} priority={index < 4} />
        ))}
      </div>
    </>
  );
}
