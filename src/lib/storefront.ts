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

/**
 * The story the shop tells about itself, halfway down the front page.
 *
 * The picture beside it can be a video instead — a rail of clothes moving is
 * worth more than a still of it — and a video carries a poster, because the
 * first frame of a clip is rarely the frame anyone would have chosen.
 */
export type AboutBlock = {
  enabled: boolean;
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  /** An image, or a video told apart by its extension. */
  mediaUrl: string;
  /** The still behind a video, before it plays. Ignored for an image. */
  posterUrl: string;
};

/**
 * One section of the front page, in words.
 *
 * All of it is copy, not code: the name of the section, the line under it, and
 * the button out of it. A shop that wants "Just landed" where we wrote "New
 * in" should be able to say so from the dashboard, and anything left blank
 * takes its default rather than leaving a hole in the page — except the
 * button, which is hidden entirely when it has no words, because an unnamed
 * button is worse than no button.
 */
export type SectionCopy = {
  heading: string;
  note: string;
  ctaLabel: string;
  ctaHref: string;
};

/** The front page's sections, in the order a shopper meets them. */
export type StorefrontSections = {
  collections: SectionCopy;
  featured: SectionCopy;
  newIn: SectionCopy;
  bestSellers: SectionCopy;
  closing: SectionCopy;
};

/**
 * One line in the menu behind the hamburger.
 *
 * Editable because a shop knows its own rooms: one that sells only abayas
 * wants "Abayas" where another wants "Categories", and neither should need a
 * deploy to say so. `#contact` is the one href that isn't a page — it opens
 * the message pop-up, since "Contact us" is a thing every shop puts in a menu
 * and there is no page behind it here.
 */
export type MenuLink = { label: string; href: string };

/** The href that opens the message pop-up rather than going anywhere. */
export const CONTACT_HREF = "#contact";

/**
 * How a shopper reaches a person.
 *
 * The email is where the message goes. WhatsApp is optional because plenty of
 * shops run on it entirely and plenty of others would rather not hand out a
 * number; the one that does can name which line it opens.
 */
export type SupportDetails = {
  email: string;
  whatsappEnabled: boolean;
  /** Digits only, in full international form — 234… not 0…, no plus. */
  whatsappNumber: string;
  /** What the pop-up says above the two ways to get in touch. */
  note: string;
};

export type StorefrontContent = {
  announcement: string;
  announcementEnabled: boolean;
  heroHeadline: string;
  heroSubheadline: string;
  heroImages: string[];
  heroCtaLabel: string;
  heroCtaHref: string;
  featuredProductIds: string[];
  sections: StorefrontSections;
  about: AboutBlock;
  /** The words that run across the strip under the hero. */
  marquee: string[];
  /** What sits behind the hamburger, in the order it is read. */
  menu: MenuLink[];
  /** Where a message from the shop front actually goes. */
  support: SupportDetails;
  /** The paragraph beside the logo at the foot of every page. */
  footerBlurb: string;
  socials: SocialLink[];
};

export const STOREFRONT_KEY = "storefront_content";

export const DEFAULT_SECTIONS: StorefrontSections = {
  collections: {
    heading: "Shop by collection",
    note: "",
    ctaLabel: "",
    ctaHref: "",
  },
  featured: {
    heading: "Featured",
    note: "Swipe a card away to meet the next one. Tap it to see every photograph, the colours and the sizes.",
    ctaLabel: "Shop everything",
    ctaHref: "/shop",
  },
  newIn: {
    heading: "New in",
    note: "A new season of refined, effortless pieces.",
    ctaLabel: "View all",
    ctaHref: "/shop?sort=new",
  },
  bestSellers: {
    heading: "Best sellers",
    note: "",
    ctaLabel: "See all",
    ctaHref: "/shop?sort=best",
  },
  closing: {
    // The heading is the small line above; the subtext is the big one, and
    // left empty it counts the shop for itself.
    heading: "The whole shop",
    note: "",
    ctaLabel: "Open the shop",
    ctaHref: "/shop",
  },
};

export const DEFAULT_ABOUT: AboutBlock = {
  enabled: false,
  eyebrow: "Our story",
  heading: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
  mediaUrl: "",
  posterUrl: "",
};

export const DEFAULT_MENU: MenuLink[] = [
  { label: "Home", href: "/" },
  { label: "Categories", href: "/shop" },
  { label: "New in", href: "/shop?sort=new" },
  { label: "Saved", href: "/saved" },
  { label: "Track an order", href: "/track" },
  { label: "Contact us", href: CONTACT_HREF },
];

export const DEFAULT_SUPPORT: SupportDetails = {
  email: "phadewoman@gmail.com",
  whatsappEnabled: false,
  whatsappNumber: "",
  note: "Ask us about sizing, an order, or anything else. We answer every message.",
};

