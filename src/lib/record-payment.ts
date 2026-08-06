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
