"use server";

import { revalidatePath } from "next/cache";

import { actionError, requireAdmin } from "@/lib/guard";
import {
  CATALOGUE_KEY,
  parseColorList,
  parseSizeList,
  type CatalogueDefaults,
} from "@/lib/catalogue-settings";
import { SETTING_KEYS } from "@/lib/settings";
import {
  STOREFRONT_KEY,
  type StorefrontContent,
} from "@/lib/storefront";
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

export type StorefrontFormState = ActionResult | { ok: null };

function jsonList(formData: FormData, key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(String(formData.get(key) ?? "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export async function saveStorefront(
  _previous: StorefrontFormState,
  formData: FormData,
): Promise<StorefrontFormState> {
  try {
    await requireAdmin();
    const supabase = requireSupabase();

    const headline = String(formData.get("hero_headline") ?? "").trim();
    if (!headline) throw new Error("The hero needs a headline.");

    const ctaHref = String(formData.get("hero_cta_href") ?? "").trim();
    // Only same-site paths and full URLs — a bare word would send shoppers
    // somewhere the browser resolves unpredictably.
    if (ctaHref && !/^(\/|https?:\/\/)/.test(ctaHref)) {
      throw new Error(
        "The button link must start with / for a page on this site, or https:// for somewhere else.",
      );
    }

    const content: StorefrontContent = {
      announcement: String(formData.get("announcement") ?? "").trim(),
      announcementEnabled: formData.get("announcement_enabled") === "on",
      heroHeadline: headline,
      heroSubheadline: String(formData.get("hero_subheadline") ?? "").trim(),
      heroImages: jsonList(formData, "hero_images"),
      heroCtaLabel: String(formData.get("hero_cta_label") ?? "").trim(),
      heroCtaHref: ctaHref,
      featuredHeading: String(formData.get("featured_heading") ?? "").trim(),
      featuredProductIds: String(formData.get("featured_product_ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    };

    const { error } = await supabase.from("app_settings").upsert(
      {
        key: STOREFRONT_KEY,
        value: content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);

    revalidatePath("/admin/settings/storefront");
    revalidatePath("/");
    return { ok: true, message: "Storefront updated." };
  } catch (error) {
    return actionError(error);
  }
}

export type CatalogueFormState = ActionResult | { ok: null };

/**
 * The shop's palette and size run. Both are stored whole rather than merged,
 * so removing a colour here actually removes it instead of leaving a stale
 * entry behind.
 */
export async function saveCatalogue(
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  try {
    await requireAdmin();
    const supabase = requireSupabase();

    let rawColors: unknown = [];
    let rawSizes: unknown = [];
    try {
      rawColors = JSON.parse(String(formData.get("colors") ?? "[]"));
      rawSizes = JSON.parse(String(formData.get("sizes") ?? "[]"));
    } catch {
      throw new Error("Couldn't read those values. Try again.");
    }

    const colors = parseColorList(rawColors);
    if (colors.length === 0) {
      throw new Error("Keep at least one colour in the palette.");
    }

    const content: CatalogueDefaults = {
      colors,
      sizes: parseSizeList(rawSizes),
    };

    const { error } = await supabase.from("app_settings").upsert(
      {
        key: CATALOGUE_KEY,
        value: content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);

    revalidatePath("/admin/settings/catalogue");
    revalidatePath("/admin/products/new");
    revalidatePath("/admin/database");
    return { ok: true, message: "Catalogue updated." };
  } catch (error) {
    return actionError(error);
  }
}
