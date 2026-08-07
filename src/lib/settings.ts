import { getSupabase } from "@/lib/supabase";

/**
 * Preferences the admin changes from the dashboard rather than by editing
 * environment variables and redeploying. Stored as key/value rows so adding a
 * setting later doesn't need a migration.
 */

export type AppSettings = {
  /** Default reorder point applied to newly created products. */
  lowStockThreshold: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  lowStockThreshold: 5,
};

export const SETTING_KEYS = {
  lowStockThreshold: "low_stock_threshold",
} as const;

export async function getSettings(): Promise<AppSettings> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_SETTINGS;

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value");

  // Settings are a convenience, never a blocker — fall back to the defaults.
  if (error || !data) return DEFAULT_SETTINGS;

  const map = new Map(
    (data as { key: string; value: unknown }[]).map((row) => [row.key, row.value]),
  );

  const stored = Number(map.get(SETTING_KEYS.lowStockThreshold));

  return {
    lowStockThreshold:
      Number.isFinite(stored) && stored >= 0
        ? Math.trunc(stored)
        : DEFAULT_SETTINGS.lowStockThreshold,
  };
}
