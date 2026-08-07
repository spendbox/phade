import { NextResponse } from "next/server";

import { getSupabase } from "@/lib/supabase";
import type { CartItem } from "@/lib/types";

/**
 * Cart tracking for the storefront.
 *
 * The shop calls this whenever a cart changes, so a checkout that never
 * completes still leaves a trace the Checkouts page can report on.
 *
 * It writes to the database without an admin session, so it is gated on a
 * shared secret: set STOREFRONT_API_KEY and send it as `x-storefront-key`.
 * Without that variable the endpoint stays closed rather than open.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  token?: string;
  email?: string;
  phone?: string;
  status?: "active" | "converted" | "abandoned";
  items?: CartItem[];
  orderId?: string;
};

function sanitiseItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];

  return items.slice(0, 100).flatMap((raw): CartItem[] => {
    if (typeof raw !== "object" || raw === null) return [];
    const item = raw as Record<string, unknown>;

    const name = typeof item.name === "string" ? item.name.slice(0, 200) : null;
    if (!name) return [];

    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price_kobo);

    return [
      {
        product_id:
          typeof item.product_id === "string" ? item.product_id : null,
        name,
        quantity: Number.isFinite(quantity) ? Math.max(Math.trunc(quantity), 0) : 0,
        unit_price_kobo: Number.isFinite(unitPrice)
          ? Math.max(Math.trunc(unitPrice), 0)
          : 0,
        image_url: typeof item.image_url === "string" ? item.image_url : null,
      },
    ];
  });
}

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

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = (body.token ?? "").trim();
  if (!token || token.length > 128) {
    return NextResponse.json(
      { error: "A cart token is required." },
      { status: 400 },
    );
  }

  const items = sanitiseItems(body.items);
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_kobo,
    0,
  );

  const status =
    body.status && ["active", "converted", "abandoned"].includes(body.status)
      ? body.status
      : "active";

  const email = body.email?.trim().toLowerCase() || null;

  // Link to a known customer when the email matches one we already have.
  let customerId: string | null = null;
  if (email) {
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    customerId = (data?.id as string) ?? null;
  }

  const { error } = await supabase.from("carts").upsert(
    {
      token,
      email,
      phone: body.phone?.trim() || null,
      customer_id: customerId,
      status,
      items,
      subtotal_kobo: subtotal,
      order_id: body.orderId ?? null,
      converted_at: status === "converted" ? new Date().toISOString() : null,
      last_active_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
