import type { SupabaseClient } from "@supabase/supabase-js";

import { mapPaystackStatus, type PaystackTransaction } from "@/lib/paystack";

/**
 * Writes one Paystack transaction into our tables.
 *
 * Shared by the webhook (real time) and the manual sync (backfill / repair), so
 * both paths produce identical records. Everything is keyed on the Paystack
 * reference, which makes replays idempotent.
 */
export async function recordTransaction(
  supabase: SupabaseClient,
  transaction: PaystackTransaction,
): Promise<void> {
  const email = transaction.customer?.email?.toLowerCase() ?? null;
  const status = mapPaystackStatus(transaction.status);

  // 1. Customer — upsert on email so repeat buyers stay one record.
  let customerId: string | null = null;
  if (email) {
    const fullName = [
      transaction.customer?.first_name,
      transaction.customer?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const { data: existing } = await supabase
      .from("customers")
      .select("id, full_name, phone")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      customerId = existing.id as string;
      // Only fill gaps — never overwrite details the admin has edited.
      const patch: Record<string, string> = {};
      if (!existing.full_name && fullName) patch.full_name = fullName;
      if (!existing.phone && transaction.customer?.phone) {
        patch.phone = transaction.customer.phone;
      }
      if (Object.keys(patch).length > 0) {
        await supabase.from("customers").update(patch).eq("id", customerId);
      }
    } else {
      const { data: created } = await supabase
        .from("customers")
        .insert({
          email,
          full_name: fullName || null,
          phone: transaction.customer?.phone ?? null,
        })
        .select("id")
        .single();
      customerId = (created?.id as string) ?? null;
    }
  }

  // 2. Order — link by matching reference if the storefront already created one.
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("reference", transaction.reference)
    .maybeSingle();

  const orderId = (order?.id as string) ?? null;

  if (orderId && status === "success" && order?.status === "pending") {
    await supabase
      .from("orders")
      .update({ status: "paid", customer_id: customerId ?? undefined })
      .eq("id", orderId);

    // Only on the pending -> paid transition, which happens once however many
    // times the webhook is redelivered, so stock can't be taken twice.
    await takeStock(supabase, orderId);
  }

  // 3. Payment — upsert on reference so redelivered webhooks don't duplicate.
  await supabase.from("payments").upsert(
    {
      order_id: orderId,
      reference: transaction.reference,
      paystack_id: transaction.id,
      channel: transaction.channel,
      amount_kobo: transaction.amount,
      fees_kobo: transaction.fees ?? 0,
      currency: transaction.currency || "NGN",
      status,
      customer_email: email,
      paid_at: transaction.paid_at ?? null,
      raw: transaction as unknown as Record<string, unknown>,
    },
    { onConflict: "reference" },
  );
}

/**
 * Takes what an order bought off the shelf, and writes the movement that says
 * why the number changed.
 *
 * Stock moves when the money arrives, not when the bag is filled — a checkout
 * nobody completes should not hold anything back from the next shopper. The
 * movements are the same ones the Inventory page shows, so a sale reads there
 * beside a restock rather than as an unexplained drop.
 */
async function takeStock(
  supabase: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  if (error || !data) return;

  const wanted = new Map<string, number>();
  for (const row of data as { product_id: string | null; quantity: number }[]) {
    if (!row.product_id || row.quantity <= 0) continue;
    wanted.set(row.product_id, (wanted.get(row.product_id) ?? 0) + row.quantity);
  }
  if (wanted.size === 0) return;

  const { data: products } = await supabase
    .from("products")
    .select("id, stock")
    .in("id", [...wanted.keys()]);

  for (const product of (products ?? []) as { id: string; stock: number }[]) {
    const quantity = wanted.get(product.id) ?? 0;
    // Never below zero: an oversold line is a conversation with the customer,
    // not a negative number sitting in the catalogue.
    const taken = Math.min(quantity, Math.max(product.stock, 0));
    if (taken === 0) continue;

    await supabase
      .from("products")
      .update({ stock: product.stock - taken })
      .eq("id", product.id);

    await supabase.from("inventory_movements").insert({
      product_id: product.id,
      delta: -taken,
      reason: "sale",
      note: `Order ${orderId.slice(0, 8)}`,
    });
  }
}
