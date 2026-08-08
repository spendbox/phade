"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, LayoutTemplate, Palette, Store, Tags, Truck } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Settings is now more than one page, so it carries its own menu. Sections the
 * shop owner touches day to day come first; anything that needs a developer
 * sits behind its own entry rather than cluttering the top of the page.
 */

const SECTIONS = [
  {
    href: "/admin/settings",
    label: "General",
    hint: "Store preferences",
    icon: Store,
    exact: true,
  },
  {
    href: "/admin/settings/categories",
    label: "Categories",
    hint: "Categories & subcategories",
    icon: Tags,
  },
  {
    href: "/admin/settings/catalogue",
    label: "Catalogue",
    hint: "Colours & sizes",
    icon: Palette,
  },
  {
    href: "/admin/settings/storefront",
    label: "Storefront",
    hint: "Hero, banner & featured",
    icon: LayoutTemplate,
  },
  {
    href: "/admin/settings/shipping",
    label: "Shipping",
    hint: "Delivery zones & pickup",
    icon: Truck,
  },
  {
    href: "/admin/settings/developers",
    label: "Developers",
    hint: "Integrations & webhooks",
    icon: Code2,
  },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="card flex gap-1 overflow-x-auto p-1.5 lg:sticky lg:top-5 lg:flex-col lg:overflow-visible"
    >
      {SECTIONS.map((section) => {
        const active =
          "exact" in section && section.exact
            ? pathname === section.href
            : pathname === section.href ||
              pathname.startsWith(`${section.href}/`);

        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors lg:shrink",
              active
                ? "bg-brand-soft text-brand"
                : "text-ink-secondary hover:bg-plane hover:text-ink",
            )}
          >
            <section.icon className="size-[18px] shrink-0" />
            <span className="min-w-0">
              <span className="block font-medium">{section.label}</span>
              <span
                className={cn(
                  "hidden text-xs lg:block",
                  active ? "text-brand/70" : "text-ink-muted",
                )}
              >
                {section.hint}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
