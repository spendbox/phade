import { cn } from "@/lib/cn";

/**
 * The shape of what's coming.
 *
 * A page that is still being built on the server used to be a blank screen and
 * a browser tab spinner, which is indistinguishable from a page that isn't
 * going to load at all. These stand in its place: the same boxes, in the same
 * arrangement, shimmering — so the layout doesn't jump when the real thing
 * arrives, and nobody wonders whether to press back.
 *
 * They are deliberately dumb. A skeleton that got clever about matching the
 * exact contents would be a second copy of every page to keep in step.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("shimmer block rounded-lg", className)} />;
}

/** A grid of product tiles, the shape `ProductCard` renders. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      aria-hidden
      className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
          <Skeleton className="mt-2.5 h-3.5 w-3/4" />
          <Skeleton className="mt-1.5 h-3.5 w-1/3" />
        </li>
      ))}
    </ul>
  );
}

/** A sideways rail of them. */
export function RailSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden className="flex gap-3 overflow-hidden px-4 sm:gap-4 sm:px-6 lg:px-8">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="w-[45vw] max-w-[15rem] shrink-0 sm:w-52 lg:w-56">
          <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
          <Skeleton className="mt-2.5 h-3.5 w-3/4" />
          <Skeleton className="mt-1.5 h-3.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** A section's heading and the line under it. */
export function HeadingSkeleton() {
  return (
    <div aria-hidden className="px-4 sm:px-6 lg:px-8">
      <Skeleton className="h-6 w-44 rounded-full" />
      <Skeleton className="mt-2.5 h-3.5 w-64 max-w-full rounded-full" />
    </div>
  );
}