export const DEFAULT_STOREFRONT: StorefrontContent = {
  announcement: "Free delivery on orders over ₦100,000",
  announcementEnabled: false,
  heroHeadline: "Building something amazing",
  heroSubheadline: "",
  heroImages: [],
  heroCtaLabel: "Shop new in",
  heroCtaHref: "/shop",
  featuredProductIds: [],
  sections: DEFAULT_SECTIONS,
  about: DEFAULT_ABOUT,
  marquee: ["New in", "Delivered nationwide", "Chosen one piece at a time"],
  menu: DEFAULT_MENU,
  support: DEFAULT_SUPPORT,
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

function group(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * One section's words.
 *
 * A blank heading or note falls back to ours, so clearing a field can never
 * leave a section with no name on it. A button, though, is only rendered when
 * it has both a label and somewhere to go: hiding it is a real choice a shop
 * might want to make, and there is no sensible default for "nowhere".
 */
function parseSection(
  raw: unknown,
  fallback: SectionCopy,
  legacyHeading?: unknown,
): SectionCopy {
  const value = group(raw);
  // Whether this section has ever been through the form. Until it has, the
  // page shows our words; once it has, it shows exactly what was typed —
  // including the blanks, since clearing a subtext or a button is a decision
  // and a default that grew back would be a field that can't be turned off.
  const edited = Object.keys(value).length > 0;

  const heading = str(value.heading, "").trim();

  return {
    heading: heading || str(legacyHeading, "").trim() || fallback.heading,
    note: edited ? str(value.note, "").trim() : fallback.note,
    ctaLabel: edited ? str(value.ctaLabel, "").trim() : fallback.ctaLabel,
    ctaHref: edited ? str(value.ctaHref, "").trim() : fallback.ctaHref,
  };
}

/**
 * The sections, with one eye on what an earlier shape of this row called them.
 * Headings lived in their own flat group for a while, and the featured
 * heading was a top-level field before that.
 */
function parseSections(
  raw: unknown,
  legacyHeadings: unknown,
  legacyFeatured: unknown,
): StorefrontSections {
  const value = group(raw);
  const old = group(legacyHeadings);
  const saved = (key: keyof StorefrontSections) => value[key];

  const sections: StorefrontSections = {
    collections: parseSection(
      saved("collections"),
      DEFAULT_SECTIONS.collections,
      old.collections,
    ),
    featured: parseSection(
      saved("featured"),
      DEFAULT_SECTIONS.featured,
      old.featured ?? legacyFeatured,
    ),
    newIn: parseSection(saved("newIn"), DEFAULT_SECTIONS.newIn, old.newIn),
    bestSellers: parseSection(
      saved("bestSellers"),
      DEFAULT_SECTIONS.bestSellers,
      old.bestSellers,
    ),
    closing: parseSection(saved("closing"), DEFAULT_SECTIONS.closing, old.closing),
  };

  // The line under New in was a heading of its own once.
  const tagline = str(old.newInTagline, "").trim();
  if (tagline && !group(saved("newIn")).note) {
    sections.newIn = { ...sections.newIn, note: tagline };
  }

  return sections;
}

function parseAbout(raw: unknown): AboutBlock {
  const value = group(raw);
  const heading = str(value.heading, "").trim();
  const body = str(value.body, "").trim();
  const mediaUrl = str(value.mediaUrl, "").trim();

  return {
    // A section with nothing in it at all stays off the page however it is
    // flagged — but a picture on its own is something, so that counts.
    enabled: value.enabled === true && Boolean(heading || body || mediaUrl),
    eyebrow: str(value.eyebrow, DEFAULT_ABOUT.eyebrow).trim(),
    heading,
    body,
    ctaLabel: str(value.ctaLabel, "").trim(),
    ctaHref: str(value.ctaHref, "").trim(),
    mediaUrl,
    posterUrl: str(value.posterUrl, "").trim(),
  };
}

/**
 * The menu, or ours where a shop has never touched it.
 *
 * An empty saved list is a real choice — a shop that deleted every line meant
 * to, and gets no menu button at all rather than the defaults growing back.
 */
function parseMenu(raw: unknown): MenuLink[] {
  if (!Array.isArray(raw)) return DEFAULT_MENU;

  return raw.flatMap((item): MenuLink[] => {
    if (typeof item !== "object" || item === null) return [];
    const value = item as Record<string, unknown>;

    const label = str(value.label, "").trim();
    const href = str(value.href, "").trim();
    // A line with no words, or nowhere to go, is not a menu item.
    if (!label || !href) return [];
    return [{ label, href }];
  });
}

function parseSupport(raw: unknown): SupportDetails {
  const value = group(raw);
  const email = str(value.email, "").trim();
  // Digits only: a number saved as "+234 801 234 5678" and one saved as
  // "2348012345678" have to open the same chat.
  const number = str(value.whatsappNumber, "").replace(/\D/g, "");

  return {
    email: email || DEFAULT_SUPPORT.email,
    whatsappEnabled: value.whatsappEnabled === true && number.length >= 8,
    whatsappNumber: number,
    note: Object.keys(value).length > 0
      ? str(value.note, "").trim()
      : DEFAULT_SUPPORT.note,
  };
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
    featuredProductIds: strList(value.featuredProductIds),
    sections: parseSections(
      value.sections,
      value.headings,
      value.featuredHeading,
    ),
    about: parseAbout(value.about),
    marquee: strList(value.marquee),
    menu: parseMenu(value.menu),
    support: parseSupport(value.support),
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
  // The key carries a version: this cache holds the *parsed* object, so a
  // release that adds a field would otherwise keep serving yesterday's shape
  // — a page reading `content.menu.length` off an object that has no menu.
  return unstable_cache(loadStorefront, ["storefront-content", "v2"], {
    revalidate: 60,
    tags: [CATALOGUE_TAG],
  })();
});
