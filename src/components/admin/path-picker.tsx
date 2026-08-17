"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Link2, Search } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Where a button goes, chosen from the shop's own pages.
 *
 * It used to be a text box, which asked a shop owner to know that a category
 * lives at `/shop?category=abayas` and to type it without a typo — and a typo
 * there is a button that goes nowhere, discovered by a customer rather than by
 * the person who made it. Every page the shop has is in this list, by name.
 *
 * Somewhere else entirely is still allowed: a full https:// address typed in
 * is kept as it was. The list is a shortcut, not a fence.
 */

export type PagePath = {
  /** What it is called in the dashboard — "Abayas", "Silk slip dress". */
  label: string;
  /** What goes in the link — "/shop?category=abayas". */
  value: string;
  /** Which heading it sits under in the list. */
  group: string;
};

export function PathPicker({
  name,
  value,
  onChange,
  pages,
  placeholder = "Choose a page",
  id,
}: {
  name: string;
  value: string;
  onChange: (next: string) => void;
  pages: PagePath[];
  placeholder?: string;
  id?: string;
}) {
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);

  const list = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /** Where to paint the list, in page coordinates. See below. */
  const [at, setAt] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  /**
   * The list is painted at the body, not under the button.
   *
   * Every settings panel is a rounded card that clips its contents, which is
   * right for a card and fatal for a dropdown: opened on the last row of a
   * panel, the options were cut off at the panel's edge and there was no way
   * to reach them. A portal escapes the clip; the position has to be measured
   * and carried across by hand, which is the price of that.
   */
  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const rect = box.current?.getBoundingClientRect();
      if (!rect) return;
      setAt({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };

    place();
    // Anchored to the button, so it has to follow it. Capture, because the
    // scroll that moves it is often a panel's own rather than the page's.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (box.current?.contains(target) || list.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? pages.filter(
        (page) =>
          page.label.toLowerCase().includes(needle) ||
          page.value.toLowerCase().includes(needle),
      )
    : pages;

  const chosen = pages.find((page) => page.value === value);
  /** A link typed rather than picked — somewhere off this site, usually. */
  const custom = value && !chosen;

  return (
    <div ref={box} className="relative">
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        id={id}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 rounded-lg bg-plane px-3 text-left text-sm text-ink ring-1 ring-inset ring-line transition hover:ring-line-strong focus:outline-none focus:ring-2 focus:ring-brand"
      >
        <Link2 className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {chosen ? (
            <>
              {chosen.label}
              <span className="ml-1.5 text-ink-muted">{chosen.value}</span>
            </>
          ) : custom ? (
            value
          ) : (
            <span className="text-ink-muted">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
      </button>

      {open &&
        at &&
        typeof document !== "undefined" &&
        createPortal(
        <div
          ref={list}
          style={{ top: at.top, left: at.left, width: at.width }}
          className="absolute z-[90] rounded-lg bg-surface p-1.5 shadow-xl ring-1 ring-line">
          <div className="relative mb-1.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages, or paste a link"
              className="h-8 w-full rounded-md bg-plane pl-8 pr-2 text-[13px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto">
            {/* Anything that looks like an address is offered as itself, so a
                link to somewhere off this site is one press rather than a
                different kind of field. */}
            {needle && /^(\/|https?:\/\/)/.test(query.trim()) && (
              <Option
                label="Use this address"
                value={query.trim()}
                chosen={value === query.trim()}
                onChoose={(next) => {
                  onChange(next);
                  setOpen(false);
                }}
              />
            )}

            {matches.length === 0 && !needle.startsWith("/") ? (
              <li className="px-2 py-3 text-center text-xs text-ink-muted">
                No page by that name. Paste a link to use one anyway.
              </li>
            ) : (
              groupOf(matches).map(([group, entries]) => (
                <li key={group}>
                  <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    {group}
                  </p>
                  <ul>
                    {entries.map((page) => (
                      <Option
                        key={page.value}
                        label={page.label}
                        value={page.value}
                        chosen={page.value === value}
                        onChoose={(next) => {
                          onChange(next);
                          setOpen(false);
                        }}
                      />
                    ))}
                  </ul>
                </li>
              ))
            )}
          </ul>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-ink-secondary hover:bg-plane hover:text-ink"
            >
              Clear — no link
            </button>
          )}
        </div>,
          document.body,
        )}
    </div>
  );
}

function Option({
  label,
  value,
  chosen,
  onChoose,
}: {
  label: string;
  value: string;
  chosen: boolean;
  onChoose: (value: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={chosen}
        onClick={() => onChoose(value)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition",
          chosen ? "bg-brand-soft text-brand" : "text-ink-secondary hover:bg-plane hover:text-ink",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="shrink-0 truncate text-xs text-ink-muted">{value}</span>
        {chosen && <Check className="size-3.5 shrink-0" aria-hidden />}
      </button>
    </li>
  );
}

/** Keeps the list in the order it arrived, grouped by where things live. */
function groupOf(pages: PagePath[]): [string, PagePath[]][] {
  const groups = new Map<string, PagePath[]>();
  for (const page of pages) {
    const list = groups.get(page.group);
    if (list) list.push(page);
    else groups.set(page.group, [page]);
  }
  return [...groups.entries()];
}
