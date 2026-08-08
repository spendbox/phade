"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * A list you can type your way into.
 *
 * Nigeria has thirty-seven states and a native `<select>` makes a shopper on a
 * phone spin a wheel through all of them to reach Rivers. Typing three letters
 * is faster than scrolling however good the wheel is, so this is a text box
 * that filters a list — the pattern every address form on the internet uses,
 * and the one a thumb expects.
 *
 * It is still a real form field: the chosen value rides in a hidden input, so
 * the form submits whether or not any of this JavaScript ran the way it should
 * have, and the server sees exactly the same string it always did.
 */
export function SearchSelect({
  name,
  options,
  value,
  onChange,
  placeholder = "Search",
  emptyLabel = "No matches",
  required = false,
  id,
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  required?: boolean;
  id?: string;
}) {
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  // Clicking anywhere else is a way of saying "not that one".
  useEffect(() => {
    if (!open) return;

    const onDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? options.filter((option) => option.toLowerCase().includes(needle))
    : options;

  function choose(option: string) {
    onChange(option);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => {
        const next = current + step;
        if (next < 0) return matches.length - 1;
        return next % Math.max(matches.length, 1);
      });
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      const picked = matches[active];
      if (picked) choose(picked);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={box} className="relative">
      <input type="hidden" name={name} value={value} required={required} />

      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={open ? query : value}
          placeholder={value ? value : placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setActive(0);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-12 w-full rounded-2xl bg-canvas-deep pl-4 pr-10 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
        />

        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
          {open ? (
            <Search className="size-4" aria-hidden />
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
        </span>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-2xl bg-canvas p-1 shadow-xl ring-1 ring-line"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-ink-muted">{emptyLabel}</li>
          ) : (
            matches.map((option, index) => {
              const chosen = option === value;
              return (
                <li key={option}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={chosen}
                    // Pointer down rather than click: the input's blur would
                    // otherwise close the list out from under the press.
                    onPointerDown={(event) => {
                      event.preventDefault();
                      choose(option);
                    }}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition",
                      index === active
                        ? "bg-canvas-deep text-ink"
                        : "text-ink-secondary",
                    )}
                  >
                    {option}
                    {chosen && (
                      <Check className="size-4 shrink-0 text-brand" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
