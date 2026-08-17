"use server";

import { revalidate } from "@/lib/admin-revalidate";
import { redirect } from "next/navigation";

import { actionError, requireOwner } from "@/lib/guard";
import { nairaToKobo, slugify } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { categoryNameFor, generateSku } from "@/lib/sku";
import { requireSupabase } from "@/lib/supabase";
import { DELETE_CONFIRMATION } from "@/lib/types";
import { parseSizeList } from "@/lib/catalogue-settings";
import { countedStock, parseColors } from "@/lib/product-colors";
import type {
  ActionResult,
  ProductColor,
  ProductStatus,
} from "@/lib/types";

export type ProductFormState = ActionResult | { ok: null };

type ParsedProduct = {
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price_kobo: number;
  compare_at_price_kobo: number | null;
  cost_price_kobo: number | null;
  sku: string | null;
  subcategory: string | null;
  stock: number;
  low_stock_threshold: number;
  status: ProductStatus;
  images: string[];
  tags: string[];
  colors: ProductColor[];
  sizes: number[];
  featured: boolean;
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value === "" ? null : value;
}

function integer(formData: FormData, key: string, fallback = 0): number {
  const value = Number.parseInt(text(formData, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

function parseProduct(formData: FormData, defaultLowStock = 5): ParsedProduct {
  const name = text(formData, "name");
  if (!name) throw new Error("Give the product a name.");

  const price = nairaToKobo(text(formData, "price"));
  if (price < 0) throw new Error("Price can't be negative.");

  const compareAt = text(formData, "compare_at_price")
    ? nairaToKobo(text(formData, "compare_at_price"))
    : null;
  const cost = text(formData, "cost_price")
    ? nairaToKobo(text(formData, "cost_price"))
    : null;

  const status = text(formData, "status") as ProductStatus;

  let images: string[] = [];
  try {
    const parsed: unknown = JSON.parse(text(formData, "images") || "[]");
    if (Array.isArray(parsed)) {
      images = parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    images = [];
  }

  const tags = text(formData, "tags")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const colors = parseColors(text(formData, "colors"));
  const sizes = parseSizes(formData.get("sizes"));

  // Colours that each carry a number are the count: the shop typed three
  // emerald and none in black, and the total follows from that rather than
  // from a second field someone has to remember to keep in step.
  const stock =
    countedStock(colors) ?? Math.max(integer(formData, "stock"), 0);

  return {
    name,
    slug: slugify(text(formData, "slug") || name),
    description: optional(formData, "description"),
    category_id: optional(formData, "category_id"),
    price_kobo: price,
    compare_at_price_kobo: compareAt,
    cost_price_kobo: cost,
    sku: optional(formData, "sku"),
    subcategory: optional(formData, "subcategory"),
    stock,
    low_stock_threshold: Math.max(
      integer(formData, "low_stock_threshold", defaultLowStock),
      0,
    ),
    status: ["draft", "active", "archived"].includes(status) ? status : "draft",
    images,
    tags,
    colors,
    sizes,
    featured: formData.get("featured") === "on",
  };
}

/** Sizes arrive as JSON from the picker, or already parsed from a draft. */
function parseSizes(raw: unknown): number[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw || "[]");
    } catch {
      return [];
    }
  }
  return parseSizeList(list);
}

/** Slugs are unique; append -2, -3 … until we find a free one. */
async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const supabase = requireSupabase();
  // Bounded: a lookup that kept answering "taken" would otherwise spin
  // forever, and a timestamped slug beats a hung request.
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = attempt === 1 ? base || "product" : `${base}-${attempt}`;
    let query = supabase.from("products").select("id").eq("slug", candidate);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data, error } = await query.limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return candidate;
  }

  return `${base}-${Date.now().toString().slice(-6)}`;
}

