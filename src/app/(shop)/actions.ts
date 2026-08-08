"use server";

import { saveCart } from "@/lib/cart-store";
import type { BagLine } from "@/lib/shop";

/**
 * The storefront's own cart tracking.
 *
 * The browser holds the bag; this is how a copy reaches the Checkouts page so
 * the shop can see what people left behind. It is deliberately not the
 * `/api/cart` route: that one is gated on a shared secret meant for a separate
 * front end, and a secret shipped to the browser is not a secret. Here the bag
 * is written from the server with no admin session, so the payload is treated
 * as untrusted — items are capped and sanitised in `saveCart`, and nothing this
 * writes is ever read back as a price.
 */
export async function syncCart(
  token: string,
  lines: BagLine[],
): Promise<void> {
  if (typeof token !== "string" || !token) return;

  await saveCart({
    token,
    items: (Array.isArray(lines) ? lines : []).map((line) => ({
      product_id: line.productId,
      name: [line.name, line.color, line.size ? `UK ${line.size}` : null]
        .filter(Boolean)
        .join(" · "),
      quantity: line.quantity,
      unit_price_kobo: line.priceKobo,
      image_url: line.image,
    })),
  });
}
