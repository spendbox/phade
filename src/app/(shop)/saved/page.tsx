import type { Metadata } from "next";

import { SavedGrid } from "@/components/shop/saved-grid";
import { ProductRegistry } from "@/components/shop/shop-provider";
import { getCatalogue } from "@/lib/shop-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved",
  description: "The pieces you saved, waiting on this device.",
};

export default async function SavedPage() {
  const { products } = await getCatalogue();

  return (
    <>
      <ProductRegistry products={products} />

      <h1 className="px-4 pt-6 text-2xl font-semibold tracking-tight text-ink sm:px-6 sm:text-3xl lg:px-8">
        Saved
      </h1>

      <SavedGrid products={products} />
    </>
  );
}
