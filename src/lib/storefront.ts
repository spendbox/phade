import { getSupabase } from "@/lib/supabase";

/**
 * The words and pictures on the shop front.
 *
 * These live in `app_settings` beside the operational preferences rather than
 * in their own table: it is one row of JSON, the admin edits it as a single
 * form, and adding a field later needs no migration.
 */

export type StorefrontContent = {
  announcement: string;
  announcementEnabled: boolean;
  heroHeadline: string;
  heroSubheadline: string;
  heroImages: string[];
  heroCtaLabel: string;
  heroCtaHref: string;
  featuredHeading: string;
  featuredProductIds: string[];
};

export const STOREFRONT_KEY = "storefront_content";

export const DEFAULT_STOREFRONT: StorefrontContent = {
  announcement: "Free delivery in Lagos on orders over ₦100,000",
  announcementEnabled: false,
  heroHeadline: "Building something amazing",
  heroSubheadline: "",
  heroImages: [],
  heroCtaLabel: "Shop new in",
  heroCtaHref: "/shop",
  featuredHeading: "Featured",
  featuredProductIds: [],
};

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Anything missing or the wrong shape falls back, so a half-filled row still renders. */
export function parseStorefront(raw: unknown): StorefrontContent {
  if (typeof raw !== "object" || raw === null) return DEFAULT_STOREFRONT;
  const value = raw as Record<string, unknown>;

  return {
    announcement: str(value.announcement, DEFAULT_STOREFRONT.announcement),
    announcementEnabled: value.announcementEnabled === true,
    heroHeadline: str(value.heroHeadline, DEFAULT_STOREFRONT.heroHeadline),
    heroSubheadline: str(value.heroSubheadline, ""),
    heroImages: strList(value.heroImages),
    heroCtaLabel: str(value.heroCtaLabel, DEFAULT_STOREFRONT.heroCtaLabel),
    heroCtaHref: str(value.heroCtaHref, DEFAULT_STOREFRONT.heroCtaHref),
    featuredHeading: str(
      value.featuredHeading,
      DEFAULT_STOREFRONT.featuredHeading,
    ),
    featuredProductIds: strList(value.featuredProductIds),
  };
}

export async function getStorefront(): Promise<StorefrontContent> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_STOREFRONT;

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", STOREFRONT_KEY)
    .maybeSingle();

  if (error || !data) return DEFAULT_STOREFRONT;
  return parseStorefront((data as { value: unknown }).value);
}
