import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * The heading over a rail or a grid: what this is, and the way through to all
 * of it. Every section on the shop uses it, so a shopper only learns the
 * pattern once.
 */
export function SectionHead({
  title,
  note,
  href,
  hrefLabel = "See all",
  className,
}: {
  title: string;
  note?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-4 px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {title}
        </h2>
        {note && <p className="mt-1 text-sm text-ink-secondary">{note}</p>}
      </div>

      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink-secondary transition hover:text-brand"
        >
          {hrefLabel}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      )}
    </div>
  );
}
