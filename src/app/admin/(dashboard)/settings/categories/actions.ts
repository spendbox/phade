"use server";

import { revalidate } from "@/lib/admin-revalidate";

import { DEFAULT_CATEGORY_ICON, isCategoryIconKey } from "@/lib/category-icons";
import { actionError, requireOwner } from "@/lib/guard";
import { slugify } from "@/lib/format";
import { requireSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

export type CategoryFormState = ActionResult | { ok: null };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const supabase = requireSupabase();
  // Bounded: a lookup that kept answering "taken" would otherwise spin
  // forever, and a timestamped slug beats a hung request.
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = attempt === 1 ? base || "category" : `${base}-${attempt}`;
    let query = supabase.from("categories").select("id").eq("slug", candidate);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data, error } = await query.limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return candidate;
  }

  return `${base}-${Date.now().toString().slice(-6)}`;
}

export async function saveCategory(
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    const id = text(formData, "id");
    const name = text(formData, "name");
    if (!name) throw new Error("Give the category a name.");

    const sortOrder = Number.parseInt(text(formData, "sort_order"), 10);
    const icon = text(formData, "icon");

    const payload = {
      name,
      slug: await uniqueSlug(slugify(text(formData, "slug") || name), id || undefined),
      description: text(formData, "description") || null,
      image_url: text(formData, "image_url") || null,
      icon: isCategoryIconKey(icon) ? icon : DEFAULT_CATEGORY_ICON,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    };

    const { error } = id
      ? await supabase.from("categories").update(payload).eq("id", id)
      : await supabase.from("categories").insert(payload);
    if (error) throw new Error(error.message);

    revalidate("/admin/settings/categories");
    revalidate("/admin/products");
    return { ok: true, message: id ? "Category updated." : `${name} added.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireOwner();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing category id.");

  // Products keep existing — the schema nulls their category_id.
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidate("/admin/settings/categories");
  revalidate("/admin/products");
}

// ---------------------------------------------------------------------------
// Subcategories
// ---------------------------------------------------------------------------

export type SubcategoryFormState = ActionResult | { ok: null };

async function uniqueSubcategorySlug(
  base: string,
  ignoreId?: string,
): Promise<string> {
  const supabase = requireSupabase();
  // Bounded: a lookup that kept answering "taken" would otherwise spin
  // forever, and a timestamped slug beats a hung request.
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = attempt === 1 ? base || "subcategory" : `${base}-${attempt}`;
    let query = supabase.from("subcategories").select("id").eq("slug", candidate);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data, error } = await query.limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return candidate;
  }

  return `${base}-${Date.now().toString().slice(-6)}`;
}

export async function saveSubcategory(
  _previous: SubcategoryFormState,
  formData: FormData,
): Promise<SubcategoryFormState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    const id = text(formData, "id");
    const name = text(formData, "name");
    if (!name) throw new Error("Give the subcategory a name.");

    const sortOrder = Number.parseInt(text(formData, "sort_order"), 10);

    const payload = {
      name,
      slug: await uniqueSubcategorySlug(slugify(name), id || undefined),
      category_id: text(formData, "category_id") || null,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    };

    // Renaming has to carry the products along, or every product tagged with
    // the old wording quietly falls off the renamed subcategory.
    let previousName: string | null = null;
    if (id) {
      const { data } = await supabase
        .from("subcategories")
        .select("name")
        .eq("id", id)
        .maybeSingle();
      previousName = (data?.name as string | undefined) ?? null;
    }

    const { error } = id
      ? await supabase.from("subcategories").update(payload).eq("id", id)
      : await supabase.from("subcategories").insert(payload);
    if (error) throw new Error(error.message);

    if (previousName && previousName !== name) {
      await supabase
        .from("products")
        .update({ subcategory: name })
        .eq("subcategory", previousName);
    }

    revalidate("/admin/settings/categories");
    revalidate("/admin/products");
    return { ok: true, message: id ? "Subcategory updated." : `${name} added.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteSubcategory(formData: FormData): Promise<void> {
  await requireOwner();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing subcategory id.");

  // The list entry goes; products keep whatever they were labelled with, so
  // deleting a term from the list can't silently retag the catalogue.
  const { error } = await supabase.from("subcategories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidate("/admin/settings/categories");
  revalidate("/admin/products");
}
