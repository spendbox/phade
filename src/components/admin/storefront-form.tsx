"use client";

import { useActionState, useState } from "react";
import { Loader2, Search } from "lucide-react";

import {
  saveStorefront,
  type StorefrontFormState,
} from "@/app/admin/(dashboard)/settings/actions";
import { ImageUploader } from "@/components/admin/image-uploader";
import { MediaThumb } from "@/components/admin/media-thumb";
import { Button } from "@/components/ui/button";
import {
  SOCIAL_KEYS,
  SOCIAL_PLATFORMS,
  SocialIcon,
  type SocialPlatform,
} from "@/components/shop/social-icons";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Panel } from "@/components/ui/stat-tile";
import { cn } from "@/lib/cn";
import { DEFAULT_HEADINGS, type StorefrontContent } from "@/lib/storefront";

const initialState: StorefrontFormState = { ok: null };

export type FeaturedOption = {
  id: string;
  name: string;
  image: string | null;
};

/**
 * Everything a shopper reads on the shop, in the order they meet it: the
 * announcement strip, the hero, the words that scroll under it, what's
 * featured, and the footer they land on at the end.
 *
 * Delivery is not here — it has its own page, because a price that changes by
 * destination is a set of rules rather than a line of copy.
 */
export function StorefrontForm({
  content,
  products,
}: {
  content: StorefrontContent;
  products: FeaturedOption[];
}) {
  const [state, formAction, pending] = useActionState(
    saveStorefront,
    initialState,
  );

  const [announcementOn, setAnnouncementOn] = useState(
    content.announcementEnabled,
  );
  const [featured, setFeatured] = useState<string[]>(
    content.featuredProductIds.filter((id) =>
      products.some((product) => product.id === id),
    ),
  );
  const [aboutOn, setAboutOn] = useState(content.about.enabled);
  const [socials, setSocials] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      content.socials.map((link) => [link.platform, link.url]),
    ),
  );

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="featured_product_ids"
        value={featured.join(",")}
      />
      <input
        type="hidden"
        name="socials"
        value={JSON.stringify(
          SOCIAL_KEYS.flatMap((platform) =>
            socials[platform]?.trim()
              ? [{ platform, url: socials[platform].trim() }]
              : [],
          ),
        )}
      />

      <Panel title="Announcement bar">
        <div className="space-y-4">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="announcement_enabled"
              checked={announcementOn}
              onChange={(event) => setAnnouncementOn(event.target.checked)}
              className="size-4 rounded border-line-strong accent-brand"
            />
            <span className="font-medium text-ink">Show the bar</span>
            <span className="text-ink-muted">
              A single line across the top of every page
            </span>
          </label>

          <Field
            label="Message"
            htmlFor="announcement"
            hint="Keep it to one line — delivery news, a sale, opening hours."
          >
            <Input
              id="announcement"
              name="announcement"
              defaultValue={content.announcement}
              placeholder="Free delivery on orders over ₦100,000"
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Hero">
        <div className="space-y-4">
          <Field label="Headline" htmlFor="hero_headline" required>
            <Input
              id="hero_headline"
              name="hero_headline"
              required
              defaultValue={content.heroHeadline}
              placeholder="New season, ready to wear"
            />
          </Field>

          <Field
            label="Subheadline"
            htmlFor="hero_subheadline"
            hint="Optional — a sentence under the headline."
          >
            <Textarea
              id="hero_subheadline"
              name="hero_subheadline"
              rows={2}
              defaultValue={content.heroSubheadline}
              placeholder="Cut and finished for the way you actually dress."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Button text"
              htmlFor="hero_cta_label"
              hint="Leave blank to hide the button."
            >
              <Input
                id="hero_cta_label"
                name="hero_cta_label"
                defaultValue={content.heroCtaLabel}
                placeholder="Shop new in"
              />
            </Field>

            <Field
              label="Button link"
              htmlFor="hero_cta_href"
              hint="A path like /shop, or a full https:// address."
            >
              <Input
                id="hero_cta_href"
                name="hero_cta_href"
                defaultValue={content.heroCtaHref}
                placeholder="/shop"
              />
            </Field>
          </div>

          <Field
            label="Images"
            hint="The first is the main hero. Add more and they run as a set."
          >
            <ImageUploader name="hero_images" initial={content.heroImages} />
          </Field>
        </div>
      </Panel>

      <Panel title="The strip under the hero">
        <Field
          label="Words that scroll across"
          htmlFor="marquee"
          hint="One per line. Leave it empty and the strip stays hidden."
        >
          <Textarea
            id="marquee"
            name="marquee"
            rows={4}
            defaultValue={content.marquee.join("\n")}
            placeholder={"New in\nDelivered nationwide\nChosen one piece at a time"}
          />
        </Field>
      </Panel>

      <Panel title="Section headings">
        <div className="space-y-4">
          <p className="text-xs text-ink-muted">
            What each part of the front page is called. Clear a field and it
            goes back to the wording below.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Collections" htmlFor="heading_collections">
              <Input
                id="heading_collections"
                name="heading_collections"
                defaultValue={content.headings.collections}
                placeholder={DEFAULT_HEADINGS.collections}
              />
            </Field>
            <Field label="Featured" htmlFor="heading_featured">
              <Input
                id="heading_featured"
                name="heading_featured"
                defaultValue={content.headings.featured}
                placeholder={DEFAULT_HEADINGS.featured}
              />
            </Field>
            <Field label="New in" htmlFor="heading_new_in">
              <Input
                id="heading_new_in"
                name="heading_new_in"
                defaultValue={content.headings.newIn}
                placeholder={DEFAULT_HEADINGS.newIn}
              />
            </Field>
            <Field label="Best sellers" htmlFor="heading_best_sellers">
              <Input
                id="heading_best_sellers"
                name="heading_best_sellers"
                defaultValue={content.headings.bestSellers}
                placeholder={DEFAULT_HEADINGS.bestSellers}
              />
            </Field>
            <Field label="Everything else" htmlFor="heading_explore">
              <Input
                id="heading_explore"
                name="heading_explore"
                defaultValue={content.headings.explore}
                placeholder={DEFAULT_HEADINGS.explore}
              />
            </Field>
            <Field label="Closing block" htmlFor="heading_closing">
              <Input
                id="heading_closing"
                name="heading_closing"
                defaultValue={content.headings.closing}
                placeholder={DEFAULT_HEADINGS.closing}
              />
            </Field>
          </div>

          <Field
            label="The line under New in"
            htmlFor="heading_new_in_tagline"
            hint="One sentence about the season, over the new-in grid."
          >
            <Input
              id="heading_new_in_tagline"
              name="heading_new_in_tagline"
              defaultValue={content.headings.newInTagline}
              placeholder={DEFAULT_HEADINGS.newInTagline}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="About the shop">
        <div className="space-y-4">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="about_enabled"
              checked={aboutOn}
              onChange={(event) => setAboutOn(event.target.checked)}
              className="size-4 rounded border-line-strong accent-brand"
            />
            <span className="font-medium text-ink">Show the section</span>
            <span className="text-ink-muted">Halfway down the front page</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Small line above"
              htmlFor="about_eyebrow"
              hint="Optional — a word or two."
            >
              <Input
                id="about_eyebrow"
                name="about_eyebrow"
                defaultValue={content.about.eyebrow}
                placeholder="Our story"
              />
            </Field>

            <Field label="Heading" htmlFor="about_heading">
              <Input
                id="about_heading"
                name="about_heading"
                defaultValue={content.about.heading}
                placeholder="The essence of modern dressing"
              />
            </Field>
          </div>

          <Field label="What you want them to know" htmlFor="about_body">
            <Textarea
              id="about_body"
              name="about_body"
              rows={5}
              defaultValue={content.about.body}
              placeholder="Who the shop is for, where the pieces come from, why they were chosen."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Button text"
              htmlFor="about_cta_label"
              hint="Leave blank to hide the button."
            >
              <Input
                id="about_cta_label"
                name="about_cta_label"
                defaultValue={content.about.ctaLabel}
                placeholder="Learn more"
              />
            </Field>

            <Field label="Button link" htmlFor="about_cta_href">
              <Input
                id="about_cta_href"
                name="about_cta_href"
                defaultValue={content.about.ctaHref}
                placeholder="/shop"
              />
            </Field>
          </div>

          <Field
            label="Picture or video"
            hint="A video plays quietly on a loop beside the words."
          >
            <ImageUploader
              name="about_media"
              limit={1}
              initial={content.about.mediaUrl ? [content.about.mediaUrl] : []}
              hint="One photo, or one clip — MP4, WebM or MOV."
            />
          </Field>

          <Field
            label="Video placeholder"
            hint="The still shown before a video plays. Ignored when the file above is a photo."
          >
            <ImageUploader
              name="about_poster"
              limit={1}
              initial={content.about.posterUrl ? [content.about.posterUrl] : []}
              hint="One photo — the frame you'd have chosen."
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Featured products">
        <div className="space-y-4">
          <p className="text-xs text-ink-muted">
            These stack as cards a shopper swipes through. Only the first
            picture of each is shown, so the swipe moves between products
            rather than through one product&apos;s gallery.
          </p>

          <Field
            label="Products"
            hint={
              featured.length === 0
                ? "None chosen — the section stays hidden."
                : `${featured.length} chosen. They appear in the order you pick them.`
            }
            action={
              featured.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setFeatured([])}
                  className="text-xs font-medium text-ink-secondary hover:text-ink"
                >
                  Clear
                </button>
              ) : undefined
            }
          >
            <FeaturedPicker
              products={products}
              selected={featured}
              onChange={setFeatured}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Footer">
        <div className="space-y-4">
          <Field
            label="About the shop"
            htmlFor="footer_blurb"
            hint="The paragraph beside the logo at the foot of every page."
          >
            <Textarea
              id="footer_blurb"
              name="footer_blurb"
              rows={3}
              defaultValue={content.footerBlurb}
              placeholder="Bags, shoes and ready-to-wear, chosen one piece at a time."
            />
          </Field>

          <Field
            label="Where else to find you"
            hint="Paste a full link. Anything left blank stays off the footer."
          >
            <ul className="space-y-2">
              {SOCIAL_KEYS.map((platform: SocialPlatform) => (
                <li key={platform} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                      socials[platform]?.trim()
                        ? "bg-brand-soft text-brand"
                        : "bg-plane text-ink-muted",
                    )}
                    title={SOCIAL_PLATFORMS[platform].label}
                  >
                    <SocialIcon platform={platform} className="size-[18px]" />
                  </span>
                  <label className="sr-only" htmlFor={`social-${platform}`}>
                    {SOCIAL_PLATFORMS[platform].label}
                  </label>
                  <Input
                    id={`social-${platform}`}
                    type="url"
                    value={socials[platform] ?? ""}
                    onChange={(event) =>
                      setSocials((current) => ({
                        ...current,
                        [platform]: event.target.value,
                      }))
                    }
                    placeholder={SOCIAL_PLATFORMS[platform].placeholder}
                  />
                </li>
              ))}
            </ul>
          </Field>
        </div>
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs" role="status">
          {state.ok === true && (
            <span className="text-good-text">{state.message}</span>
          )}
          {state.ok === false && (
            <span className="text-critical">{state.error}</span>
          )}
        </p>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save storefront
        </Button>
      </div>
    </form>
  );
}

