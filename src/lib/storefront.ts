import { cache } from "react";
import { unstable_cache } from "next/cache";

import { isSocialPlatform, type SocialPlatform } from "@/components/shop/social-icons";
import { CATALOGUE_TAG } from "@/lib/shop-queries";
import { getSupabase } from "@/lib/supabase";

/**
 * The words and pictures on the shop front.
 *
 * These live in `app_settings` beside the operational preferences rather than
 * in their own table: it is one row of JSON, the admin edits it as a single
 * form, and adding a field later needs no migration.
 */

export type SocialLink = { platform: SocialPlatform; url: string };

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
  /** The words that run across the strip under the hero. */
  marquee: string[];
  /** The paragraph beside the logo at the foot of every page. */
  footerBlurb: string;
  socials: SocialLink[];
};

export const STOREFRONT_KEY = "storefront_content";

export const DEFAULT_STOREFRONT: StorefrontContent = {
  announcement: "Free delivery on orders over ₦100,000",
  announcementEnabled: false,
  heroHeadline: "Building something amazing",
  heroSubheadline: "",
  heroImages: [],
  heroCtaLabel: "Shop new in",
  heroCtaHref: "/shop",
  featuredHeading: "Featured",
  featuredProductIds: [],
  marquee: ["New in", "Delivered nationwide", "Chosen one piece at a time"],
  footerBlurb:
    "Bags, shoes and ready-to-wear, chosen one piece at a time and delivered across Nigeria.",
  socials: [],
};

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Only links we can put an icon beside, and only ones a browser will follow. */
function parseSocials(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  return raw.flatMap((item): SocialLink[] => {
    if (typeof item !== "object" || item === null) return [];
    const value = item as Record<string, unknown>;

    if (!isSocialPlatform(value.platform)) return [];
    if (seen.has(value.platform)) return [];

    const url = typeof value.url === "string" ? value.url.trim() : "";
    if (!/^https?:\/\//i.test(url)) return [];

    seen.add(value.platform);
    return [{ platform: value.platform, url }];
  });
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
    marquee: strList(value.marquee),
    footerBlurb: str(value.footerBlurb, DEFAULT_STOREFRONT.footerBlurb),
    socials: parseSocials(value.socials),
  };
}

async function loadStorefront(): Promise<StorefrontContent> {
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

/**
 * One row of JSON that every shop page needs — the layout for the announcement
 * and the delivery rules, the landing page for the hero. Cached the same way
 * and under the same tag as the catalogue: per request so the layout and the
 * page share one read, and across requests so a busy evening isn't one query
 * per visitor for a row that only changes when someone submits a form.
 */
export const getStorefront = cache(async function getStorefront(): Promise<StorefrontContent> {
  return unstable_cache(loadStorefront, ["storefront-content"], {
    revalidate: 60,
    tags: [CATALOGUE_TAG],
  })();
});
