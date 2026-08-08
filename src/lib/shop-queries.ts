import { cache } from "react";
import { unstable_cache } from "next/cache";

import { getSupabase } from "@/lib/supabase";
import {
  priceWithSales,
  type AutomaticDiscount,
  type ShopCategory,
  type ShopProduct,
} from "@/lib/shop";
import {
  discountState,
  type Category,
  type Discount,
  type OrderStatus,
  type OrderWithRelations,
  type ProductWithCategory,
  type Subcategory,
} from "@/lib/types";

/**
 * Read-side queries for the storefront.
 *
 * These run on the server with the service-role key, exactly like the
 * dashboard's, and only ever select active products — a draft or archived row
 * must never reach a shopper. They return plain values rather than
 * `{ data, error }`: a shop with no database behind it should render an empty,
 * calm page, not an error panel.
 *
 * The catalogue is small enough to load whole, which is what lets a tap on a
 * product open a pop-up with everything already in hand instead of a fetch.
 */

/** Statuses that mean the money arrived, for "best seller" counts. */
const SOLD_STATUSES: OrderStatus[] = [
  "paid",
  "processing",
  "shipped",
  "delivered",
];

/** Enough for this catalogue several times over, and a ceiling all the same. */
const CATALOGUE_LIMIT = 500;

export type ShopCatalogue = {
  products: ShopProduct[];
  categories: ShopCategory[];
  /** Subcategory names by category slug, for the second row of chips. */
  subcategories: Record<string, string[]>;
};

const EMPTY: ShopCatalogue = { products: [], categories: [], subcategories: {} };

/** Sales with no coupon code, running right now — the ones we can price with. */
async function activeAutomaticDiscounts(): Promise<AutomaticDiscount[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("discounts")
    .select("*")
    .is("code", null)
    .eq("enabled", true);

  if (error || !data) return [];

  const running = (data as Discount[]).filter(
    (discount) => discountState(discount) === "active",
  );
  if (running.length === 0) return [];

  const scoped = running.filter((discount) => discount.scope !== "all");
  const ids = scoped.map((discount) => discount.id);

  const [categoryLinks, productLinks] = await Promise.all([
    ids.length > 0
      ? supabase
          .from("discount_categories")
          .select("discount_id, category_id")
          .in("discount_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length > 0
      ? supabase
          .from("discount_products")
          .select("discount_id, product_id")
          .in("discount_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const byCategory = new Map<string, string[]>();
  for (const row of (categoryLinks.data ?? []) as {
    discount_id: string;
    category_id: string;
  }[]) {
    byCategory.set(row.discount_id, [
      ...(byCategory.get(row.discount_id) ?? []),
      row.category_id,
    ]);
  }

  const byProduct = new Map<string, string[]>();
  for (const row of (productLinks.data ?? []) as {
    discount_id: string;
    product_id: string;
  }[]) {
    byProduct.set(row.discount_id, [
      ...(byProduct.get(row.discount_id) ?? []),
      row.product_id,
    ]);
  }

  return running.map((discount) => ({
    id: discount.id,
    name: discount.name,
    kind: discount.kind,
    value: discount.value,
    scope: discount.scope,
    categoryIds: byCategory.get(discount.id) ?? [],
    productIds: byProduct.get(discount.id) ?? [],
  }));
}

/** Units sold per product, across orders that were actually paid for. */
async function soldByProduct(): Promise<Map<string, number>> {
  const supabase = getSupabase();
  const sold = new Map<string, number>();
  if (!supabase) return sold;

  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, quantity, order:orders!inner(status)");

  if (error || !data) return sold;

  for (const row of data as unknown as {
    product_id: string | null;
    quantity: number;
    order: { status: OrderStatus } | null;
  }[]) {
    if (!row.product_id || !row.order) continue;
    if (!SOLD_STATUSES.includes(row.order.status)) continue;
    sold.set(row.product_id, (sold.get(row.product_id) ?? 0) + row.quantity);
  }

  return sold;
}

function toShopProduct(
  row: ProductWithCategory,
  discounts: AutomaticDiscount[],
  sold: Map<string, number>,
): ShopProduct {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    media: Array.isArray(row.images) ? row.images.filter(Boolean) : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    colors: Array.isArray(row.colors) ? row.colors : [],
    sizes: Array.isArray(row.sizes) ? row.sizes : [],
    stock: row.stock,
    ...priceWithSales(row, discounts),
    categoryId: row.category_id,
    categoryName: row.category?.name ?? null,
    categorySlug: row.category?.slug ?? null,
    subcategory: row.subcategory,
    sold: sold.get(row.id) ?? 0,
    createdAt: row.created_at,
  };
}

/**
 * The tag every storefront read is filed under. The dashboard drops it after a
 * change, so a new price or a published product reaches shoppers at once
 * rather than waiting out the window below.
 */
export const CATALOGUE_TAG = "shop-catalogue";

/** How long the shop may keep serving a catalogue it already has in hand. */
const CATALOGUE_SECONDS = 60;

async function loadCatalogue(): Promise<ShopCatalogue> {
  const supabase = getSupabase();
  if (!supabase) return EMPTY;

  const [products, categories, subcategories, discounts, sold] =
    await Promise.all([
      supabase
        .from("products")
        .select("*, category:categories(id, name, slug)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(CATALOGUE_LIMIT),
      supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("subcategories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      activeAutomaticDiscounts(),
      soldByProduct(),
    ]);

  if (products.error) return EMPTY;

  const rows = (products.data ?? []) as unknown as ProductWithCategory[];
  const shopProducts = rows.map((row) => toShopProduct(row, discounts, sold));

  const counts = new Map<string, number>();
  for (const product of shopProducts) {
    if (!product.categoryId) continue;
    counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
  }

  // An empty category is a dead end for a shopper, so it stays off the rail.
  const shopCategories = ((categories.data ?? []) as Category[])
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      imageUrl: category.image_url,
      count: counts.get(category.id) ?? 0,
    }))
    .filter((category) => category.count > 0);

  const slugById = new Map(
    shopCategories.map((category) => [category.id, category.slug]),
  );

  // Only offer a subcategory that something is actually filed under, matched
  // on name because that is what the product row stores.
  const used = new Set(
    shopProducts.flatMap((product) =>
      product.subcategory && product.categorySlug
        ? [`${product.categorySlug}|${product.subcategory.toLowerCase()}`]
        : [],
    ),
  );

  const grouped: Record<string, string[]> = {};
  for (const row of (subcategories.data ?? []) as Subcategory[]) {
    if (!row.category_id) continue;
    const slug = slugById.get(row.category_id);
    if (!slug) continue;
    if (!used.has(`${slug}|${row.name.toLowerCase()}`)) continue;
    grouped[slug] = [...(grouped[slug] ?? []), row.name];
  }

  return {
    products: shopProducts,
    categories: shopCategories,
    subcategories: grouped,
  };
}

/**
 * Everything the shop needs, in one place: the live catalogue, the categories
 * that actually have something in them, and their subcategories.
 *
 * Two layers of caching, because they answer different questions. `cache` is
 * per request: the layout's header and the page underneath it ask the same
 * thing, and should not both pay for it. `unstable_cache` is across requests:
 * every visitor was otherwise costing five queries — one of them a scan of
 * every order line ever written, to work out what sells best — and a catalogue
 * does not change between two people looking at it a second apart.
 *
 * A minute is the ceiling, not the resolution. Publishing a product, editing a
 * price or starting a sale drops the tag through `@/lib/admin-revalidate`, so
 * the shop is right immediately; the window only covers changes made straight
 * in the database.
 */
export const getCatalogue = cache(async function getCatalogue(): Promise<ShopCatalogue> {
  return unstable_cache(loadCatalogue, ["shop-catalogue"], {
    revalidate: CATALOGUE_SECONDS,
    tags: [CATALOGUE_TAG],
  })();
});

/** One product, for a shared link that lands on the full page. */
export async function getShopProduct(
  slug: string,
): Promise<ShopProduct | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(id, name, slug)")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  const [discounts, sold] = await Promise.all([
    activeAutomaticDiscounts(),
    soldByProduct(),
  ]);

  return toShopProduct(data as unknown as ProductWithCategory, discounts, sold);
}

