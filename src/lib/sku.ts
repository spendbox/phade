import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Builds the next SKU for a product, so the admin never has to invent one.
 *
 * Shape: `PW-BAG-0007` — brand prefix, three letters from the category, and a
 * sequence that continues from the highest number already used in that
 * category. A blank SKU on the form means "generate one"; a typed SKU is kept
 * as-is.
 */

const BRAND_PREFIX = "PW";
const FALLBACK_SEGMENT = "GEN";

function segmentFor(categoryName?: string | null): string {
  const letters = (categoryName ?? "").replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.length >= 3
    ? letters.slice(0, 3)
    : (letters + FALLBACK_SEGMENT).slice(0, 3);
}

export async function generateSku(
  supabase: SupabaseClient,
  categoryName?: string | null,
): Promise<string> {
  const prefix = `${BRAND_PREFIX}-${segmentFor(categoryName)}-`;

  const { data, error } = await supabase
    .from("products")
    .select("sku")
    .like("sku", `${prefix}%`)
    .order("sku", { ascending: false })
    .limit(1);

  // A failed lookup shouldn't block creating a product — fall back to the
  // first number in the series and let the uniqueness loop below sort it out.
  const highest = error ? null : ((data?.[0]?.sku as string | undefined) ?? null);
  const lastNumber = highest ? Number.parseInt(highest.slice(prefix.length), 10) : 0;

  let next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;

  // Guard against gaps and races: step forward until the SKU is genuinely free.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = `${prefix}${String(next).padStart(4, "0")}`;
    const { data: clash } = await supabase
      .from("products")
      .select("id")
      .eq("sku", candidate)
      .limit(1);

    if (!clash || clash.length === 0) return candidate;
    next += 1;
  }

  // Extremely unlikely — fall back to something unique by construction.
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

/** Looks up a category name so the SKU segment reflects it. */
export async function categoryNameFor(
  supabase: SupabaseClient,
  categoryId: string | null,
): Promise<string | null> {
  if (!categoryId) return null;
  const { data } = await supabase
    .from("categories")
    .select("name")
    .eq("id", categoryId)
    .maybeSingle();
  return (data?.name as string | undefined) ?? null;
}
