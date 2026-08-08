import { NextResponse } from "next/server";

import { saveCart } from "@/lib/cart-store";
import type { CartItem, CartStatus } from "@/lib/types";

/**
 * Cart tracking for anything outside this app.
 *
 * Our own storefront writes carts through a server action instead — it is
 * already on the server, so it has no need of a key it would have to ship to
 * the browser. This endpoint exists for a separate front end, and because it
 * writes without an admin session it is gated on a shared secret: set
 * STOREFRONT_API_KEY and send it as `x-storefront-key`. Without that variable
 * the endpoint stays closed rather than open.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  token?: string;
  email?: string;
  phone?: string;
  status?: CartStatus;
  items?: CartItem[];
  orderId?: string;
};

export async function POST(request: Request) {
  const expected = process.env.STOREFRONT_API_KEY;
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "Cart tracking isn't enabled. Set STOREFRONT_API_KEY to open this endpoint.",
      },
      { status: 501 },
    );
  }

  if (request.headers.get("x-storefront-key") !== expected) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const status =
    body.status && ["active", "converted", "abandoned"].includes(body.status)
      ? body.status
      : "active";

  const result = await saveCart({
    token: body.token ?? "",
    items: body.items,
    email: body.email,
    phone: body.phone,
    status,
    orderId: body.orderId ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
