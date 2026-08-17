"use server";

import { revalidate } from "@/lib/admin-revalidate";
import { actionError, requireAdmin } from "@/lib/guard";
import { sendOrderEmails } from "@/lib/order-email";
import { takeStock } from "@/lib/record-payment";
import { requireSupabase } from "@/lib/supabase";
import {
  ORDER_STATUSES,
  type ActionResult,
  type OrderStatus,
} from "@/lib/types";

export type OrderFormState = ActionResult | { ok: null };

/**
 * Statuses that mean the shop has been paid. Marking an order any of these by
 * hand is the same event as a Paystack payment landing — it just arrived as
 * cash, a transfer, or a conversation.
 */
const PAID_STATUSES: OrderStatus[] = [
  "paid",
  "processing",
  "shipped",
  "delivered",
];

export async function updateOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!id) throw new Error("Missing order id.");
  if (!ORDER_STATUSES.includes(status)) throw new Error("Unknown status.");

  // Read first: whether this is the moment an order got paid depends on what
  // it was a second ago, and every side effect below hangs on that.
  const { data: before } = await supabase
    .from("orders")
    .select("status, reference, total_kobo, customer:customers(email)")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const wasPending = before?.status === "pending";
  if (wasPending && PAID_STATUSES.includes(status)) {
    await settleByHand(supabase, {
      id,
      reference: (before?.reference as string) ?? id,
      totalKobo: Number(before?.total_kobo ?? 0),
      email:
        (before?.customer as { email?: string } | null)?.email?.toLowerCase() ??
        null,
    });
  }

  revalidate("/admin/orders");
  revalidate(`/admin/orders/${id}`);
  revalidate("/admin");
  revalidate("/admin/payments");
}

/**
 * Everything that happens when money arrives, for money that didn't arrive
 * through Paystack.
 *
 * Revenue on the dashboard is the sum of successful payments, not of orders —
 * which is right, because an order is a promise and a payment is a fact. But
 * it meant an order marked paid by hand earned the shop nothing on its own
 * chart. So a payment is written for it, on a reference derived from the
 * order's own, with the channel recorded as `manual` so the Payments page can
 * tell the two apart. The reference makes it idempotent: marking the same
 * order paid twice updates one row rather than inventing a second sale.
 *
 * Stock comes off at the same moment, through the same helper the webhook
 * uses, so a sale rung up by hand leaves the same trail as one taken online.
 *
 * The order emails go too, for the same reason: a customer who paid by
 * transfer is owed the same receipt as one who paid by card, and this is also
 * the way to get a receipt out after a webhook delivery was missed.
 */
async function settleByHand(
  supabase: ReturnType<typeof requireSupabase>,
  order: {
    id: string;
    reference: string;
    totalKobo: number;
    email: string | null;
  },
): Promise<void> {
  await supabase.from("payments").upsert(
    {
      order_id: order.id,
      reference: `${order.reference}-MANUAL`,
      paystack_id: null,
      channel: "manual",
      amount_kobo: order.totalKobo,
      fees_kobo: 0,
      currency: "NGN",
      status: "success",
      customer_email: order.email,
      paid_at: new Date().toISOString(),
      raw: { source: "dashboard", note: "Marked paid by hand" },
    },
    { onConflict: "reference" },
  );

  await takeStock(supabase, order.id);
  await sendOrderEmails(supabase, order.id);
}

export async function saveOrderNote(
  _previous: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  try {
    await requireAdmin();
    const supabase = requireSupabase();

    const id = String(formData.get("id") ?? "");
    if (!id) throw new Error("Missing order id.");

    const note = String(formData.get("note") ?? "").trim() || null;

    const { error } = await supabase
      .from("orders")
      .update({ note })
      .eq("id", id);
    if (error) throw new Error(error.message);

    revalidate(`/admin/orders/${id}`);
    return { ok: true, message: "Note saved." };
  } catch (error) {
    return actionError(error);
  }
}
