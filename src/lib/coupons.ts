import { formatNairaShort } from "@/lib/format";
import { getSupabase } from "@/lib/supabase";
import { discountState, type Discount } from "@/lib/types";

/**
 * Coupon codes, redeemed.
 *
 * The dashboard has always been able to create a sale that needs a code typed
 * at checkout — it just had nowhere to be typed. This is that side of it: the
 * shop looks the code up, decides what it is worth against the bag in front of
 * it, and says so in words a shopper can act on.
 *
 * Nothing here trusts the browser. The checkout form uses it to show a shopper
 * what a code does before they commit, and `placeOrder` runs the very same
 * check again on the bag it is about to charge for — so a code that expired
 * between the two, or an amount edited in a console, changes nothing about
 * what is billed.
 */

/** One priced line of the bag, as the server worked it out. */
export type CouponLine = {
  productId: string;
  categoryId: string | null;
  priceKobo: number;
  quantity: number;
};

export type AppliedCoupon = {
  id: string;
  code: string;
  /** The sale's own name — "Eid weekend", not the code. */
  name: string;
  amountKobo: number;
};

export type CouponCheck =
  | { ok: true; coupon: AppliedCoupon }
  | { ok: false; error: string };

/** Codes are stored upper-case, and nobody types them that way. */
export function normaliseCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 40);
}

function lineTotal(line: CouponLine): number {
  return Math.max(line.priceKobo, 0) * Math.max(line.quantity, 0);
}

/**
 * What a code takes off this bag, or why it takes nothing.
 *
 * The discount lands on the lines it covers, never on delivery, and never on
 * more than those lines are worth — a ₦10,000-off code on a ₦6,000 bag is
 * ₦6,000 off, not a refund.
 *
 * Prices in `lines` already carry any automatic sale that is running, so a
 * coupon deepens a sale rather than replacing it. That is the shop's choice to
 * make: a code that shouldn't stack with a sale simply shouldn't be running
 * beside one.
 */
export async function checkCouponAgainst(
  rawCode: string,
  lines: CouponLine[],
): Promise<CouponCheck> {
  const code = normaliseCode(rawCode);
  if (!code) return { ok: false, error: "Type a code first." };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "We can't check codes right now." };

  const { data, error } = await supabase
    .from("discounts")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) return { ok: false, error: "We can't check codes right now." };
  if (!data) return { ok: false, error: "We don't recognise that code." };

  const discount = data as Discount;
  const state = discountState(discount);

  if (state === "ended") return { ok: false, error: "That code has expired." };
  if (state !== "active") {
    return { ok: false, error: "That code isn't running at the moment." };
  }

  if (
    discount.usage_limit !== null &&
    discount.used_count >= discount.usage_limit
  ) {
    return { ok: false, error: "That code has been fully claimed." };
  }

  const subtotal = lines.reduce((total, line) => total + lineTotal(line), 0);

  if (discount.min_order_kobo > 0 && subtotal < discount.min_order_kobo) {
    return {
      ok: false,
      error: `That code needs an order of ${formatNairaShort(
        discount.min_order_kobo,
      )} or more.`,
    };
  }

  const covered = await coveredLines(discount, lines);
  const eligible = covered.reduce((total, line) => total + lineTotal(line), 0);

  if (eligible <= 0) {
    return {
      ok: false,
      error: "That code doesn't apply to anything in your bag.",
    };
  }

  const raw =
    discount.kind === "percentage"
      ? Math.round((eligible * Math.min(discount.value, 100)) / 100)
      : discount.value;

  const amountKobo = Math.max(Math.min(raw, eligible), 0);

  if (amountKobo <= 0) {
    return { ok: false, error: "That code takes nothing off this bag." };
  }

  return {
    ok: true,
    coupon: {
      id: discount.id,
      code,
      name: discount.name,
      amountKobo,
    },
  };
}

/** The lines a sale's scope actually reaches. */
async function coveredLines(
  discount: Discount,
  lines: CouponLine[],
): Promise<CouponLine[]> {
  if (discount.scope === "all") return lines;

  const supabase = getSupabase();
  if (!supabase) return [];

  if (discount.scope === "products") {
    const { data } = await supabase
      .from("discount_products")
      .select("product_id")
      .eq("discount_id", discount.id);

    const ids = new Set(
      ((data ?? []) as { product_id: string }[]).map((row) => row.product_id),
    );
    return lines.filter((line) => ids.has(line.productId));
  }

  const { data } = await supabase
    .from("discount_categories")
    .select("category_id")
    .eq("discount_id", discount.id);

  const ids = new Set(
    ((data ?? []) as { category_id: string }[]).map((row) => row.category_id),
  );
  return lines.filter((line) => line.categoryId && ids.has(line.categoryId));
}
