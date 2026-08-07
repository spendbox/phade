"use server";

import { revalidatePath } from "next/cache";

import { actionError, requireAdmin } from "@/lib/guard";
import { SETTING_KEYS } from "@/lib/settings";
import { requireSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

export type SettingsFormState = ActionResult | { ok: null };

export async function saveSettings(
  _previous: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  try {
    await requireAdmin();
    const supabase = requireSupabase();

    const threshold = Number.parseInt(
      String(formData.get("low_stock_threshold") ?? ""),
      10,
    );
    if (!Number.isFinite(threshold) || threshold < 0) {
      throw new Error("Enter a whole number of units, 0 or more.");
    }

    const { error } = await supabase.from("app_settings").upsert(
      {
        key: SETTING_KEYS.lowStockThreshold,
        value: threshold,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);

    revalidatePath("/admin/settings");
    revalidatePath("/admin/products/new");
    return { ok: true, message: "Saved." };
  } catch (error) {
    return actionError(error);
  }
}
