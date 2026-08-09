import {
  HeadingSkeleton,
  RailSkeleton,
  Skeleton,
} from "@/components/shop/skeleton";

/**
 * The front page, while it is being built.
 *
 * Next streams this in place of the page the moment someone asks for it, so a
 * shopper on a slow connection sees the shape of the shop rather than a white
 * screen and a tab spinner — which are the same thing as a page that failed.
 */
export default function LandingLoading() {
  return (
    <div className="space-y-12 pb-10 pt-4" aria-busy>
      <span className="sr-only" role="status">
        Loading the shop
      </span>

      <Skeleton className="mx-4 h-[60svh] rounded-3xl sm:mx-6 lg:mx-8" />

      <div className="space-y-4">
        <HeadingSkeleton />
        <div className="flex gap-3 overflow-hidden px-4 sm:gap-4 sm:px-6 lg:px-8">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              className="aspect-square w-40 shrink-0 rounded-3xl sm:w-48"
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <HeadingSkeleton />
        <RailSkeleton />
      </div>

      <div className="space-y-4">
        <HeadingSkeleton />
        <RailSkeleton />
      </div>
    </div>
  );
}
