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
 * A mouse can't swipe, so it gets two ways in instead of a second pair of
 * chevrons: the frame drags under the cursor like a photograph on a table, and
 * the dots that show the position are also the way to jump to one.
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

  /** Jumps to a frame — what the dots do, and what a keyboard gets. */
  function goTo(position: number) {
    const element = rail.current;
    if (!element) return;
    element.scrollTo({
      left: element.clientWidth * position,
      behavior: "smooth",
    });
  }

  function onPointerUp(event: React.PointerEvent) {
    // A mouse that has just dragged the picture across is not tapping it.
    if (drag.current.moved > 6) return;
    if (event.pointerType === "mouse" && event.detail > 1) return;

    const now = Date.now();
    if (now - lastTap.current < 320) {
      if (!saved) toggleSaved(product.id);
      setBloom(now);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
  }

  // ---- drag the picture, for a pointer that can't swipe ---------------------
  const drag = useRef({ on: false, startX: 0, from: 0, moved: 0 });

  function onPointerDown(event: React.PointerEvent) {
    drag.current.moved = 0;
    const element = rail.current;
    if (event.pointerType !== "mouse" || !element) return;
    drag.current = {
      on: true,
      startX: event.clientX,
      from: element.scrollLeft,
      moved: 0,
    };
    // Mandatory snapping and a drag are the same argument: every pixel between
    // two frames is a position the browser instantly pulls back out of, so the
    // picture wouldn't follow the cursor at all. Snapping comes back the
    // moment it is let go, which is when it has something to do.
    element.style.scrollSnapType = "none";
  }

  function onPointerMove(event: React.PointerEvent) {
    const element = rail.current;
    if (!drag.current.on || !element) return;
    const by = event.clientX - drag.current.startX;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(by));
    // Instant, or every frame of the drag would be animated a beat behind
    // the cursor it is supposed to be following.
    element.scrollTo({ left: drag.current.from - by, behavior: "instant" });
  }

  function endDrag() {
    const element = rail.current;
    if (!drag.current.on || !element) return;
    drag.current.on = false;

    // Read where the drag ended before snapping is turned back on: restoring
    // it makes the browser jump to a frame of its own choosing, and reading
    // afterwards would only ever find the one it had already picked.
    const landed = Math.min(
      Math.max(Math.round(element.scrollLeft / (element.clientWidth || 1)), 0),
      media.length - 1,
    );

    element.style.scrollSnapType = "";
    goTo(landed);
  }

  return (
    <div className={cn("relative bg-canvas-deep", className)}>
      <div
        ref={rail}
        className="rail rail-frames size-full"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={endDrag}
        onPointerUpCapture={endDrag}
        onPointerUp={onPointerUp}
        onDragStart={(event) => event.preventDefault()}
      >
        {media.map((url, position) => (
          <div key={`${url}-${position}`} className="h-full w-full">
            <Media
              url={url || null}
              alt={`${product.name}, image ${position + 1}`}
              priority={position === 0}
              autoPlay={position === index}
              sizes="(min-width: 640px) 55vw, 100vw"
              className="size-full select-none"
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
          {/* The dots are also the controls. They already say where you are,
              and a cursor needs somewhere to press that isn't another arrow. */}
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <span className="flex items-center gap-0.5 rounded-full bg-noir/55 px-1.5 py-0.5 backdrop-blur-sm">
              {media.map((url, position) => (
                <button
                  key={`dot-${url}-${position}`}
                  type="button"
                  onClick={() => goTo(position)}
                  onPointerUp={(event) => event.stopPropagation()}
                  aria-label={`Picture ${position + 1}`}
                  aria-current={position === index}
                  className="flex h-6 items-center px-1"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-all",
                      position === index ? "w-4 bg-white" : "w-1.5 bg-white/60",
                    )}
                  />
                </button>
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
