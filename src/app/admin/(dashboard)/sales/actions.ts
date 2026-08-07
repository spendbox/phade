"use server";

import { revalidatePath } from "next/cache";

import { nairaToKobo } from "@/lib/format";
import { actionError, requireAdmin } from "@/lib/guard";
import { requireSupabase } from "@/lib/supabase";
import type { ActionResult, DiscountKind, DiscountScope } from "@/lib/types";

export type SaleFormState = ActionResult | { ok: null };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function ids(formData: FormData, key: string): string[] {
  return text(formData, key)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Creates or updates a sale.
 *
 * Scope decides what it touches: the whole catalogue, chosen categories, or
 * chosen products. The join rows are rewritten wholesale on save — simpler than
 * diffing, and the sets are small.
 */
export async function saveSale(
  _previous: SaleFormState,
  formData: FormData,
): Promise<SaleFormState> {
  try {
    await requireAdmin();
    const supabase = requireSupabase();

    const id = text(formData, "id");
    const name = text(formData, "name");
    if (!name) throw new Error("Give the sale a name.");

    const kind = text(formData, "kind") as DiscountKind;
    if (!["percentage", "fixed"].includes(kind)) {
      throw new Error("Choose a discount type.");
    }

    const rawValue = text(formData, "value");
    const value =
      kind === "percentage"
        ? Number.parseInt(rawValue, 10)
        : nairaToKobo(rawValue);

    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("Enter how much comes off.");
    }
    if (kind === "percentage" && value > 100) {
      throw new Error("A percentage discount can't be more than 100%.");
    }

    const scope = text(formData, "scope") as DiscountScope;
    if (!["all", "categories", "products"].includes(scope)) {
      throw new Error("Choose what the sale applies to.");
    }

    const categoryIds = ids(formData, "category_ids");
    const productIds = ids(formData, "product_ids");

    if (scope === "categories" && categoryIds.length === 0) {
      throw new Error("Pick at least one category.");
    }
    if (scope === "products" && productIds.length === 0) {
      throw new Error("Pick at least one product.");
    }

    const code = text(formData, "code").toUpperCase() || null;
    const usageLimit = Number.parseInt(text(formData, "usage_limit"), 10);
    const startsAt = text(formData, "starts_at");
    const endsAt = text(formData, "ends_at");

    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      throw new Error("The sale has to end after it starts.");
    }

    const payload = {
      name,
      code,
      description: text(formData, "description") || null,
      kind,
      value,
      scope,
      min_order_kobo: nairaToKobo(text(formData, "min_order")),
      usage_limit: Number.isFinite(usageLimit) && usageLimit > 0 ? usageLimit : null,
      enabled: formData.get("enabled") !== "off",
      starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };

    let saleId = id;

    if (id) {
      const { error } = await supabase
        .from("discounts")
        .update(payload)
        .eq("id", id);
      if (error) throw new Error(friendly(error.message));
    } else {
      const { data, error } = await supabase
        .from("discounts")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(friendly(error.message));
      saleId = data.id as string;
    }

    // Rewrite the targets to match the chosen scope.
    await Promise.all([
      supabase.from("discount_categories").delete().eq("discount_id", saleId),
      supabase.from("discount_products").delete().eq("discount_id", saleId),
    ]);

    if (scope === "categories" && categoryIds.length > 0) {
      const { error } = await supabase.from("discount_categories").insert(
        categoryIds.map((categoryId) => ({
          discount_id: saleId,
          category_id: categoryId,
        })),
      );
      if (error) throw new Error(error.message);
    }

    if (scope === "products" && productIds.length > 0) {
      const { error } = await supabase.from("discount_products").insert(
        productIds.map((productId) => ({
          discount_id: saleId,
          product_id: productId,
        })),
      );
      if (error) throw new Error(error.message);
    }

    revalidatePath("/admin/sales");
    return { ok: true, message: id ? "Sale updated." : `${name} started.` };
  } catch (error) {
    return actionError(error);
  }
}

function friendly(message: string): string {
  return message.includes("duplicate key") && message.includes("code")
    ? "That coupon code is already in use."
    : message;
}

/** Pause or resume without deleting the sale. */
export async function toggleSale(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  if (!id) throw new Error("Missing sale id.");

  const { error } = await supabase
    .from("discounts")
    .update({ enabled })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sales");
}

export async function deleteSale(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing sale id.");

  const { error } = await supabase.from("discounts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sales");
}
