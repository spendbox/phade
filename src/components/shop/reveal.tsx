"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * A section arriving as you reach it.
 *
 * The front page is read as a scroll, and a magazine page that is simply
 * *there* the whole way down reads as one long block. Each section lifting
 * into place as it comes up gives the page a rhythm and, more usefully, tells
 * a reader that there is another thing below the one they are looking at.
 *
 * An IntersectionObserver rather than a scroll handler, so nothing runs on the
 * main thread between sections; and rather than `animation-timeline`, which
 * only Chromium has. It reveals once — a section that faded out again on the
 * way back up would make the back button feel broken.
 *
 * Anything already on screen at first paint is revealed without animating, so
 * the top of the page never flashes in.
 */
export function Reveal({
  children,
  className,
  /** Nudges a section's start, so a row of them doesn't move as one block. */
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [shown, setShown] = useState(false);

  /**
   * Set up as the node is attached rather than in an effect: by the time an
   * effect runs the browser has already painted, and a section that was on
   * screen from the start would flash from hidden to shown.
   */
  const watch = (node: HTMLDivElement | null) => {
    if (!node || shown) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShown(true);
        observer.disconnect();
      },
      // A little before it arrives, so the movement finishes about when the
      // section is properly in view rather than starting there.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);
  };

  return (
    <div
      ref={watch}
      style={shown && delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        // `translate`, not `transform`: Tailwind v4 moves things with the
        // standalone property, so a transition naming `transform` animates the
        // fade and lets the movement snap.
        "transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