export async function createProduct(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();
    const settings = await getSettings();
    const parsed = parseProduct(formData, settings.lowStockThreshold);
    parsed.slug = await uniqueSlug(parsed.slug);

    // A blank SKU means "generate one" — the admin never has to invent codes.
    if (!parsed.sku) {
      parsed.sku = await generateSku(
        supabase,
        await categoryNameFor(supabase, parsed.category_id),
      );
    }

    const { data, error } = await supabase
      .from("products")
      .insert(parsed)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (parsed.stock > 0) {
      await supabase.from("inventory_movements").insert({
        product_id: data.id,
        delta: parsed.stock,
        reason: "restock",
        note: "Opening stock",
      });
    }

    revalidate("/admin/products");
    revalidate("/admin/inventory");
    return { ok: true, message: `${parsed.name} created.` };
  } catch (error) {
    return actionError(error);
  }
}

/**
 * One product drafted in the bulk uploader. Only media, name, price and status
 * are asked for up front — everything else is optional and collapsed behind
 * "More details", so a batch can be published in a couple of minutes.
 */
export type ProductDraft = {
  name?: string;
  price?: string;
  status?: string;
  media?: string[];
  description?: string;
  compareAtPrice?: string;
  costPrice?: string;
  stock?: string;
  lowStockThreshold?: string;
  sku?: string;
  subcategory?: string;
  colors?: ProductColor[];
  sizes?: number[];
  tags?: string;
  featured?: boolean;
};

export type BulkCreateState =
  | { ok: null }
  | { ok: true; created: number; message: string }
  | { ok: false; error: string };

