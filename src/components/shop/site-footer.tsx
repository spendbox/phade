import Link from "next/link";
import { Mail, ShieldCheck, Truck } from "lucide-react";

import {
  SOCIAL_PLATFORMS,
  SocialIcon,
} from "@/components/shop/social-icons";
import { LOGO_MARK } from "@/lib/brand";
import { formatNairaShort } from "@/lib/format";
import type { ShopCategory } from "@/lib/shop";
import { cheapestFee, type ShippingSettings } from "@/lib/shipping";
import type { StorefrontContent } from "@/lib/storefront";

/**
 * The end of the page. Three promises, the categories again for anyone who
 * scrolled all the way down without finding what they came for, and wherever
 * else the shop can be found. The extra bottom padding clears the tab bar on a
 * phone.
 *
 * The delivery line is worked out from the shipping rules rather than written
 * by hand, so it can't promise something checkout won't honour.
 */
export function SiteFooter({
  categories,
  content,
  shipping,
}: {
  categories: ShopCategory[];
  content: Pick<StorefrontContent, "footerBlurb" | "socials">;
  shipping: ShippingSettings;
}) {
  const from = cheapestFee(shipping);
  const zones = shipping.zones.length;

  const delivery =
    shipping.freeOverKobo > 0
      ? `Free over ${formatNairaShort(shipping.freeOverKobo)}. ${
          zones > 0
            ? `From ${formatNairaShort(from)}, by destination.`
            : `${formatNairaShort(from)} otherwise.`
        }`
      : zones > 0
        ? `From ${formatNairaShort(from)}, by destination.`
        : `${formatNairaShort(from)} anywhere in Nigeria.`;

  return (
    <footer className="mt-16 border-t border-line bg-canvas-deep/60">
      <div className="mx-auto max-w-7xl px-4 py-12 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-12">
        <ul className="grid gap-4 sm:grid-cols-3">
          <Assurance
            icon={<Truck className="size-4" aria-hidden />}
            title="Delivered nationwide"
            body={delivery}
          />
          <Assurance
            icon={<ShieldCheck className="size-4" aria-hidden />}
            title="Paid securely"
            body="Card, transfer and USSD through Paystack. We never see your card."
          />
          <Assurance
            icon={<Mail className="size-4" aria-hidden />}
            title="Here to help"
            body="Questions about sizing or an order? Message us and we'll answer."
          />
        </ul>

        <div className="mt-12 grid gap-8 border-t border-line pt-10 sm:grid-cols-[1fr_auto]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_MARK} alt="phadewoman" className="h-10 w-auto" />

            {content.footerBlurb && (
              <p className="mt-4 max-w-xs text-sm text-ink-secondary">
                {content.footerBlurb}
              </p>
            )}

            {content.socials.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {content.socials.map((link) => (
                  <li key={link.platform}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={SOCIAL_PLATFORMS[link.platform].label}
                      className="flex size-10 items-center justify-center rounded-full bg-canvas text-ink transition hover:bg-noir hover:text-white"
                    >
                      <SocialIcon platform={link.platform} className="size-5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <nav aria-label="More of the shop" className="text-sm">
            <h2 className="font-semibold text-ink">Shop</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <FooterLink href="/shop">Everything</FooterLink>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <FooterLink href={`/shop?category=${category.slug}`}>
                    {category.name}
                  </FooterLink>
                </li>
              ))}
              <li>
                <FooterLink href="/saved">Saved</FooterLink>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-10 text-xs text-ink-muted">
          © {new Date().getFullYear()} phadewoman
        </p>
      </div>
    </footer>
  );
}

function Assurance({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-2xl bg-canvas p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand">
          {icon}
        </span>
        {title}
      </p>
      <p className="mt-2 text-sm text-ink-secondary">{body}</p>
    </li>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-ink-secondary transition-colors hover:text-brand"
    >
      {children}
    </Link>
  );
}
