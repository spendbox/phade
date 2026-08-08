"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";

import { saveCart } from "@/lib/cart-store";
import { checkCouponAgainst, type CouponLine } from "@/lib/coupons";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { getProductsForPricing } from "@/lib/shop-queries";
import { getShipping, NIGERIAN_STATES, quoteDelivery } from "@/lib/shipping";
import { requireSupabase } from "@/lib/supabase";
import type { Fulfilment, ShippingAddress } from "@/lib/types";

/**
 * Placing an order.
 *
 * The browser sends what a shopper chose — products, quantities, colours,
 * sizes, a coupon code — and never what any of it costs. Every price, every
 * sale, what the code is worth and the delivery charge are worked out here
 * against the catalogue as it stands right now. That is the whole security
 * model of the checkout: a bag is a request, not a quote.
 *
 * The order is written before payment starts, with our own reference on it, so
 * an abandoned payment leaves a pending order the dashboard can chase rather
 * than nothing at all. The Paystack webhook finds the order again by that same
 * reference and marks it paid.
 */

export type CheckoutState =
  | { ok: null }
  | { ok: false; error: string }
  | { ok: true; redirect: string };

type SubmittedLine = {
  productId: string;
  quantity: number;
  color: string | null;
  size: number | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readLines(raw: FormDataEntryValue | null): SubmittedLine[] {
  try {
    const parsed: unknown = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, 100).flatMap((item): SubmittedLine[] => {
      if (typeof item !== "object" || item === null) return [];
      const line = item as Record<string, unknown>;
      if (typeof line.productId !== "string") return [];

      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) return [];

      const size = Number(line.size);
      return [
        {
          productId: line.productId,
          quantity: Math.min(Math.trunc(quantity), 20),
          color: typeof line.color === "string" ? line.color.slice(0, 60) : null,
          size: Number.isFinite(size) && size > 0 ? Math.trunc(size) : null,
        },
      ];
    });
  } catch {
    return [];
  }
}

/**
 * Prices the submitted bag from the catalogue, for a coupon to be judged
 * against. Same route the order itself takes, so what a shopper is quoted when
 * they type a code is what they are charged when they pay.
 */
async function couponLines(lines: SubmittedLine[]): Promise<CouponLine[]> {
  const products = await getProductsForPricing(
    lines.map((line) => line.productId),
  );
  const byId = new Map(products.map((product) => [product.id, product]));

  return lines.flatMap((line) => {
    const product = byId.get(line.productId);
    return product
      ? [
          {
            productId: product.id,
            categoryId: product.categoryId,
            priceKobo: product.priceKobo,
            quantity: line.quantity,
          },
        ]
      : [];
  });
}

export type CouponState =
  | { ok: true; code: string; name: string; amountKobo: number }
  | { ok: false; error: string };

/**
 * Tries a coupon code against the bag, for the checkout page to show what it
 * is worth before anyone commits to it.
 *
 * It answers with an amount, not with permission: the same check runs again
 * inside `placeOrder`, which is the only one that decides what is charged.
 */
export async function tryCoupon(input: {
  code: string;
  lines: string;
}): Promise<CouponState> {
  try {
    const lines = readLines(input.lines);
    if (lines.length === 0) return { ok: false, error: "Your bag is empty." };

    const result = await checkCouponAgainst(
      String(input.code ?? ""),
      await couponLines(lines),
    );

    return result.ok
      ? {
          ok: true,
          code: result.coupon.code,
          name: result.coupon.name,
          amountKobo: result.coupon.amountKobo,
        }
      : result;
  } catch (error) {
    console.error("[checkout] coupon check failed", error);
    return { ok: false, error: "We couldn't check that code just now." };
  }
}

