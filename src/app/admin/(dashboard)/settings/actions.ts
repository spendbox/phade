"use server";

import { revalidate } from "@/lib/admin-revalidate";

import { actionError, requireOwner } from "@/lib/guard";
import {
  CATALOGUE_KEY,
  parseColorList,
  parseSizeList,
  type CatalogueDefaults,
} from "@/lib/catalogue-settings";
import { nairaToKobo } from "@/lib/format";
import { SETTING_KEYS } from "@/lib/settings";
import {
  parseShipping,
  SHIPPING_KEY,
  type ShippingSettings,
} from "@/lib/shipping";
import {
  parseStorefront,
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
    await requireOwner();
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

    revalidate("/admin/settings");
    revalidate("/admin/products/new");
    return { ok: true, message: "Saved." };
  } catch (error) {
    return actionError(error);
  }
}

export type StorefrontFormState = ActionResult | { ok: null };

/**
 * The front page's sections, named the same way in the form, in the parser and
 * in the stored row — so adding one is a field named `<key>_heading` and
 * nothing else.
 */
const SECTION_KEYS = [
  "collections",
  "featured",
  "newIn",
  "bestSellers",
  "closing",
] as const;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function jsonList(formData: FormData, key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(String(formData.get(key) ?? "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

/** One row per platform, blank rows meaning "not on it". */
function socialLinks(formData: FormData): { platform: string; url: string }[] {
  try {
    const parsed: unknown = JSON.parse(String(formData.get("socials") ?? "[]"));
    return Array.isArray(parsed)
      ? (parsed as { platform: string; url: string }[])
      : [];
  } catch {
    return [];
  }
}

export async function saveStorefront(
  _previous: StorefrontFormState,
  formData: FormData,
): Promise<StorefrontFormState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    const headline = String(formData.get("hero_headline") ?? "").trim();
    if (!headline) throw new Error("The hero needs a headline.");

    const ctaHref = text(formData, "hero_cta_href");

    // Only same-site paths and full URLs — a bare word would send shoppers
    // somewhere the browser resolves unpredictably.
    for (const link of [
      ctaHref,
      text(formData, "about_cta_href"),
      ...SECTION_KEYS.map((key) => text(formData, `${key}_cta_href`)),
    ]) {
      if (link && !/^(\/|https?:\/\/)/.test(link)) {
        throw new Error(
          "A button link must start with / for a page on this site, or https:// for somewhere else.",
        );
      }
    }

    const content: StorefrontContent = {
      announcement: String(formData.get("announcement") ?? "").trim(),
      announcementEnabled: formData.get("announcement_enabled") === "on",
      heroHeadline: headline,
      heroSubheadline: String(formData.get("hero_subheadline") ?? "").trim(),
      heroImages: jsonList(formData, "hero_images"),
      heroCtaLabel: String(formData.get("hero_cta_label") ?? "").trim(),
      heroCtaHref: ctaHref,
      featuredProductIds: String(formData.get("featured_product_ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
      // Parsed rather than assigned: a heading cleared to nothing takes its
      // default back, and the same guard the storefront reads through is the
      // one that decides what a blank field means.
      sections: parseStorefront({
        sections: Object.fromEntries(
          SECTION_KEYS.map((key) => [
            key,
            {
              heading: text(formData, `${key}_heading`),
              note: text(formData, `${key}_note`),
              ctaLabel: text(formData, `${key}_cta_label`),
              ctaHref: text(formData, `${key}_cta_href`),
            },
          ]),
        ),
      }).sections,
      about: parseStorefront({
        about: {
          enabled: formData.get("about_enabled") === "on",
          eyebrow: text(formData, "about_eyebrow"),
          heading: text(formData, "about_heading"),
          body: text(formData, "about_body"),
          ctaLabel: text(formData, "about_cta_label"),
          ctaHref: text(formData, "about_cta_href"),
          mediaUrl: jsonList(formData, "about_media")[0] ?? "",
          posterUrl: jsonList(formData, "about_poster")[0] ?? "",
        },
      }).about,
      // One word per line is easier to edit than a comma-separated string, and
      // it can't be broken by a word that contains a comma.
      marquee: String(formData.get("marquee") ?? "")
        .split("\n")
        .map((word) => word.trim())
        .filter(Boolean)
        .slice(0, 20),
      footerBlurb: String(formData.get("footer_blurb") ?? "").trim(),
      socials: parseStorefront({ socials: socialLinks(formData) }).socials,
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

    revalidate("/admin/settings/storefront");
    revalidate("/");
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
    await requireOwner();
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

    revalidate("/admin/settings/catalogue");
    revalidate("/admin/products/new");
    revalidate("/admin/database");
    return { ok: true, message: "Catalogue updated." };
  } catch (error) {
    return actionError(error);
  }
}

export type ShippingFormState = ActionResult | { ok: null };

/**
 * Delivery pricing, saved whole.
 *
 * The zones arrive as one JSON field rather than a form's worth of indexed
 * inputs, because they are a list the admin reorders and deletes from — and a
 * partially-applied save, where a zone kept its price but lost its states,
 * would quietly overcharge people. `parseShipping` is the same guard the
 * storefront reads through, so nothing can be stored that the shop can't read.
 */
export async function saveShipping(
  _previous: ShippingFormState,
  formData: FormData,
): Promise<ShippingFormState> {
  try {
    await requireOwner();
    const supabase = requireSupabase();

    let rawZones: unknown = [];
    let rawPlaces: unknown = [];
    try {
      rawZones = JSON.parse(String(formData.get("zones") ?? "[]"));
      rawPlaces = JSON.parse(String(formData.get("pickup_locations") ?? "[]"));
    } catch {
      throw new Error("Couldn't read those zones. Try again.");
    }

    if (Array.isArray(rawZones)) {
      for (const zone of rawZones as Record<string, unknown>[]) {
        const named = typeof zone?.name === "string" && zone.name.trim();
        // Either whole states, or named parts of Lagos — but something.
        const covers =
          (Array.isArray(zone?.states) && zone.states.length > 0) ||
          (Array.isArray(zone?.areas) && zone.areas.length > 0);
        if (!named || !covers) {
          throw new Error(
            "Every zone needs a name and somewhere it covers. Remove the empty one, or fill it in.",
          );
        }
      }
    }

    if (Array.isArray(rawPlaces)) {
      for (const place of rawPlaces as Record<string, unknown>[]) {
        const named = typeof place?.name === "string" && place.name.trim();
        const located =
          typeof place?.address === "string" && place.address.trim();
        if (!named || !located) {
          throw new Error(
            "A pickup address needs a name and an address. Remove the empty one, or fill it in.",
          );
        }
      }
    }

    const content: ShippingSettings = parseShipping({
      defaultFeeKobo: nairaToKobo(String(formData.get("default_fee") ?? "")),
      freeOverKobo: nairaToKobo(String(formData.get("free_over") ?? "")),
      zones: rawZones,
      pickupEnabled: formData.get("pickup_enabled") === "on",
      pickupNote: String(formData.get("pickup_note") ?? "").trim(),
      pickupLocations: rawPlaces,
    });

    const { error } = await supabase.from("app_settings").upsert(
      {
        key: SHIPPING_KEY,
        value: content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);

    revalidate("/admin/settings/shipping");
    revalidate("/");
    return { ok: true, message: "Shipping updated." };
  } catch (error) {
    return actionError(error);
  }
}
