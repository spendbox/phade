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
import { Field, Input, Textarea } from "@/components/ui/field";
import { Panel } from "@/components/ui/stat-tile";
import { cn } from "@/lib/cn";
import type { StorefrontContent } from "@/lib/storefront";

const initialState: StorefrontFormState = { ok: null };

export type FeaturedOption = {
  id: string;
  name: string;
  image: string | null;
};

/**
 * Everything a shopper reads on the front page, in the order they meet it:
 * the announcement strip, the hero, then what's featured underneath.
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

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="featured_product_ids"
        value={featured.join(",")}
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
              placeholder="Free delivery in Lagos on orders over ₦100,000"
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
              placeholder="Pieces made for Lagos heat and Lagos evenings."
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

      <Panel title="Featured products">
        <div className="space-y-4">
          <Field label="Section heading" htmlFor="featured_heading">
            <Input
              id="featured_heading"
              name="featured_heading"
              defaultValue={content.featuredHeading}
              placeholder="Featured"
            />
          </Field>

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
