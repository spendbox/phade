import { getSupabase } from "@/lib/supabase";
import type { CartItem, CartStatus } from "@/lib/types";

/**
 * Writing a shopping session to the database.
 *
 * Two callers reach this: our own storefront, through a server action, and
 * anything external through `/api/cart` behind a shared secret. Both land here
 * so a cart looks the same however it arrived, and the Checkouts page can
 * report on it without knowing where it came from.
 *
 * Everything is upserted on `token`, so a cart that changes forty times over an
 * evening stays one row.
 */

export function sanitiseCartItems(items: unknown): CartItem[] {
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
        quantity: Number.isFinite(quantity)
          ? Math.max(Math.trunc(quantity), 0)
          : 0,
        unit_price_kobo: Number.isFinite(unitPrice)
          ? Math.max(Math.trunc(unitPrice), 0)
          : 0,
        image_url: typeof item.image_url === "string" ? item.image_url : null,
      },
    ];
  });
}

export type SaveCartInput = {
  token: string;
  items: unknown;
  email?: string | null;
  phone?: string | null;
  status?: CartStatus;
  orderId?: string | null;
};

export type SaveCartResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export async function saveCart(input: SaveCartInput): Promise<SaveCartResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, status: 503, error: "Storage unavailable." };
  }

  const token = input.token.trim();
  if (!token || token.length > 128) {
    return { ok: false, status: 400, error: "A cart token is required." };
  }

  const items = sanitiseCartItems(input.items);
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_kobo,
    0,
  );

  const status: CartStatus = input.status ?? "active";
  const email = input.email?.trim().toLowerCase() || null;

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
      phone: input.phone?.trim() || null,
      customer_id: customerId,
      status,
      items,
      subtotal_kobo: subtotal,
      order_id: input.orderId ?? null,
      converted_at: status === "converted" ? new Date().toISOString() : null,
      last_active_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );

  if (error) return { ok: false, status: 502, error: error.message };
  return { ok: true };
}
