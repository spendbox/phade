import { ProductGridSkeleton, Skeleton } from "@/components/shop/skeleton";

/** Saved pieces, while they are being read back. */
export default function SavedLoading() {
  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-8" aria-busy>
      <span className="sr-only" role="status">
        Loading your saved pieces
      </span>
      <Skeleton className="h-7 w-32 rounded-full" />
      <div className="mt-6">
        <ProductGridSkeleton count={4} />
      </div>
    </div>
  );
}