export async function createProductsBulk(
  _previous: BulkCreateState,
  formData: FormData,
): Promise<BulkCreateState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    const categoryId = text(formData, "category_id") || null;

    let drafts: ProductDraft[] = [];
    try {
      const parsed: unknown = JSON.parse(text(formData, "drafts") || "[]");
      if (Array.isArray(parsed)) drafts = parsed as ProductDraft[];
    } catch {
      throw new Error("Couldn't read the drafts. Try saving again.");
    }

    if (drafts.length === 0) throw new Error("Add at least one product first.");

    const categoryName = await categoryNameFor(supabase, categoryId);
    const settings = await getSettings();

    // Sequential rather than parallel: slugs and SKUs are both derived from
    // what's already stored, so each insert needs to see the previous one.
    let created = 0;
    for (const [index, draft] of drafts.entries()) {
      const name = (draft.name ?? "").trim();
      if (!name) throw new Error(`Product ${index + 1} still needs a name.`);

      const priceKobo = nairaToKobo(draft.price ?? "");
      if (priceKobo <= 0) {
        throw new Error(`${name} still needs a price.`);
      }

      const status = ["draft", "active", "archived"].includes(draft.status ?? "")
        ? (draft.status as ProductStatus)
        : "active";

      const stock = Math.max(
        Number.parseInt(draft.stock ?? "", 10) || 0,
        0,
      );

      const { data, error } = await supabase
        .from("products")
        .insert({
          name,
          slug: await uniqueSlug(slugify(name)),
          description: (draft.description ?? "").trim() || null,
          category_id: categoryId,
          price_kobo: priceKobo,
          compare_at_price_kobo: draft.compareAtPrice
            ? nairaToKobo(draft.compareAtPrice)
            : null,
          cost_price_kobo: draft.costPrice ? nairaToKobo(draft.costPrice) : null,
          sku:
            (draft.sku ?? "").trim() ||
            (await generateSku(supabase, categoryName)),
          subcategory: (draft.subcategory ?? "").trim() || null,
          stock,
          low_stock_threshold: Math.max(
            Number.parseInt(draft.lowStockThreshold ?? "", 10) ||
              settings.lowStockThreshold,
            0,
          ),
          status,
          images: (draft.media ?? []).filter(
            (url): url is string => typeof url === "string",
          ),
          tags: (draft.tags ?? "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          colors: Array.isArray(draft.colors) ? draft.colors : [],
          sizes: parseSizes(draft.sizes),
          featured: Boolean(draft.featured),
        })
        .select("id")
        .single();

      if (error) throw new Error(`${name}: ${error.message}`);
      created += 1;

      if (stock > 0) {
        await supabase.from("inventory_movements").insert({
          product_id: data.id,
          delta: stock,
          reason: "restock",
          note: "Opening stock",
        });
      }
    }

    revalidate("/admin/products");
    revalidate("/admin/inventory");
    revalidate("/admin");

    return {
      ok: true,
      created,
      message: `${created} product${created === 1 ? "" : "s"} published.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export async function updateProduct(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    const id = text(formData, "id");
    if (!id) throw new Error("Missing product id.");

    const parsed = parseProduct(formData);
    parsed.slug = await uniqueSlug(parsed.slug, id);

    // Stock edits from this form are recorded as a correction so the inventory
    // history stays a complete account of every change.
    const { data: existing, error: readError } = await supabase
      .from("products")
      .select("stock")
      .eq("id", id)
      .single();
    if (readError) throw new Error(readError.message);

    const { error } = await supabase
      .from("products")
      .update(parsed)
      .eq("id", id);
    if (error) throw new Error(error.message);

    const delta = parsed.stock - (existing?.stock ?? 0);
    if (delta !== 0) {
      await supabase.from("inventory_movements").insert({
        product_id: id,
        delta,
        reason: "correction",
        note: "Edited on the product page",
      });
    }

    revalidate("/admin/products");
    revalidate(`/admin/products/${id}`);
    revalidate("/admin/inventory");
    return { ok: true, message: "Changes saved." };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireOwner();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing product id.");

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidate("/admin/products");
  revalidate("/admin/inventory");
  // Called from both the list and the edit page — the edit page no longer
  // exists once the product is gone, so always land on the list.
  redirect("/admin/products");
}

export async function duplicateProduct(formData: FormData): Promise<void> {
  await requireOwner();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);

  const {
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...rest
  } = data as Record<string, unknown> & { id: string };

  const copyName = `${String(rest.name)} (copy)`;
  const { error: insertError } = await supabase.from("products").insert({
    ...rest,
    name: copyName,
    slug: await uniqueSlug(slugify(copyName)),
    // A copy gets its own SKU — two products sharing one is a reporting trap.
    sku: await generateSku(
      supabase,
      await categoryNameFor(supabase, (rest.category_id as string | null) ?? null),
    ),
    status: "draft",
    stock: 0,
  });
  if (insertError) throw new Error(insertError.message);

  revalidate("/admin/products");
}

export type BulkActionState = ActionResult | { ok: null };

function selectedIds(formData: FormData): string[] {
  const raw = String(formData.get("ids") ?? "");
  return raw.split(",").map((id) => id.trim()).filter(Boolean);
}

/** Applies one status to every selected product. */
export async function bulkSetStatus(
  _previous: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    const ids = selectedIds(formData);
    if (ids.length === 0) throw new Error("Nothing selected.");

    const status = String(formData.get("status") ?? "");
    if (!["draft", "active", "archived"].includes(status)) {
      throw new Error("Unknown status.");
    }

    const { error } = await supabase
      .from("products")
      .update({ status })
      .in("id", ids);
    if (error) throw new Error(error.message);

    revalidate("/admin/products");
    revalidate("/admin/inventory");
    return {
      ok: true,
      message: `${ids.length} product${ids.length === 1 ? "" : "s"} set to ${status}.`,
    };
  } catch (error) {
    return actionError(error);
  }
}

/**
 * Deletes every selected product.
 *
 * The typed confirmation is re-checked here, not just in the dialog — a client
 * that skips the prompt shouldn't be able to wipe the catalogue.
 */
export async function bulkDelete(
  _previous: BulkActionState,
  formData: FormData,
): Promise<BulkActionState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    const ids = selectedIds(formData);
    if (ids.length === 0) throw new Error("Nothing selected.");

    const confirmation = String(formData.get("confirmation") ?? "").trim();
    if (confirmation !== DELETE_CONFIRMATION) {
      throw new Error(`Type ${DELETE_CONFIRMATION} to confirm.`);
    }

    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) throw new Error(error.message);

    revalidate("/admin/products");
    revalidate("/admin/inventory");
    revalidate("/admin");
    return {
      ok: true,
      message: `${ids.length} product${ids.length === 1 ? "" : "s"} deleted.`,
    };
  } catch (error) {
    return actionError(error);
  }
}

/** Quick status flip from the products table. */
export async function setProductStatus(formData: FormData): Promise<void> {
  await requireOwner();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["draft", "active", "archived"].includes(status)) {
    throw new Error("Unknown status.");
  }

  const { error } = await supabase
    .from("products")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidate("/admin/products");
}
