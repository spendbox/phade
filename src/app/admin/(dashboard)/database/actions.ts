"use server";

import { revalidatePath } from "next/cache";

import { actionError, requireAdmin } from "@/lib/guard";
import { nairaToKobo, slugify } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { generateSku, categoryNameFor } from "@/lib/sku";
import { requireSupabase } from "@/lib/supabase";
import { matchColorNames } from "@/lib/ai-colors";
import { getCatalogueDefaults, parseSizeList } from "@/lib/catalogue-settings";
import {
  DELETE_CONFIRMATION,
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
    return parseSizeList(JSON.parse(raw || "[]"));
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

/**
 * A slug nothing else is using. Bounded rather than open-ended: a lookup that
 * kept answering "taken" would otherwise spin forever, and a timestamped slug
 * is a far better outcome than a hung import.
 */
async function freeSlug(name: string): Promise<string> {
  const supabase = requireSupabase();
  const base = slugify(name) || "product";

  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return candidate;
  }

  return `${base}-${Date.now().toString().slice(-6)}`;
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

    const slug = await freeSlug(name);

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

// ---------------------------------------------------------------------------
// Spreadsheet import
// ---------------------------------------------------------------------------

export type ImportRow = {
  name: string;
  colors?: string[];
  sizes?: number[];
  stock?: number;
  sold?: number;
  price?: string;
  category?: string;
  subcategory?: string;
  sku?: string;
  description?: string;
  tags?: string[];
};

export type ImportState =
  | { ok: null }
  | { ok: true; created: number; message: string }
  | { ok: false; error: string };

/**
 * Turns colour names typed in a spreadsheet into named swatches.
 *
 * The shop's own palette answers first, so "Wine" is whatever the admin decided
 * wine looks like. Only names the palette doesn't know go to the model, in one
 * request for the whole batch rather than one per row — and if that fails, or
 * the assistant isn't configured, the name is still kept with a neutral swatch
 * the admin can correct. A missing hex must never lose the colour.
 */
export async function resolveColorNames(
  names: string[],
): Promise<Record<string, ProductColor>> {
  const palette = await getCatalogueDefaults();
  const known = new Map(
    palette.colors.map((color) => [color.name.toLowerCase(), color]),
  );

  const resolved: Record<string, ProductColor> = {};
  const unknown: string[] = [];

  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;

    const match = known.get(name.toLowerCase());
    if (match) {
      resolved[name.toLowerCase()] = match;
    } else if (!unknown.includes(name)) {
      unknown.push(name);
    }
  }

  if (unknown.length > 0 && process.env.OPENAI_API_KEY) {
    try {
      const matched = await matchColorNames(unknown);
      for (const color of matched) {
        resolved[color.name.toLowerCase()] = color;
      }
    } catch {
      // Fall through to the neutral swatch below.
    }
  }

  for (const name of unknown) {
    if (!resolved[name.toLowerCase()]) {
      resolved[name.toLowerCase()] = { name, hex: "#9ca3af" };
    }
  }

  return resolved;
}

/**
 * One batch of rows. The client sends the file in chunks so the progress bar
 * measures rows actually written rather than guessing at a single long request.
 */
export async function importSheetRows(
  rowsJson: string,
  colorsJson: string,
): Promise<ImportState> {
  try {
    await requireAdmin();
    const supabase = requireSupabase();
    const settings = await getSettings();

    let rows: ImportRow[] = [];
    let colorMap: Record<string, ProductColor> = {};
    try {
      const parsedRows: unknown = JSON.parse(rowsJson);
      if (Array.isArray(parsedRows)) rows = parsedRows as ImportRow[];
      colorMap = JSON.parse(colorsJson) as Record<string, ProductColor>;
    } catch {
      throw new Error("Couldn't read that batch.");
    }
    if (rows.length === 0) return { ok: true, created: 0, message: "Nothing to do." };

    const { data: categoryRows } = await supabase
      .from("categories")
      .select("id, name");
    const categories = new Map(
      ((categoryRows ?? []) as { id: string; name: string }[]).map((row) => [
        row.name.trim().toLowerCase(),
        row.id,
      ]),
    );

    let created = 0;

    for (const row of rows) {
      const name = String(row.name ?? "").trim();
      if (!name) continue;

      const categoryId =
        categories.get(String(row.category ?? "").trim().toLowerCase()) ?? null;

      const slug = await freeSlug(name);

      const sku =
        String(row.sku ?? "").trim() ||
        (await generateSku(
          supabase,
          await categoryNameFor(supabase, categoryId),
        ));

      const colors = (row.colors ?? [])
        .map((color) => colorMap[color.trim().toLowerCase()])
        .filter((color): color is ProductColor => Boolean(color));

      const stock = Number.isFinite(Number(row.stock))
        ? Math.max(Math.trunc(Number(row.stock)), 0)
        : 0;

      const { data: inserted, error } = await supabase
        .from("products")
        .insert({
          name,
          slug,
          sku,
          description: String(row.description ?? "").trim() || null,
          category_id: categoryId,
          subcategory: String(row.subcategory ?? "").trim() || null,
          price_kobo: row.price ? nairaToKobo(row.price) : 0,
          stock,
          low_stock_threshold: settings.lowStockThreshold,
          // Everything imported lands as a draft — a spreadsheet row has not
          // been looked at yet, and a half-filled one must not reach the shop.
          status: "draft",
          images: [],
          tags: (row.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
          colors,
          sizes: parseSizeList(row.sizes ?? []),
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      created += 1;

      if (stock > 0 && inserted) {
        await supabase.from("inventory_movements").insert({
          product_id: inserted.id,
          delta: stock,
          reason: "restock",
          note: "Opening stock, imported from a spreadsheet",
        });
      }
    }

    revalidateSheet();
    return {
      ok: true,
      created,
      message: `Imported ${created} product${created === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    const result = actionError(error);
    return { ok: false, error: result.error };
  }
}