/** A reference nobody can guess: the order page is reachable with it alone. */
function newReference(): string {
  return `PW-${randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
}

async function origin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "";
  const proto = list.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

export async function placeOrder(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  try {
    const supabase = requireSupabase();

    const lines = readLines(formData.get("lines"));
    if (lines.length === 0) {
      return { ok: false, error: "Your bag is empty." };
    }

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim();
    const fulfilment: Fulfilment =
      formData.get("fulfilment") === "pickup" ? "pickup" : "shipping";

    if (!name) return { ok: false, error: "Tell us who the order is for." };
    if (!EMAIL.test(email)) {
      return { ok: false, error: "That email address doesn't look right." };
    }
    if (phone.length < 7) {
      return { ok: false, error: "Add a phone number we can reach you on." };
    }

    const address: ShippingAddress = {
      line1: String(formData.get("line1") ?? "").trim(),
      line2: String(formData.get("line2") ?? "").trim() || undefined,
      city: String(formData.get("city") ?? "").trim(),
      state: String(formData.get("state") ?? "").trim(),
      country: "Nigeria",
      phone,
    };

    if (
      fulfilment === "shipping" &&
      (!address.line1 || !address.city || !address.state)
    ) {
      return {
        ok: false,
        error: "Add the street, city and state we're delivering to.",
      };
    }

    // Delivery is priced by state, so an unrecognised one would silently fall
    // back to the default rate and undercharge for the far end of the country.
    if (
      fulfilment === "shipping" &&
      !NIGERIAN_STATES.some((name) => name === address.state)
    ) {
      return { ok: false, error: "Choose a state from the list." };
    }

    // ---- price it, from the catalogue rather than from the browser ---------
    const products = await getProductsForPricing(
      lines.map((line) => line.productId),
    );
    const byId = new Map(products.map((product) => [product.id, product]));

    const priced = lines.flatMap((line) => {
      const product = byId.get(line.productId);
      return product ? [{ line, product }] : [];
    });

    if (priced.length === 0) {
      return {
        ok: false,
        error: "Nothing in your bag is still available. Please start again.",
      };
    }

    const short = priced.find(
      ({ line, product }) => product.stock < line.quantity,
    );
    if (short) {
      return {
        ok: false,
        error:
          short.product.stock <= 0
            ? `${short.product.name} has just sold out. Remove it to carry on.`
            : `Only ${short.product.stock} of ${short.product.name} left. Lower the quantity to carry on.`,
      };
    }

    const subtotal = priced.reduce(
      (total, { line, product }) => total + product.priceKobo * line.quantity,
      0,
    );

    // Priced here, from the shop's own rules, against the state on this order.
    // Whatever the browser was showing is a quote; this is the charge.
    const rules = await getShipping();
    if (fulfilment === "pickup" && !rules.pickupEnabled) {
      return { ok: false, error: "Collection isn't available — choose delivery." };
    }

    // Quoted on the merchandise total, before any coupon: a code takes money
    // off the clothes, not off the courier, and free-delivery thresholds are
    // met by what was actually spent on the shop.
    const shipping = quoteDelivery(rules, subtotal, {
      fulfilment,
      state: address.state,
    }).feeKobo;

    // ---- coupon, re-checked rather than believed --------------------------
    const submittedCode = String(formData.get("coupon") ?? "").trim();
    const coupon = submittedCode
      ? await checkCouponAgainst(
          submittedCode,
          priced.map(({ line, product }) => ({
            productId: product.id,
            categoryId: product.categoryId,
            priceKobo: product.priceKobo,
            quantity: line.quantity,
          })),
        )
      : null;

    // A code that stopped working between typing it and paying stops the
    // order. Charging the full price of a bag someone agreed to at a discount
    // is the one outcome worse than making them try again.
    if (coupon && !coupon.ok) {
      return { ok: false, error: `${coupon.error} Remove it to carry on.` };
    }

    const discount = coupon?.ok ? coupon.coupon : null;
    const total = subtotal - (discount?.amountKobo ?? 0) + shipping;

    const reference = newReference();

    // ---- customer ----------------------------------------------------------
    const { data: existing } = await supabase
      .from("customers")
      .select("id, full_name, phone")
      .eq("email", email)
      .maybeSingle();

    let customerId: string;
    if (existing) {
      customerId = existing.id as string;
      // Fill gaps only — never overwrite what the shop has edited by hand.
      const patch: Record<string, string> = {};
      if (!existing.full_name && name) patch.full_name = name;
      if (!existing.phone && phone) patch.phone = phone;
      if (Object.keys(patch).length > 0) {
        await supabase.from("customers").update(patch).eq("id", customerId);
      }
    } else {
      const { data: created, error } = await supabase
        .from("customers")
        .insert({ email, full_name: name, phone })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      customerId = created.id as string;
    }

    // ---- order -------------------------------------------------------------
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        reference,
        customer_id: customerId,
        status: "pending",
        fulfilment,
        subtotal_kobo: subtotal,
        shipping_kobo: shipping,
        total_kobo: total,
        // Only written when there is one, so a shop whose database predates
        // coupons keeps taking ordinary orders.
        ...(discount
          ? {
              discount_kobo: discount.amountKobo,
              discount_code: discount.code,
              discount_id: discount.id,
            }
          : {}),
        shipping_address: fulfilment === "shipping" ? address : null,
        note: String(formData.get("note") ?? "").trim() || null,
      })
      .select("id")
      .single();

    if (orderError) throw new Error(orderError.message);
    const orderId = order.id as string;

    const { error: itemsError } = await supabase.from("order_items").insert(
      priced.map(({ line, product }) => ({
        order_id: orderId,
        product_id: product.id,
        name: [
          product.name,
          line.color,
          line.size ? `UK ${line.size}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        unit_price_kobo: product.priceKobo,
        quantity: line.quantity,
        image_url: product.media[0] ?? null,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    // The tracked cart becomes a conversion rather than an abandoned one.
    const token = String(formData.get("cart_token") ?? "").trim();
    if (token) {
      await saveCart({
        token,
        email,
        phone,
        status: "converted",
        orderId,
        items: priced.map(({ line, product }) => ({
          product_id: product.id,
          name: product.name,
          quantity: line.quantity,
          unit_price_kobo: product.priceKobo,
          image_url: product.media[0] ?? null,
        })),
      });
    }

    // ---- payment -----------------------------------------------------------
    const site = await origin();

    // No payment provider connected yet, or a coupon that covered the whole
    // bag: either way there is nothing for Paystack to collect. The order
    // still lands, and the confirmation page says how it will be settled.
    if (!isPaystackConfigured() || total <= 0) {
      return { ok: true, redirect: `/order/${reference}` };
    }

    const { authorizationUrl } = await initializeTransaction({
      email,
      amountKobo: total,
      reference,
      callbackUrl: `${site}/order/${reference}`,
      metadata: { order_id: orderId, customer_name: name },
    });

    return { ok: true, redirect: authorizationUrl };
  } catch (error) {
    // Everything a shopper can put right is returned above, by hand. Anything
    // that reaches here is ours — a missing environment variable, a database
    // that didn't answer, Paystack refusing the call — and its message is for
    // the logs, not for someone trying to buy a dress.
    console.error("[checkout] order failed", error);
    return {
      ok: false,
      error:
        "We couldn't complete that order just now. Nothing has been charged — please try again in a moment.",
    };
  }
}
