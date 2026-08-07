"use client";

import dynamic from "next/dynamic";

import type { CatalogueDefaults } from "@/lib/catalogue-settings";
import type { Category } from "@/lib/types";

/**
 * The uploader restores unsaved work from this browser during its first render,
 * so it must not be server-rendered — otherwise the server would paint an empty
 * form and the restored drafts would appear as a hydration mismatch.
 */
const ProductUploader = dynamic(
  () => import("./product-uploader").then((module) => module.ProductUploader),
  {
    ssr: false,
    loading: () => (
      <div className="card h-64 animate-pulse bg-surface" aria-hidden />
    ),
  },
);

export function ProductUploaderMount(props: {
  categories: Category[];
  subcategories: string[];
  aiEnabled: boolean;
  defaults: CatalogueDefaults;
  defaultLowStock: number;
}) {
  return <ProductUploader {...props} />;
}
