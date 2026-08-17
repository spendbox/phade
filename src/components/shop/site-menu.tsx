"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, MessageCircle, X } from "lucide-react";

import { HelpSheet } from "@/components/shop/help-sheet";
import { Sheet } from "@/components/shop/sheet";
import { cn } from "@/lib/cn";
import {
  CONTACT_HREF,
  type MenuLink,
  type SupportDetails,
} from "@/lib/storefront";

/**
 * Where everything is.
 *
 * On a phone it is a hamburger and a sheet, because there is no room for a row
 * of words beside a wordmark and three icons. On a wider screen there is room,
 * so the same lines simply sit in the header — a hamburger on a desktop hides
 * five words behind a click for no reason anyone could name.
 *
 * What is in it comes from Settings → Storefront, since a shop knows its own
 * rooms. One line is special: "Contact us" has no page behind it, so it opens
 * the message pop-up instead of navigating.
 */
export function SiteMenu({
  links,
  support,
}: {
  links: MenuLink[];
  support: SupportDetails;
}) {
  const [open, setOpen] = useState(false);
  const [helping, setHelping] = useState(false);
  const pathname = usePathname();

  // A shop that cleared every line meant to. No lines, no menu. Read
  // defensively because this arrives through a cache that can outlive the
  // shape it was written in — and a menu is not worth a broken shop.
  if (!links || links.length === 0) return null;

  // Matched whole. "Shop" (/shop) and a "New in" (/shop?sort=new) somebody
  // adds are different places, and comparing only the path lights both.
  const here = (link: MenuLink) => pathname === link.href;

  const contact = () => {
    setOpen(false);
    setHelping(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        aria-expanded={open}
        className="order-1 -ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-canvas-deep active:scale-90 lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {/* The same lines, laid out, once there is width to lay them out in —
          and centred on the bar rather than pushed up against the wordmark.
          Absolutely, because centring it in the flow would mean the wordmark
          on one side and the icons on the other had to be exactly the same
          width, which they never are. `pointer-events-none` on the track so
          the empty half of it doesn't sit over anything, with the links
          taking their own presses back. */}
      <nav
        aria-label="Menu"
        className="pointer-events-none absolute inset-x-0 hidden justify-center lg:flex"
      >
        <div className="pointer-events-auto flex min-w-0 items-center gap-1">
        {links.map((link, index) =>
          link.href === CONTACT_HREF ? (
            <button
              key={`${link.href}-${index}`}
              type="button"
              onClick={contact}
              className="max-w-40 truncate rounded-full px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-canvas-deep"
            >
              {link.label}
            </button>
          ) : (
            <Link
              key={`${link.href}-${index}`}
              href={link.href}
              className={cn(
                "max-w-40 truncate rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-canvas-deep",
                here(link) ? "text-brand" : "text-ink",
              )}
            >
              {link.label}
            </Link>
          ),
        )}
        </div>
      </nav>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        label="Menu"
        side="center"
        className="max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl bg-canvas sm:max-w-sm sm:rounded-3xl"
      >
        <div className="p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-5 sm:pb-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Menu
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-1 flex size-9 items-center justify-center rounded-full text-ink-secondary transition hover:bg-canvas-deep active:scale-90"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <ul className="stagger mt-2">
            {links.map((link, index) =>
              link.href === CONTACT_HREF ? (
                <li key={`${link.href}-${index}`}>
                  <button
                    type="button"
                    onClick={contact}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left text-[15px] font-medium text-ink transition hover:bg-canvas-deep active:scale-[0.99]"
                  >
                    {link.label}
                    <MessageCircle
                      className="ml-auto size-4 text-ink-muted"
                      aria-hidden
                    />
                  </button>
                </li>
              ) : (
                <li key={`${link.href}-${index}`}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center rounded-2xl px-3 py-3.5 text-[15px] font-medium transition hover:bg-canvas-deep active:scale-[0.99]",
                      here(link) ? "text-brand" : "text-ink",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      </Sheet>

      <HelpSheet
        open={helping}
        onClose={() => setHelping(false)}
        support={support}
      />
    </>
  );
}
