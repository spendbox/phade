"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";

import { Media } from "@/components/shop/media";
import { usePrefersReducedMotion } from "@/lib/browser-store";
import { cn } from "@/lib/cn";
import type { StorefrontContent } from "@/lib/storefront";

/**
 * The hero, told as a story.
 *
 * Every picture the shop's owner uploads in Settings → Storefront becomes a
 * frame, the frames advance themselves, and a row of segments across the top
 * says how many there are and how far through you are. Tap the left or right
 * of the picture to move by hand. It is the one interaction every shopper
 * already knows without being taught, and it turns a hero that would otherwise
 * show one photo into one that shows the whole drop.
 *
 * The words, the button and the pictures all come from the dashboard — nothing
 * here is hard-coded but the shape it is poured into.
 */

/** How long one frame holds before the next. Long enough to read a headline. */
const FRAME_MS = 5200;

export function StoryHero({
  content,
  hasShop,
}: {
  content: StorefrontContent;
  hasShop: boolean;
}) {
  const frames = content.heroImages;
  const [index, setIndex] = useState(0);
  /** Null until someone presses play or pause; their choice wins after that. */
  const [chosen, setChosen] = useState<boolean | null>(null);

  // Someone who has asked their system for less motion gets a hero that holds
  // still — unless they press play, which is a clearer signal than a setting.
  const still = usePrefersReducedMotion();
  const playing = chosen ?? !still;

  const step = useCallback(
    (by: number) => {
      if (frames.length < 2) return;
      setIndex((current) => {
        const next = current + by;
        if (next < 0) return frames.length - 1;
        return next % frames.length;
      });
    },
    [frames.length],
  );

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = setTimeout(() => step(1), FRAME_MS);
    return () => clearTimeout(timer);
  }, [index, playing, frames.length, step]);

  const showCta = Boolean(content.heroCtaLabel && content.heroCtaHref);

  return (
    <section
      aria-label="Featured"
      className="relative isolate min-h-[560px] overflow-hidden bg-noir text-white sm:min-h-[600px] lg:min-h-[680px]"
      // `svh`, not `dvh`. A dynamic viewport unit changes height every time a
      // phone's browser bar hides or reappears on scroll, and since the picture
      // covers the box, every one of those changes is a lurch of zoom under the
      // reader's thumb. The small viewport height is the one that holds still.
      style={{ height: "min(84svh, 60rem)" }}
    >
      {frames.length === 0 ? (
        // No pictures yet: the type carries it, and the shop still opens.
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 15% 10%, #3a1421 0%, #0c0c0d 58%), linear-gradient(200deg, rgba(166,54,85,0.55), transparent 55%)",
          }}
        />
      ) : (
        frames.map((url, position) => (
          <div
            key={`${url}-${position}`}
            aria-hidden={position !== index}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              position === index ? "opacity-100" : "opacity-0",
            )}
          >
            <Media
              url={url}
              alt=""
              priority={position === 0}
              autoPlay={position === index}
              sizes="100vw"
              className="size-full"
            />
          </div>
        ))
      )}

      {/* Scrim: dark at the foot where the words are, clear at the top where
          the picture is doing the work. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(12,12,13,0.92) 0%, rgba(12,12,13,0.55) 32%, rgba(12,12,13,0.05) 62%, rgba(12,12,13,0.35) 100%)",
        }}
      />

      {frames.length > 1 && (
        <>
          <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
            {frames.map((url, position) => (
              <span
                key={`bar-${url}-${position}`}
                className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <span
                  className={cn(
                    "block h-full rounded-full bg-white",
                    position < index && "w-full",
                    position === index && playing && "story-fill w-full",
                    position === index && !playing && "w-full opacity-70",
                    position > index && "w-0",
                  )}
                  style={
                    position === index && playing
                      ? { animationDuration: `${FRAME_MS}ms` }
                      : undefined
                  }
                />
              </span>
            ))}
          </div>

          {/* Tap targets, not buttons in the picture: the whole left third goes
              back, the right third goes on, the middle belongs to the words. */}
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous"
            className="absolute inset-y-0 left-0 z-10 w-1/3"
          />
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next"
            className="absolute inset-y-0 right-0 z-10 w-1/3"
          />

          <button
            type="button"
            onClick={() => setChosen(!playing)}
            aria-label={playing ? "Pause" : "Play"}
            className="absolute right-3 top-8 z-20 flex size-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
          >
            {playing ? (
              <Pause className="size-4" aria-hidden />
            ) : (
              <Play className="size-4" aria-hidden />
            )}
          </button>
        </>
      )}

      <div className="pointer-events-none relative z-20 flex h-full flex-col justify-end p-6 pb-10 sm:p-10 lg:p-14">
        <div className="pointer-events-auto max-w-2xl">
          <h1
            className="rise text-balance text-4xl font-semibold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "60ms" }}
          >
            {content.heroHeadline}
          </h1>

          {content.heroSubheadline && (
            <p
              className="rise mt-4 max-w-lg text-pretty text-[15px] leading-relaxed text-white/80 sm:text-lg"
              style={{ animationDelay: "120ms" }}
            >
              {content.heroSubheadline}
            </p>
          )}

          <div
            className="rise mt-7 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "180ms" }}
          >
            {showCta && (
              <Link
                href={content.heroCtaHref}
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-noir transition hover:bg-brand hover:text-white"
              >
                {content.heroCtaLabel}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            )}

            {hasShop && content.heroCtaHref !== "/shop" && (
              <Link
                href="/shop"
                className="inline-flex h-12 items-center rounded-full px-6 text-sm font-semibold text-white ring-1 ring-inset ring-white/35 transition hover:bg-white/10"
              >
                Browse everything
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
