"use server";

import { revalidatePath } from "next/cache";

import { actionError, requireOwner } from "@/lib/guard";
import { isPaystackConfigured, listTransactions } from "@/lib/paystack";
import { recordTransaction } from "@/lib/record-payment";
import { requireSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

export type SyncState = ActionResult | { ok: null };

/**
 * Pulls the most recent Paystack transactions and writes them into `payments`.
 *
 * The webhook keeps things current in normal operation; this is the backfill
 * for a fresh deployment, and the repair path if a webhook delivery was ever
 * missed. Records upsert on reference, so running it twice changes nothing.
 *
 * It deliberately sends no order emails. A backfill can reach back months, and
 * a shop connecting Paystack for the first time should not post a receipt to
 * everyone who ever bought something. A single order that needs its email after
 * a missed webhook can be settled from the order page instead.
 */
export async function syncPaystack(
  _previous: SyncState,
  _formData: FormData,
): Promise<SyncState> {
  try {
    await requireOwner();

    if (!isPaystackConfigured()) {
      throw new Error(
        "Add PAYSTACK_SECRET_KEY in Vercel and redeploy to sync payments.",
      );
    }

    const supabase = requireSupabase();
    const transactions = await listTransactions({ perPage: 100 });

    for (const transaction of transactions) {
      await recordTransaction(supabase, transaction);
    }

    revalidatePath("/admin/payments");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/customers");
    revalidatePath("/admin");

    return {
      ok: true,
      message:
        transactions.length === 0
          ? "No transactions found on Paystack yet."
          : `Synced ${transactions.length} transaction${
              transactions.length === 1 ? "" : "s"
            }.`,
    };
  } catch (error) {
    return actionError(error);
  }
}
