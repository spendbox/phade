import Link from "next/link";
import type { Metadata } from "next";

import { LOGO_MARK } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Page not found · phadewoman",
};

/**
 * Shown for any address that doesn't exist, on the shop and in the dashboard
 * alike. It offers a way onward rather than just stating the problem — the
 * usual reason someone lands here is a stale link or a mistyped path.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 py-16 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_MARK} alt="phadewoman" className="h-14 w-auto sm:h-16" />

      <p className="mt-10 text-sm font-medium tracking-wide text-brand">404</p>

      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        We can&apos;t find that page
      </h1>

      <p className="mt-3 max-w-md text-balance text-base text-ink-secondary">
        The link may be out of date, or the address mistyped. Nothing is broken
        — it just isn&apos;t here.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-medium text-white transition hover:opacity-90"
        >
          Back to the shop
        </Link>
        <Link
          href="/admin"
          className="inline-flex h-11 items-center rounded-full px-6 text-sm font-medium text-ink-secondary ring-1 ring-inset ring-line-strong transition hover:bg-plane hover:text-ink"
        >
          Go to the dashboard
        </Link>
      </div>
    </main>
  );
}
