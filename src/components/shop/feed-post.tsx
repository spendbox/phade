"use client";

import { Heart, Share2, ShoppingBag } from "lucide-react";

import { Media } from "@/components/shop/media";
import { useShop } from "@/components/shop/shop-provider";
import { LOGO_MARK } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { formatNairaShort } from "@/lib/format";
import { LOW_STOCK_SHOWS_AT, percentOff, type ShopProduct } from "@/lib/shop";

/**
 * A featured product, as a post.
 *
 * The landing page's job is to make one thing at a time worth looking at, and
 * the format that does that best is the one everybody scrolls in the evening:
 * a big picture, a row of actions under it, and a caption.
 *
 * It differs from the feed it borrows from in two deliberate ways. The last
 * row is a button that puts the thing in your bag — this is a shop, and a post
 * should not be a dead end. And a tap on the picture opens it rather than
 * doing nothing, which is why saving here is the heart rather than a
 * double-tap: one gesture, one meaning. (The pop-up's own gallery has no
 * competing tap, so double-tap saves there.)
 */
export function FeedPost({
  product,
  priority = false,
}: {
  product: ShopProduct;
  priority?: boolean;
}) {
  const { openProduct, isSaved, toggleSaved, addToBag, say } = useShop();

  const saved = isSaved(product.id);
  const off = percentOff(product);
  const soldOut = product.stock <= 0;
  const needsChoice = product.colors.length > 1 || product.sizes.length > 1;

  async function share() {
    const url = `${window.location.origin}/product/${product.slug}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: product.name, url });
        return;
      } catch {
        // Cancelled — fall through to the clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      say("Link copied");
    } catch {
      say(url);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl bg-canvas shadow-[0_1px_0_rgb(11_11_12_/_0.06),0_18px_40px_-32px_rgb(11_11_12_/_0.5)]">
      <header className="flex items-center gap-2.5 px-3.5 py-3">
        <span className="story-ring flex size-9 shrink-0 rounded-full">
          <span className="story-ring-inner flex rounded-full">
            <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-canvas-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_MARK} alt="" className="size-4" />
            </span>
          </span>
        </span>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">
            phadewoman
          </p>
          {product.categoryName && (
            <p className="truncate text-[11px] text-ink-muted">
              {product.categoryName}
              {product.subcategory && ` · ${product.subcategory}`}
            </p>
          )}
        </div>

        {off !== null && (
          <span className="ml-auto shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
            {product.saleLabel ?? `−${off}%`}
          </span>
        )}
      </header>

      <div className="relative aspect-[4/5] bg-canvas-deep">
        <button
          type="button"
          onClick={() => openProduct(product)}
          className="absolute inset-0 z-10 size-full"
          aria-label={`Open ${product.name}`}
        />
        <Media
          url={product.media[0]}
          alt={product.name}
          priority={priority}
          autoPlay
          sizes="(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 100vw"
          className="size-full"
        />

        {soldOut && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-canvas/60">
            <span className="rounded-full bg-noir px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              Sold out
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 px-2.5 pt-2">
        <Action
          label={saved ? `Unsave ${product.name}` : `Save ${product.name}`}
          pressed={saved}
          onClick={() => toggleSaved(product.id)}
        >
          <Heart
            className={cn("size-6", saved && "fill-brand text-brand")}
            aria-hidden
          />
        </Action>

        <Action label={`Share ${product.name}`} onClick={share}>
          <Share2 className="size-6" aria-hidden />
        </Action>

        <p className="ml-auto pr-1.5 text-right">
          <span
            className={cn(
              "text-[15px] font-semibold tabular-nums",
              product.compareAtKobo ? "text-brand" : "text-ink",
            )}
          >
            {formatNairaShort(product.priceKobo)}
          </span>
          {product.compareAtKobo && (
            <span className="ml-1.5 text-xs text-ink-muted line-through tabular-nums">
              {formatNairaShort(product.compareAtKobo)}
            </span>
          )}
        </p>
      </div>

      <div className="px-3.5 pb-3.5 pt-1.5">
        <p className="text-sm text-ink">
          <button
            type="button"
            onClick={() => openProduct(product)}
            className="font-semibold hover:text-brand"
          >
            {product.name}
          </button>
          {product.description && (
            <span className="text-ink-secondary">
              {" "}
              — {firstLine(product.description)}
            </span>
          )}
        </p>

        {!soldOut && product.stock <= LOW_STOCK_SHOWS_AT && (
          <p className="mt-1 text-[13px] font-medium text-brand">
            Only {product.stock} left
          </p>
        )}

        <button
          type="button"
          disabled={soldOut}
          onClick={() =>
            needsChoice ? openProduct(product) : addToBag({ product })
          }
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-noir text-sm font-semibold text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag className="size-4" aria-hidden />
          {soldOut ? "Sold out" : needsChoice ? "Choose options" : "Add to bag"}
        </button>
      </div>
    </article>
  );
}

function Action({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-canvas-deep active:scale-90"
    >
      {children}
    </button>
  );
}

/** Captions get the opening line, not the whole care label. */
function firstLine(description: string): string {
  const line = description.split(/\n|\. /)[0].trim();
  return line.length > 110 ? `${line.slice(0, 110).trimEnd()}…` : line;
}
