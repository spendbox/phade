import { ProductGridSkeleton, Skeleton } from "@/components/shop/skeleton";

/** The catalogue, while it is being built. */
export default function ShopLoading() {
  return (
    <div className="px-4 pb-10 pt-4 sm:px-6 lg:px-8" aria-busy>
      <span className="sr-only" role="status">
        Loading the shop
      </span>

      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      <Skeleton className="mt-6 h-7 w-40 rounded-full" />

      <div className="mt-6">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
