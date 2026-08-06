"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionError, requireAdmin } from "@/lib/guard";
import { nairaToKobo, slugify } from "@/lib/format";
import { requireSupabase } from "@/lib/supabase";
import type { ActionResult, ProductStatus } from "@/lib/types";

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
  stock: number;
  low_stock_threshold: number;
  status: ProductStatus;
  images: string[];
  tags: string[];
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

function parseProduct(formData: FormData): ParsedProduct {
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

  return {
    name,
    slug: slugify(text(formData, "slug") || name),
    description: optional(formData, "description"),
    category_id: optional(formData, "category_id"),
    price_kobo: price,
    compare_at_price_kobo: compareAt,
    cost_price_kobo: cost,
    sku: optional(formData, "sku"),
    stock: Math.max(integer(formData, "stock"), 0),
    low_stock_threshold: Math.max(integer(formData, "low_stock_threshold", 5), 0),
    status: ["draft", "active", "archived"].includes(status) ? status : "draft",
    images,
    tags,
    featured: formData.get("featured") === "on",
  };
}

/** Slugs are unique; append -2, -3 … until we find a free one. */
async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const supabase = requireSupabase();
  let candidate = base || "product";
  let attempt = 1;

  for (;;) {
    let query = supabase.from("products").select("id").eq("slug", candidate);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data, error } = await query.limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}

export async function createProduct(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    await requireAdmin();
    const supabase = requireSupabase();
    const parsed = parseProduct(formData);
    parsed.slug = await uniqueSlug(parsed.slug);

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

    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    return { ok: true, message: `${parsed.name} created.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateProduct(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  try {
    await requireAdmin();
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

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/admin/inventory");
    return { ok: true, message: "Changes saved." };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing product id.");

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  // Called from both the list and the edit page — the edit page no longer
  // exists once the product is gone, so always land on the list.
  redirect("/admin/products");
}

export async function duplicateProduct(formData: FormData): Promise<void> {
  await requireAdmin();
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
    status: "draft",
    stock: 0,
  });
  if (insertError) throw new Error(insertError.message);

  revalidatePath("/admin/products");
}

/** Quick status flip from the products table. */
export async function setProductStatus(formData: FormData): Promise<void> {
  await requireAdmin();
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

  revalidatePath("/admin/products");
}
