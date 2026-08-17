import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Media } from "@/components/shop/media";
import { isVideoUrl } from "@/lib/media";
import type { AboutBlock as AboutContent } from "@/lib/storefront";

/**
 * The shop, in its own words.
 *
 * A front page that is only products is a catalogue; the reason someone buys
 * from this shop rather than the next one is usually a sentence about who
 * chose the clothes and why. Every word and the picture beside them come from
 * Settings → Storefront, and the picture can be a clip instead — rails moving,
 * a piece being folded — because that is what a shop's own footage is for.
 *
 * Nothing here is rendered at all until the dashboard has something to say, so
 * an unfilled section is absent rather than empty.
 */
export function AboutSection({ about }: { about: AboutContent }) {
  if (!about.enabled) return null;

  const hasMedia = Boolean(about.mediaUrl);
  const video = isVideoUrl(about.mediaUrl);
  const showCta = Boolean(about.ctaLabel && about.ctaHref);

  return (
    // Narrower than the walls of pictures around it, and centred. This is the
    // one part of the page meant to be read rather than scanned, and a line of
    // prose stretched across a laptop is a line nobody finishes.
    <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] bg-canvas-deep/55">
        <div className="grid items-stretch gap-0 sm:grid-cols-2">
          <div className="order-2 flex flex-col justify-center px-6 py-9 sm:order-1 sm:px-8 sm:py-10 lg:px-10">
            {about.eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                {about.eyebrow}
              </p>
            )}

            {about.heading && (
              <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-[1.75rem] lg:text-[2rem]">
                {about.heading}
              </h2>
            )}

            {about.body && (
              <p className="mt-4 max-w-prose whitespace-pre-line text-pretty text-[15px] leading-relaxed text-ink-secondary">
                {about.body}
              </p>
            )}

            {showCta && (
              <Link
                href={about.ctaHref}
                className="group mt-7 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-noir px-6 text-sm font-semibold text-white transition hover:bg-brand"
              >
                {about.ctaLabel}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            )}
          </div>

          {hasMedia && (
            <div className="order-1 min-h-[15rem] sm:order-2 sm:min-h-[22rem]">
              <Media
                url={about.mediaUrl}
                alt=""
                // A clip here is scenery, so it plays itself, quietly, from the
                // frame the shop chose rather than whichever one came first.
                autoPlay={video}
                poster={about.posterUrl || null}
                sizes="(min-width: 640px) 26rem, 100vw"
                className="size-full min-h-[15rem] sm:min-h-[22rem]"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
