"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";

import { Media } from "@/components/shop/media";
import { useShop } from "@/components/shop/shop-provider";
import { cn } from "@/lib/cn";
import type { ShopProduct } from "@/lib/shop";

/**
 * The pictures.
 *
 * One frame at a time, snapped, swiped with a thumb — the browser does the
 * scrolling, so it has the momentum and the rubber-banding a hand-written
 * carousel never quite gets right. It has no arrows of its own: the pop-up
 * already carries a pair for moving along the row of products, and a second
 * pair a few pixels away, meaning something else entirely, is how a shopper
 * ends up on a dress they never asked to see.
 *
 * Whatever says "there are more pictures" has to say it over the pictures
 * themselves, and fashion photography is mostly white studio wall. Plain white
 * dots disappear into it, so the count and the dots each sit on a dark pill of
 * their own: the same cue on a black leather bag and on an ivory abaya shot
 * against paper.
 *
 * Double-tapping saves the product, because that is what double-tapping a
 * photo has meant for a decade, and a shopper should not have to be told.
 */
export function ProductGallery({
  product,
  className,
}: {
  product: ShopProduct;
  className?: string;
}) {
  const { isSaved, toggleSaved } = useShop();
  const rail = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  const [index, setIndex] = useState(0);
  const [bloom, setBloom] = useState(0);

  const saved = isSaved(product.id);
  const media = useMemo(
    () => (product.media.length > 0 ? product.media : [""]),
    [product.media],
  );

  useEffect(() => {
    const element = rail.current;
    if (!element) return;

    const onScroll = () => {
      const width = element.clientWidth || 1;
      const at = Math.round(element.scrollLeft / width);
      // Rubber-banding at either end can scroll past the last frame.
      setIndex(Math.min(Math.max(at, 0), element.children.length - 1));
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  function onPointerUp() {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      if (!saved) toggleSaved(product.id);
      setBloom(now);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
  }

  return (
    <div className={cn("relative bg-canvas-deep", className)}>
      <div ref={rail} className="rail size-full" onPointerUp={onPointerUp}>
        {media.map((url, position) => (
          <div key={`${url}-${position}`} className="h-full w-full">
            <Media
              url={url || null}
              alt={`${product.name}, image ${position + 1}`}
              priority={position === 0}
              autoPlay={position === index}
              sizes="(min-width: 640px) 55vw, 100vw"
              className="size-full"
            />
          </div>
        ))}
      </div>

      {bloom > 0 && (
        <span
          key={bloom}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <Heart
            className="pop-heart size-24 fill-white text-white drop-shadow-lg"
            aria-hidden
          />
        </span>
      )}

      {saved && (
        <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-canvas/85 px-2.5 py-1 text-[11px] font-semibold text-brand backdrop-blur">
          <Heart className="size-3 fill-brand" aria-hidden />
          Saved
        </span>
      )}

      {media.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-noir/55 px-2.5 py-1.5 backdrop-blur-sm">
              {media.map((url, position) => (
                <span
                  key={`dot-${url}-${position}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    position === index ? "w-4 bg-white" : "w-1.5 bg-white/60",
                  )}
                />
              ))}
            </span>
          </div>

          {/* The count, not just the position: "1/5" is what tells a shopper
              there is anything to swipe to in the first place. */}
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-noir/55 px-2 py-1 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
            {Math.min(index + 1, media.length)}/{media.length}
          </span>
        </>
      )}
    </div>
  );
}
