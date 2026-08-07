"use server";

import { revalidatePath } from "next/cache";

import { actionError, requireAdmin } from "@/lib/guard";
import { nairaToKobo, slugify } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { generateSku, categoryNameFor } from "@/lib/sku";
import { requireSupabase } from "@/lib/supabase";
import {
  DELETE_CONFIRMATION,
  PRODUCT_SIZES,
  PRODUCT_STATUSES,
  type ActionResult,
  type ProductColor,
  type ProductStatus,
} from "@/lib/types";

/**
 * Cell-level writes for the spreadsheet.
 *
 * Each edit sends one field for one row, so a save is small, fast, and can't
 * clobber a column the admin didn't touch — two people editing different
 * columns of the same product don't overwrite each other.
 */

export type SheetState = ActionResult | { ok: null };

/** Columns the sheet is allowed to write. Anything else is rejected outright. */
const EDITABLE = [
  "name",
  "sku",
  "subcategory",
  "description",
  "category_id",
  "status",
  "price",
  "compare_at_price",
  "cost_price",
  "low_stock_threshold",
  "stock",
  "images",
  "colors",
  "sizes",
  "tags",
  "featured",
] as const;

type EditableField = (typeof EDITABLE)[number];

function isEditable(value: string): value is EditableField {
  return (EDITABLE as readonly string[]).includes(value);
}

function parseColors(raw: string): ProductColor[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): ProductColor[] => {
      if (typeof item !== "object" || item === null) return [];
      const entry = item as Record<string, unknown>;
      const name = typeof entry.name === "string" ? entry.name.trim() : "";
      const hex = typeof entry.hex === "string" ? entry.hex : "";
      if (!name || !/^#[0-9a-fA-F]{3,8}$/.test(hex)) return [];
      return [{ name, hex }];
    });
  } catch {
    return [];
  }
}

function parseSizes(raw: string): number[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set<number>(PRODUCT_SIZES);
    const chosen = new Set<number>();
    for (const item of parsed) {
      const size = Number(item);
      if (allowed.has(size)) chosen.add(size);
    }
    return PRODUCT_SIZES.filter((size) => chosen.has(size));
  } catch {
    return [];
  }
}

function parseStrings(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function wholeNumber(raw: string): number {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Enter a whole number, 0 or more.");
  }
  return value;
}

export async function updateCell(
  _previous: SheetState,
  formData: FormData,
): Promise<SheetState> {
  try {
    await requireAdmin();
    const supabase = requireSupabase();

    const id = String(formData.get("id") ?? "");
    const field = String(formData.get("field") ?? "");
    const raw = String(formData.get("value") ?? "");

    if (!id) throw new Error("Missing row.");
    if (!isEditable(field)) throw new Error(`${field} can't be edited here.`);

    // Stock is not an ordinary column: every change has to leave a movement
    // behind, so the inventory history stays a complete account.
    if (field === "stock") {
      const next = wholeNumber(raw);

      const { data: product, error: readError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", id)
        .single();
      if (readError) throw new Error(readError.message);

      const current = (product?.stock as number) ?? 0;
      const delta = next - current;
      if (delta !== 0) {
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: next })
          .eq("id", id);
        if (updateError) throw new Error(updateError.message);

        const { error: movementError } = await supabase
          .from("inventory_movements")
          .insert({
            product_id: id,
            delta,
            reason: delta > 0 ? "restock" : "correction",
            note: "Edited in the database sheet",
          });
        if (movementError) throw new Error(movementError.message);
      }

      revalidateSheet(id);
      return { ok: true, message: "Saved." };
    }

    const patch: Record<string, unknown> = {};

    switch (field) {
      case "name": {
        const name = raw.trim();
        if (!name) throw new Error("A product needs a name.");
        patch.name = name;
        break;
      }
      case "price":
      case "compare_at_price":
      case "cost_price": {
        const column = field === "price" ? "price_kobo" : `${field}_kobo`;
        if (!raw.trim() && field !== "price") {
          patch[column] = null;
          break;
        }
        const kobo = nairaToKobo(raw);
        if (kobo < 0) throw new Error("That can't be negative.");
        patch[column] = kobo;
        break;
      }
      case "low_stock_threshold":
        patch.low_stock_threshold = wholeNumber(raw);
        break;
      case "status": {
        if (!PRODUCT_STATUSES.includes(raw as ProductStatus)) {
          throw new Error("Unknown status.");
        }
        patch.status = raw;
        break;
      }
      case "category_id":
        patch.category_id = raw || null;
        break;
      case "featured":
        patch.featured = raw === "true";
        break;
      case "images":
        patch.images = parseStrings(raw);
        break;
      case "tags":
        patch.tags = raw
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        break;
      case "colors":
        patch.colors = parseColors(raw);
        break;
      case "sizes":
        patch.sizes = parseSizes(raw);
        break;
      default:
        patch[field] = raw.trim() || null;
    }

    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) throw new Error(error.message);

    revalidateSheet(id);
    return { ok: true, message: "Saved." };
  } catch (error) {
    return actionError(error);
  }
}

/**
 * A new row is a real product straight away, saved as a draft so a half-filled
 * line can never reach the shop. The admin fills it in from the sheet.
 */
export async function addSheetRow(
  _previous: SheetState,
  formData: FormData,
): Promise<SheetState> {
  try {
    await requireAdmin();
    const supabase = requireSupabase();
    const settings = await getSettings();

    const name = String(formData.get("name") ?? "").trim() || "Untitled product";
    const categoryId = String(formData.get("category_id") ?? "") || null;

    let slug = slugify(name);
    for (let attempt = 2; ; attempt += 1) {
      const { data } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .limit(1);
      if (!data || data.length === 0) break;
      slug = `${slugify(name)}-${attempt}`;
    }

    const sku = await generateSku(
      supabase,
      await categoryNameFor(supabase, categoryId),
    );

    const { error } = await supabase.from("products").insert({
      name,
      slug,
      sku,
      category_id: categoryId,
      price_kobo: 0,
      stock: 0,
      low_stock_threshold: settings.lowStockThreshold,
      status: "draft",
      images: [],
      tags: [],
      colors: [],
      sizes: [],
    });
    if (error) throw new Error(error.message);

    revalidateSheet();
    return { ok: true, message: "Row added as a draft." };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteSheetRows(
  _previous: SheetState,
  formData: FormData,
): Promise<SheetState> {
  try {
    await requireAdmin();
    const supabase = requireSupabase();

    if (String(formData.get("confirmation") ?? "").trim() !== DELETE_CONFIRMATION) {
      throw new Error(`Type ${DELETE_CONFIRMATION} to confirm.`);
    }

    const ids = String(formData.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) throw new Error("Nothing selected.");

    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) throw new Error(error.message);

    revalidateSheet();
    return {
      ok: true,
      message: `Deleted ${ids.length} row${ids.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return actionError(error);
  }
}

function revalidateSheet(productId?: string) {
  revalidatePath("/admin/database");
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  if (productId) revalidatePath(`/admin/products/${productId}`);
}
