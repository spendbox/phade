import type { Discount, ProductColor } from "@/lib/types";

/**
 * The shopper-facing shape of the catalogue.
 *
 * The admin types (`Product`, `Category`) carry cost prices, draft rows and
 * internal counters. Nothing here is a secret worth guarding, but a storefront
 * component should not have to know which fields it may render — so the shop
 * gets its own narrow types, built once on the server, and the price a shopper
 * sees is resolved there too rather than in a dozen components.
 */

export type ShopCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  /** Cover taken from the first product in the category when there's no image. */
  cover: string | null;
  count: number;
};

export type ShopProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  media: string[];
  tags: string[];
  colors: ProductColor[];
  sizes: number[];
  stock: number;
  /** What it costs today — a live sale is already applied. */
  priceKobo: number;
  /** The struck-through price, or null when there's nothing to compare to. */
  compareAtKobo: number | null;
  /** "20% off" / "₦5,000 off" — present only while a sale is running. */
  saleLabel: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  subcategory: string | null;
  /** Units sold across orders that were paid for. Drives "best sellers". */
  sold: number;
  createdAt: string;
};

/** A sale that needs no coupon code, so the storefront can price with it. */
export type AutomaticDiscount = Pick<
  Discount,
  "id" | "name" | "kind" | "value" | "scope"
> & {
  categoryIds: string[];
  productIds: string[];
};

/** Anything added in the last fortnight wears the "New in" mark. */
export const NEW_IN_DAYS = 14;

export function isNewIn(createdAt: string, now = Date.now()): boolean {
  const added = new Date(createdAt).getTime();
  if (Number.isNaN(added)) return false;
  return now - added < NEW_IN_DAYS * 24 * 60 * 60 * 1000;
}

function appliesTo(
  discount: AutomaticDiscount,
  product: { id: string; category_id: string | null },
): boolean {
  if (discount.scope === "all") return true;
  if (discount.scope === "products") {
    return discount.productIds.includes(product.id);
  }
  return Boolean(
    product.category_id && discount.categoryIds.includes(product.category_id),
  );
}

/**
 * The price a shopper pays, given every automatic sale running right now.
 *
 * When two sales both cover a product the shopper gets the better one — never
 * both stacked, which is how a ₦40,000 dress ends up at ₦0.
 */
export function priceWithSales(
  product: {
    id: string;
    category_id: string | null;
    price_kobo: number;
    compare_at_price_kobo: number | null;
  },
  discounts: AutomaticDiscount[],
): Pick<ShopProduct, "priceKobo" | "compareAtKobo" | "saleLabel"> {
  const list = Math.max(product.price_kobo, 0);

  let best = list;
  let winner: AutomaticDiscount | null = null;

  for (const discount of discounts) {
    if (!appliesTo(discount, product)) continue;

    const reduced =
      discount.kind === "percentage"
        ? Math.round(list * (1 - Math.min(discount.value, 100) / 100))
        : list - discount.value;

    // A sale never turns into a refund.
    const candidate = Math.max(reduced, 0);
    if (candidate < best) {
      best = candidate;
      winner = discount;
    }
  }

  if (!winner) {
    // Without a sale, the compare-at price is whatever the admin typed — but
    // only when it is genuinely higher, so a stale value can't show a discount
    // that isn't there.
    const compare =
      product.compare_at_price_kobo && product.compare_at_price_kobo > list
        ? product.compare_at_price_kobo
        : null;
    return { priceKobo: list, compareAtKobo: compare, saleLabel: null };
  }

  return {
    priceKobo: best,
    compareAtKobo: list,
    saleLabel:
      winner.kind === "percentage"
        ? `${Math.round(winner.value)}% off`
        : `₦${Math.round(winner.value / 100).toLocaleString("en-NG")} off`,
  };
}

/** Percentage saved, for the badge on a card. Null when nothing is off. */
export function percentOff(product: {
  priceKobo: number;
  compareAtKobo: number | null;
}): number | null {
  if (!product.compareAtKobo || product.compareAtKobo <= product.priceKobo) {
    return null;
  }
  const off =
    ((product.compareAtKobo - product.priceKobo) / product.compareAtKobo) * 100;
  return Math.round(off);
}

export function isSoldOut(product: Pick<ShopProduct, "stock">): boolean {
  return product.stock <= 0;
}

/** The tiny handful of units that make a product feel like it's going. */
export const LOW_STOCK_SHOWS_AT = 4;

// ---------------------------------------------------------------------------
// The bag
// ---------------------------------------------------------------------------

/**
 * One line in the bag. Colour and size are part of the identity of a line —
 * the same dress in two sizes is two lines, not a quantity of two.
 */
export type BagLine = {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  priceKobo: number;
  quantity: number;
  color: string | null;
  size: number | null;
};

export function lineKey(
  line: Pick<BagLine, "productId" | "color" | "size">,
): string {
  return [line.productId, line.color ?? "", line.size ?? ""].join("|");
}

export function bagSubtotal(lines: BagLine[]): number {
  return lines.reduce(
    (total, line) => total + line.priceKobo * line.quantity,
    0,
  );
}

export function bagCount(lines: BagLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

/** How many of one line a shopper may buy. Keeps a typo from ordering 900. */
export const MAX_LINE_QUANTITY = 20;
