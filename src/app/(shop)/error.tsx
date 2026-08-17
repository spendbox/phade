"use client";

import Link from "next/link";

/**
 * A crash anywhere in the shop, caught before it can blank the page.
 *
 * This one keeps the layout — header, footer, fonts — so a shopper who hits it
 * is still somewhere rather than nowhere, and can walk into the shop from the
 * menu without knowing anything went wrong. `global-error.tsx` is the harder
 * fallback for when the layout itself is what failed.
 */
export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <span aria-hidden className="block h-px w-10 bg-brand" />

      <h1 className="mt-6 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        This page didn&apos;t load
      </h1>

      <p className="mt-3 text-pretty text-[15px] leading-relaxed text-ink-secondary">
        Nothing is lost — your bag is still where you left it. Try again, and if
        it keeps happening, send us the reference below and we&apos;ll fix it.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-full bg-noir px-6 text-sm font-medium text-white transition hover:bg-brand"
        >
          Try again
        </button>
        <Link
          href="/shop"
          className="inline-flex h-11 items-center rounded-full px-6 text-sm font-medium text-ink-secondary ring-1 ring-inset ring-line-strong transition hover:bg-canvas-deep hover:text-ink"
        >
          Open the shop
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 font-mono text-xs text-ink-muted">
          Reference {error.digest}
        </p>
      )}
    </main>
  );
}
