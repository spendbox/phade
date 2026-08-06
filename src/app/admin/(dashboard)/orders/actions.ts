"use server";

import { revalidatePath } from "next/cache";

import { actionError, requireAdmin } from "@/lib/guard";
import { requireSupabase } from "@/lib/supabase";
import { ORDER_STATUSES, type ActionResult, type OrderStatus } from "@/lib/types";

export type OrderFormState = ActionResult | { ok: null };

export async function updateOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!id) throw new Error("Missing order id.");
  if (!ORDER_STATUSES.includes(status)) throw new Error("Unknown status.");

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
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

    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, message: "Note saved." };
  } catch (error) {
    return actionError(error);
  }
}
