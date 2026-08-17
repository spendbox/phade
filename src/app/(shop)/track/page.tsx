import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, PackageSearch } from "lucide-react";

import { ContactLink } from "@/components/shop/contact-link";
import { getStorefront } from "@/lib/storefront";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Follow an order from paid to delivered with the reference on your confirmation.",
};

/**
 * Finding an order again.
 *
 * There are no shopper accounts here, so the reference is the key — it is
 * unguessable, it is on the confirmation page and in the email, and it is the
 * only thing anyone needs to see where their parcel is. Typing it here lands
 * on the same page they were sent to after paying, which is the page that
 * shows how far along the shop has moved it.
 *
 * A plain form with a GET: no JavaScript, no action, and the reference ends up
 * in the address bar where it can be bookmarked.
 */
export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  const wanted = reference?.trim().toUpperCase();

  if (wanted) redirect(`/order/${encodeURIComponent(wanted)}`);

  const content = await getStorefront();

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <span className="flex size-14 items-center justify-center rounded-full bg-canvas-deep text-ink">
        <PackageSearch className="size-6" aria-hidden />
      </span>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Track your order
      </h1>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-secondary">
        Enter the reference from your confirmation — it looks like
        <span className="font-medium text-ink"> PW-XXXXXXXX</span> — and
        we&apos;ll show you exactly where it has got to.
      </p>

      <form method="get" className="mt-6">
        <label
          htmlFor="reference"
          className="block text-[13px] font-medium text-ink-secondary"
        >
          Order reference
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="reference"
            name="reference"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="PW-4F2A9C7E1B"
            className="h-12 min-w-0 flex-1 rounded-2xl bg-canvas-deep px-4 text-sm uppercase tracking-wide text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            className="group flex h-12 shrink-0 items-center gap-2 rounded-full bg-noir px-6 text-sm font-semibold text-white transition hover:bg-brand"
          >
            Find it
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        </div>
      </form>

      <p className="mt-6 text-[13px] text-ink-secondary">
        Can&apos;t find the reference? It&apos;s in the email we sent when you
        paid. If it isn&apos;t there,{" "}
        <ContactLink support={content.support}>message us</ContactLink>{" "}
        with the name and phone number you ordered with and we&apos;ll look it
        up.
      </p>
    </div>
  );
}
