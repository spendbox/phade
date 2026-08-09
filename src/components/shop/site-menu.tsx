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
 * The menu behind the hamburger.
 *
 * The header carries search, saved and the bag — the things a shopper reaches
 * for mid-thought — and nothing else, because a row of category links up there
 * competes with the rail of them pinned under it. But a shop still needs a way
 * to say where everything is, and "where is your contact page" is a question
 * people ask of the top-left corner. So: one button, and a panel.
 *
 * What is in it comes from Settings → Storefront, since a shop knows its own
 * rooms. One line is special — "Contact us" has no page behind it, so it opens
 * the message pop-up instead of navigating, and the panel closes underneath.
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

  // A shop that cleared every line meant to. No lines, no button. Read
  // defensively because this arrives through a cache that can outlive the
  // shape it was written in — and a menu is not worth a broken shop.
  if (!links || links.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        aria-expanded={open}
        className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-canvas-deep active:scale-90"
      >
        <Menu className="size-5" aria-hidden />
      </button>

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
                    onClick={() => {
                      setOpen(false);
                      setHelping(true);
                    }}
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
                      // Matched whole. "Categories" (/shop) and "New in"
                      // (/shop?sort=new) are different places, and comparing
                      // only the path would light both of them at once.
                      pathname === link.href ? "text-brand" : "text-ink",
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
