import type { Metadata } from "next";
import Link from "next/link";

import { LOGO_MARK } from "@/lib/brand";
import { getStorefront } from "@/lib/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "phadewoman",
  description: "Building something amazing.",
};

/**
 * The holding page, driven by Settings → Storefront. It is the only place the
 * hero copy is visible today, so editing it there has somewhere to land rather
 * than sitting in the database waiting for a shop to be built around it.
 */
export default async function Home() {
  const content = await getStorefront();
  const showCta = Boolean(content.heroCtaLabel && content.heroCtaHref);
  const cover = content.heroImages[0];

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      {content.announcementEnabled && content.announcement && (
        <p className="bg-ink px-4 py-2 text-center text-[13px] text-white">
          {content.announcement}
        </p>
      )}

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_MARK}
          alt="phadewoman"
          className="h-20 w-auto sm:h-24"
          fetchPriority="high"
        />

        <h1 className="mt-10 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          {content.heroHeadline}
        </h1>

        {content.heroSubheadline && (
          <p className="mt-4 max-w-xl text-balance text-base text-ink-secondary sm:text-lg">
            {content.heroSubheadline}
          </p>
        )}

        {showCta && (
          <Link
            href={content.heroCtaHref}
            className="mt-8 inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-medium text-white transition hover:opacity-90"
          >
            {content.heroCtaLabel}
          </Link>
        )}

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="mt-12 max-h-[45vh] w-full max-w-3xl rounded-2xl object-cover"
          />
        )}
      </main>
    </div>
  );
}
