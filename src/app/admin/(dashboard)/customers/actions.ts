"use server";

import { revalidatePath } from "next/cache";

import { actionError, requireOwner } from "@/lib/guard";
import { requireSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

export type CustomerFormState = ActionResult | { ok: null };

export async function saveCustomer(
  _previous: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    const id = String(formData.get("id") ?? "");
    if (!id) throw new Error("Missing customer id.");

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!email) throw new Error("A customer needs an email address.");

    const { error } = await supabase
      .from("customers")
      .update({
        email,
        full_name: String(formData.get("full_name") ?? "").trim() || null,
        phone: String(formData.get("phone") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
      })
      .eq("id", id);

    if (error) {
      throw new Error(
        error.code === "23505"
          ? "Another customer already uses that email."
          : error.message,
      );
    }

    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
    return { ok: true, message: "Customer updated." };
  } catch (error) {
    return actionError(error);
  }
}