function FeaturedPicker({
  products,
  selected,
  onChange,
}: {
  products: FeaturedOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [search, setSearch] = useState("");

  if (products.length === 0) {
    return (
      <p className="rounded-lg bg-plane px-3 py-4 text-center text-sm text-ink-muted">
        Add a product first and it can be featured here.
      </p>
    );
  }

  const visible = search
    ? products.filter((product) =>
        product.name.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  return (
    <div className="rounded-lg bg-plane p-1.5">
      <div className="relative mb-1.5">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products"
          className="h-8 w-full rounded-md bg-surface pl-8 pr-2 text-[13px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      <ul className="max-h-64 overflow-y-auto">
        {visible.length === 0 ? (
          <li className="px-2 py-3 text-center text-xs text-ink-muted">
            No matches.
          </li>
        ) : (
          visible.map((product) => {
            const checked = selected.includes(product.id);
            const rank = selected.indexOf(product.id);

            return (
              <li key={product.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
                    checked
                      ? "bg-brand-soft text-brand"
                      : "text-ink-secondary hover:bg-surface hover:text-ink",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange(
                        checked
                          ? selected.filter((id) => id !== product.id)
                          : [...selected, product.id],
                      )
                    }
                    className="size-3.5 rounded border-line-strong accent-brand"
                  />
                  <MediaThumb
                    url={product.image}
                    className="size-7 shrink-0 rounded ring-1 ring-inset ring-line"
                  />
                  <span className="truncate">{product.name}</span>
                  {checked && (
                    <span className="ml-auto shrink-0 text-xs tabular-nums">
                      #{rank + 1}
                    </span>
                  )}
                </label>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
