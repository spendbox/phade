import {
  CATALOGUE_KEY,
  DEFAULT_CATALOGUE,
  parseCatalogue,
  type CatalogueDefaults,
} from "@/lib/catalogue";
import { getSupabase } from "@/lib/supabase";

/**
 * What this shop has actually saved as its palette and size runs.
 *
 * Server-side only — it reads through the service-role client. The shapes,
 * the shipped defaults and the parsing all live in `@/lib/catalogue`, which
 * has no database in it and so is safe for the admin's own pickers to import.
 */
export * from "@/lib/catalogue";

export async function getCatalogueDefaults(): Promise<CatalogueDefaults> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_CATALOGUE;

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", CATALOGUE_KEY)
    .maybeSingle();

  if (error || !data) return DEFAULT_CATALOGUE;
  return parseCatalogue((data as { value: unknown }).value);
}
