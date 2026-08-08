"use server";

import { revalidate } from "@/lib/admin-revalidate";

import { actionError, requireAdmin } from "@/lib/guard";
import { requireSupabase } from "@/lib/supabase";
import type { ActionResult, InventoryReason } from "@/lib/types";
import { INVENTORY_REASONS } from "@/lib/types";

export type StockFormState = ActionResult | { ok: null };

/**
 * Adjusts stock and records the movement, so inventory history is a complete
 * account of every change rather than just the current number.
 */
export async function adjustStock(
  _previous: StockFormState,
  formData: FormData,
): Promise<StockFormState> {
  try {
    await requireAdmin();
    const supabase = requireSupabase();

    const productId = String(formData.get("product_id") ?? "");
    if (!productId) throw new Error("Missing product.");

    const mode = String(formData.get("mode") ?? "adjust");
    const amount = Number.parseInt(String(formData.get("amount") ?? ""), 10);
    if (!Number.isFinite(amount)) throw new Error("Enter a number.");

    const reasonInput = String(formData.get("reason") ?? "manual");
    const reason: InventoryReason = INVENTORY_REASONS.includes(
      reasonInput as InventoryReason,
    )
      ? (reasonInput as InventoryReason)
      : "manual";

    const note = String(formData.get("note") ?? "").trim() || null;

    const { data: product, error: readError } = await supabase
      .from("products")
      .select("stock, name")
      .eq("id", productId)
      .single();
    if (readError) throw new Error(readError.message);

    const current = product?.stock ?? 0;
    const nextStock = mode === "set" ? amount : current + amount;
    if (nextStock < 0) throw new Error("That would take stock below zero.");

    const delta = nextStock - current;
    if (delta === 0) return { ok: true, message: "Stock already at that level." };

    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: nextStock })
      .eq("id", productId);
    if (updateError) throw new Error(updateError.message);

    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert({ product_id: productId, delta, reason, note });
    if (movementError) throw new Error(movementError.message);

    revalidate("/admin/inventory");
    revalidate("/admin/products");
    revalidate(`/admin/products/${productId}`);

    return {
      ok: true,
      message: `${product?.name ?? "Stock"} is now ${nextStock}.`,
    };
  } catch (error) {
    return actionError(error);
  }
}

/** One-click +1 / −1 from the inventory table. */
export async function nudgeStock(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = requireSupabase();

  const productId = String(formData.get("product_id") ?? "");
  const delta = Number.parseInt(String(formData.get("delta") ?? "0"), 10);
  if (!productId || !Number.isFinite(delta) || delta === 0) return;

  const { data: product, error } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .single();
  if (error) throw new Error(error.message);

  const next = Math.max((product?.stock ?? 0) + delta, 0);
  if (next === product?.stock) return;

  await supabase.from("products").update({ stock: next }).eq("id", productId);
  await supabase.from("inventory_movements").insert({
    product_id: productId,
    delta: next - (product?.stock ?? 0),
    reason: delta > 0 ? "restock" : "correction",
    note: "Quick adjustment",
  });

  revalidate("/admin/inventory");
}
