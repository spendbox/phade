"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";

import { Media } from "@/components/shop/media";
import { useShop } from "@/components/shop/shop-provider";
import { cn } from "@/lib/cn";
import type { ShopProduct } from "@/lib/shop";

/**
 * The pictures.
 *
 * One frame at a time, snapped, swiped with a thumb — the browser does the
 * scrolling, so it has the momentum and the rubber-banding a hand-written
 * carousel never quite gets right. Dots say how many there are. Arrows appear
 * for a cursor, which cannot swipe.
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
      setIndex(Math.round(element.scrollLeft / width));
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  function go(step: number) {
    const element = rail.current;
    if (!element) return;
    const target = Math.min(Math.max(index + step, 0), media.length - 1);
    element.scrollTo({ left: element.clientWidth * target, behavior: "smooth" });
  }

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
              autoPlay={position === 0}
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
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {media.map((url, position) => (
              <span
                key={`dot-${url}-${position}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  position === index ? "w-4 bg-white" : "w-1.5 bg-white/55",
                )}
              />
            ))}
          </div>

          <Arrow side="left" onClick={() => go(-1)} disabled={index === 0} />
          <Arrow
            side="right"
            onClick={() => go(1)}
            disabled={index === media.length - 1}
          />
        </>
      )}
    </div>
  );
}

function Arrow({
  side,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Two quick clicks on an arrow are two clicks on an arrow, not a
      // double-tap on the photo behind it.
      onPointerUp={(event) => event.stopPropagation()}
      disabled={disabled}
      aria-label={side === "left" ? "Previous image" : "Next image"}
      className={cn(
        "absolute top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-canvas/80 text-noir backdrop-blur transition hover:bg-canvas disabled:opacity-0 sm:flex",
        side === "left" ? "left-2" : "right-2",
      )}
    >
      {side === "left" ? (
        <ChevronLeft className="size-5" aria-hidden />
      ) : (
        <ChevronRight className="size-5" aria-hidden />
      )}
    </button>
  );
}