/**
 * The named products, priced on the server.
 *
 * Checkout uses this and nothing else: what the browser sends is a list of
 * product ids and quantities, never a price. Anything a shopper could edit in
 * a console is re-derived here from the catalogue and the sales actually
 * running, so the only way to pay less is for the shop to charge less.
 */
export async function getProductsForPricing(
  ids: string[],
): Promise<ShopProduct[]> {
  const supabase = getSupabase();
  if (!supabase || ids.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(id, name, slug)")
    .eq("status", "active")
    .in("id", ids);

  if (error || !data) return [];

  const discounts = await activeAutomaticDiscounts();
  const sold = new Map<string, number>();

  return (data as unknown as ProductWithCategory[]).map((row) =>
    toShopProduct(row, discounts, sold),
  );
}

/**
 * One order, found by the reference in its own URL.
 *
 * That reference is the only key a shopper holds — there are no accounts — so
 * it is generated random and long rather than sequential. Guessing one is the
 * only way in, and there is nothing to guess from.
 */
export async function getOrderByReference(
  reference: string,
): Promise<OrderWithRelations | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("orders")
    .select("*, customer:customers(*), items:order_items(*)")
    .eq("reference", reference)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as OrderWithRelations;
}

/** Every active slug, for the sitemap and static params. */
export async function getShopProductSlugs(): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("status", "active")
    .limit(CATALOGUE_LIMIT);

  if (error || !data) return [];
  return (data as { slug: string }[]).map((row) => row.slug);
}

// ---------------------------------------------------------------------------
// Slices of the catalogue the pages ask for by name
// ---------------------------------------------------------------------------

export function bestSellers(products: ShopProduct[], limit = 12): ShopProduct[] {
  return [...products]
    .filter((product) => product.sold > 0)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, limit);
}

export function newIn(products: ShopProduct[], limit = 12): ShopProduct[] {
  return [...products]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

export function onSale(products: ShopProduct[], limit = 12): ShopProduct[] {
  return products.filter((product) => product.saleLabel).slice(0, limit);
}

/** The admin's chosen products, in the order they were picked. */
export function featured(
  products: ShopProduct[],
  ids: string[],
): ShopProduct[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}
