"use client";

import { useActionState, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import {
  saveStorefront,
  type StorefrontFormState,
} from "@/app/admin/(dashboard)/settings/actions";
import { ImageUploader } from "@/components/admin/image-uploader";
import { MediaThumb } from "@/components/admin/media-thumb";
import { PathPicker, type PagePath } from "@/components/admin/path-picker";
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
import {
  CONTACT_HREF,
  DEFAULT_MENU,
  DEFAULT_SECTIONS,
  type MenuLink,
  type SectionCopy,
  type StorefrontContent,
} from "@/lib/storefront";

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
  pages,
}: {
  content: StorefrontContent;
  products: FeaturedOption[];
  /** Everywhere a button could point, by name. See `getLinkablePages`. */
  pages: PagePath[];
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
  const [heroHref, setHeroHref] = useState(content.heroCtaHref);
  const [aboutHref, setAboutHref] = useState(content.about.ctaHref);
  const [socials, setSocials] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      content.socials.map((link) => [link.platform, link.url]),
    ),
  );
  const [menu, setMenu] = useState<MenuLink[]>(content.menu);
  const [whatsappOn, setWhatsappOn] = useState(content.support.whatsappEnabled);
  /** Whether the menu's reset button is waiting to be pressed a second time. */
  const [resetting, setResetting] = useState(false);

  function moveLink(index: number, by: -1 | 1) {
    const to = index + by;
    if (to < 0 || to >= menu.length) return;
    const next = [...menu];
    [next[index], next[to]] = [next[to], next[index]];
    setMenu(next);
  }

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

      <input type="hidden" name="menu" value={JSON.stringify(menu)} />

      <Panel
        title="Menu"
        action={
          <div className="flex items-center gap-3">
            {/* Asks once: restoring the shipped menu discards whatever is in
                the panel, which is not something to do on a mis-tap. */}
            <button
              type="button"
              onClick={() => {
                if (!resetting) {
                  setResetting(true);
                  return;
                }
                setMenu(DEFAULT_MENU.map((link) => ({ ...link })));
                setResetting(false);
              }}
              onBlur={() => setResetting(false)}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                resetting ? "text-critical" : "text-ink-secondary hover:text-ink",
              )}
            >
              <RotateCcw className="size-3.5" />
              {resetting ? "Replace the menu?" : "Reset to default"}
            </button>

            <button
              type="button"
              onClick={() => setMenu([...menu, { label: "", href: "/shop" }])}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark"
            >
              <Plus className="size-3.5" />
              Add a line
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            Where everything is — laid out across the header on a desktop, and
            behind the ☰ on a phone, in this order. Clear the list entirely and
            the menu goes away.
          </p>

          {menu.length === 0 ? (
            <p className="rounded-lg bg-plane px-3 py-5 text-center text-sm text-ink-muted">
              No menu. Add a line — Home, Categories, Contact us.
            </p>
          ) : (
            <ul className="space-y-2">
              {menu.map((link, index) => (
                <li
                  key={index}
                  className="grid gap-2 rounded-xl bg-plane p-2.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-center"
                >
                  <Input
                    value={link.label}
                    aria-label={`Menu line ${index + 1} — what it says`}
                    onChange={(event) =>
                      setMenu(
                        menu.map((item, at) =>
                          at === index
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="What it says"
                  />

                  {link.href === CONTACT_HREF ? (
                    <p className="flex h-10 items-center gap-2 rounded-lg bg-surface px-3 text-[13px] text-ink-secondary ring-1 ring-inset ring-line">
                      <MessageCircle className="size-3.5 shrink-0 text-brand" />
                      Opens the message pop-up
                      <button
                        type="button"
                        onClick={() =>
                          setMenu(
                            menu.map((item, at) =>
                              at === index ? { ...item, href: "/shop" } : item,
                            ),
                          )
                        }
                        className="ml-auto shrink-0 text-xs font-medium underline underline-offset-4 hover:text-ink"
                      >
                        Point at a page
                      </button>
                    </p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <PathPicker
                          name={`menu_href_${index}`}
                          value={link.href}
                          onChange={(next) =>
                            setMenu(
                              menu.map((item, at) =>
                                at === index ? { ...item, href: next } : item,
                              ),
                            )
                          }
                          pages={pages}
                        />
                      </div>
                      <button
                        type="button"
                        title="Open the message pop-up instead"
                        aria-label="Open the message pop-up instead"
                        onClick={() =>
                          setMenu(
                            menu.map((item, at) =>
                              at === index
                                ? { ...item, href: CONTACT_HREF }
                                : item,
                            ),
                          )
                        }
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface hover:text-brand"
                      >
                        <MessageCircle className="size-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveLink(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface hover:text-ink disabled:opacity-30"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(index, 1)}
                      disabled={index === menu.length - 1}
                      aria-label="Move down"
                      className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface hover:text-ink disabled:opacity-30"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMenu(menu.filter((_, at) => at !== index))
                      }
                      aria-label="Remove this line"
                      className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-critical-soft hover:text-critical"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel title="The shop page">
        <Field
          label="Line under &ldquo;Everything&rdquo;"
          htmlFor="shop_note"
          hint="Shown beside the piece count at the head of /shop, where nothing is filtered. A category brings its own description; this is the one view that had only a number. Leave it blank for just the count."
        >
          <Input
            id="shop_note"
            name="shop_note"
            defaultValue={content.shopNote}
            placeholder="Every piece we have, in one place"
          />
        </Field>
      </Panel>

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

            <Field label="Button goes to" htmlFor="hero_cta_href">
              <PathPicker
                id="hero_cta_href"
                name="hero_cta_href"
                pages={pages}
                value={heroHref}
                onChange={setHeroHref}
              />
            </Field>
          </div>

          <Field
            label="Images and clips"
            hint="The first is the main hero. Add more and they run as a set. Each one is framed for a desktop and for a phone separately, and can be shown on only one of them — the editor opens as it lands, and the crop button reopens it."
          >
            <ImageUploader
              name="hero_images"
              initial={content.heroImages}
              hero
            />
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


      <Panel title="Collections">
        <SectionFields
          name="collections"
          copy={content.sections.collections}
          fallback={DEFAULT_SECTIONS.collections}
          pages={pages}
          where="The rail of collections under the hero."
          cta={false}
        />
      </Panel>

      <Panel title="Featured">
        <div className="space-y-5">
          <SectionFields
            name="featured"
            copy={content.sections.featured}
            fallback={DEFAULT_SECTIONS.featured}
            pages={pages}
            where="The deck of cards a shopper swipes through."
          />

          <Field
            label="Products"
            hint={
              featured.length === 0
                ? "None chosen — the section stays hidden."
                : `${featured.length} chosen. They appear in the order you pick them. Only each one's first picture is shown, because the swipe moves between pieces.`
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

      <Panel title="New in">
        <SectionFields
          name="newIn"
          copy={content.sections.newIn}
          fallback={DEFAULT_SECTIONS.newIn}
          pages={pages}
          where="The wall of what arrived most recently."
        />
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

            <Field label="Button goes to" htmlFor="about_cta_href">
              <PathPicker
                id="about_cta_href"
                name="about_cta_href"
                pages={pages}
                value={aboutHref}
                onChange={setAboutHref}
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

      <Panel title="Best sellers">
        <SectionFields
          name="bestSellers"
          copy={content.sections.bestSellers}
          fallback={DEFAULT_SECTIONS.bestSellers}
          pages={pages}
          where="The rail of what everyone else is buying."
        />
      </Panel>

      <Panel title="The last block">
        <SectionFields
          name="closing"
          copy={content.sections.closing}
          fallback={DEFAULT_SECTIONS.closing}
          pages={pages}
          where="The way into the shop, at the foot of the page. The heading is the small line above; the sentence below it is the large one."
          noteLabel="The big line"
          noteHint="Left empty it counts everything in stock for itself, and stays right as pieces sell. Write your own and it stays written."
          notePlaceholder="142 pieces, waiting to be found"
        />
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

      <Panel title="Here to help">
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            What happens when someone presses &ldquo;Here to help&rdquo; at the
            foot of the page, or Contact us in the menu.
          </p>

          <Field
            label="Where messages go"
            htmlFor="support_email"
            hint="Every message sent from the shop front arrives here."
          >
            <Input
              id="support_email"
              name="support_email"
              type="email"
              defaultValue={content.support.email}
              placeholder="phadewoman@gmail.com"
            />
          </Field>

          <Field label="What the pop-up says" htmlFor="support_note">
            <Textarea
              id="support_note"
              name="support_note"
              rows={2}
              defaultValue={content.support.note}
              placeholder="Ask us about sizing, an order, or anything else."
            />
          </Field>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="whatsapp_enabled"
              checked={whatsappOn}
              onChange={(event) => setWhatsappOn(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-brand"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Offer WhatsApp too
              </span>
              <span className="block text-xs text-ink-muted">
                A second button that opens a chat with the number below.
              </span>
            </span>
          </label>

          {whatsappOn && (
            <Field
              label="WhatsApp number"
              htmlFor="whatsapp_number"
              hint="In full international form — 2348012345678, not 0801…"
            >
              <Input
                id="whatsapp_number"
                name="whatsapp_number"
                inputMode="tel"
                defaultValue={content.support.whatsappNumber}
                placeholder="2348012345678"
              />
            </Field>
          )}
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

/**
 * One section's words: what it is called, the line under it, and the button
 * out of it.
 *
 * The same four fields for every section, in the same order, so the form reads
 * down the front page rather than asking someone to hold a map of it in their
 * head. A heading cleared to nothing comes back as the placeholder; a subtext
 * cleared to nothing stays gone, because "no subtext" is a real choice.
 */
function SectionFields({
  name,
  copy,
  fallback,
  where,
  pages,
  cta = true,
  noteLabel = "Subtext",
  noteHint = "The line under the heading. Leave it empty for no line at all.",
  notePlaceholder,
}: {
  name: string;
  copy: SectionCopy;
  fallback: SectionCopy;
  /** Where on the page this section shows up, in a few words. */
  where: string;
  pages: PagePath[];
  cta?: boolean;
  noteLabel?: string;
  noteHint?: string;
  /** What the shop sees in place of a blank subtext, if it isn't nothing. */
  notePlaceholder?: string;
}) {
  // Held rather than left to the DOM so that "put it back" is a button: a
  // shop that writes over an automatic line should be able to change its mind
  // without guessing what the line used to say.
  const [note, setNote] = useState(copy.note);
  const [href, setHref] = useState(copy.ctaHref);

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-muted">{where}</p>

      <Field label="Heading" htmlFor={`${name}_heading`}>
        <Input
          id={`${name}_heading`}
          name={`${name}_heading`}
          defaultValue={copy.heading}
          placeholder={fallback.heading}
        />
      </Field>

      <Field
        label={noteLabel}
        htmlFor={`${name}_note`}
        hint={noteHint}
        action={
          note.trim() ? (
            <button
              type="button"
              onClick={() => setNote("")}
              className="text-xs font-medium text-ink-secondary hover:text-ink"
            >
              {notePlaceholder ? "Use the default" : "Clear"}
            </button>
          ) : undefined
        }
      >
        <Textarea
          id={`${name}_note`}
          name={`${name}_note`}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={notePlaceholder ?? fallback.note ?? "Optional"}
        />
      </Field>

      {cta && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Button text"
            htmlFor={`${name}_cta_label`}
            hint="Leave blank to hide the button."
          >
            <Input
              id={`${name}_cta_label`}
              name={`${name}_cta_label`}
              defaultValue={copy.ctaLabel}
              placeholder={fallback.ctaLabel}
            />
          </Field>

          <Field label="Button goes to" htmlFor={`${name}_cta_href`}>
            <PathPicker
              id={`${name}_cta_href`}
              name={`${name}_cta_href`}
              pages={pages}
              value={href}
              onChange={setHref}
            />
          </Field>
        </div>
      )}
    </div>
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
