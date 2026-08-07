"use server";

import { revalidatePath } from "next/cache";

import { DEFAULT_CATEGORY_ICON, isCategoryIconKey } from "@/lib/category-icons";
import { actionError, requireAdmin } from "@/lib/guard";
import { slugify } from "@/lib/format";
import { requireSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

export type CategoryFormState = ActionResult | { ok: null };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const supabase = requireSupabase();
  let candidate = base || "category";
  let attempt = 1;

  for (;;) {
    let query = supabase.from("categories").select("id").eq("slug", candidate);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data, error } = await query.limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}

export async function saveCategory(
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  try {
    await requireAdmin();
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

    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    return { ok: true, message: id ? "Category updated." : `${name} added.` };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = requireSupabase();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing category id.");

  // Products keep existing — the schema nulls their category_id.
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}
