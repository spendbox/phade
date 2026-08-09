"use server";

import { revalidate } from "@/lib/admin-revalidate";

import { actionError, requireOwner } from "@/lib/guard";
import { parseColors } from "@/lib/product-colors";
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
    await requireOwner();
    const supabase = requireSupabase();

    const productId = String(formData.get("product_id") ?? "");
    if (!productId) throw new Error("Missing product.");

    const mode = String(formData.get("mode") ?? "adjust");

    /**
     * Counting by colourway.
     *
     * A product that comes in four colours has four numbers, and the one on
     * the product row is their sum — kept by hand it drifts from them, and a
     * shopper is offered a black one nobody has. So editing the colours here
     * writes both: the counts, and the total they add up to.
     */
    const colors =
      mode === "colors" ? parseColors(String(formData.get("colors") ?? "")) : null;
    if (colors && colors.length === 0) {
      throw new Error("Add at least one colourway, or use one of the other tabs.");
    }

    // Summed defensively rather than through `countedStock`, which answers
    // null for a list where any colour is uncounted — here that is a colour
    // the shop has none of, not a reason to write the stock down to zero.
    const amount = colors
      ? colors.reduce((sum, color) => sum + (color.stock ?? 0), 0)
      : Number.parseInt(String(formData.get("amount") ?? ""), 10);
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
    const nextStock = mode === "adjust" ? current + amount : amount;
    if (nextStock < 0) throw new Error("That would take stock below zero.");

    const delta = nextStock - current;
    // Colour counts can be rearranged without the total moving — three black
    // becoming three white is a real change to save, and no movement to log.
    if (delta === 0 && !colors) {
      return { ok: true, message: "Stock already at that level." };
    }

    const { error: updateError } = await supabase
      .from("products")
      .update(colors ? { stock: nextStock, colors } : { stock: nextStock })
      .eq("id", productId);
    if (updateError) throw new Error(updateError.message);

    if (delta !== 0) {
      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert({ product_id: productId, delta, reason, note });
      if (movementError) throw new Error(movementError.message);
    }

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
