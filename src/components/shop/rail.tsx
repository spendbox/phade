"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * A row you flick sideways, with an edge that only fades when there is
 * something past it.
 *
 * The fade used to be a gradient painted inside the scrolling element itself.
 * An absolutely-positioned child of a scroll container is placed against its
 * *content*, not its viewport, so that gradient sat on top of the last chip and
 * travelled with it — the final filter looked permanently washed out, and the
 * one thing the fade existed to say ("there is more this way") was the one
 * thing it never said.
 *
 * So the fades live on a wrapper that does not scroll, and the wrapper is told
 * where the rail currently sits. Scrolled away from the start, the left edge
 * fades; with room still to the right, the right edge does. Reach the end and
 * the last item is simply the last item, at full strength.
 */
export function Rail({
  as = "div",
  tone = "canvas",
  className,
  shellClassName,
  children,
  ...rest
}: {
  /** The scrolling element itself. A list of things deserves to be a list. */
  as?: "div" | "ul";
  /** Which surface the rail sits on, so the fade dissolves into it. */
  tone?: "canvas" | "deep";
  /** Classes for the scrolling element: gaps and the padding inside it. */
  className?: string;
  /** Classes for the wrapper: margins, background, rounding. */
  shellClassName?: string;
  children: React.ReactNode;
} & Pick<
  React.HTMLAttributes<HTMLElement>,
  "role" | "aria-label" | "aria-labelledby"
>) {
  const rail = useRef<HTMLElement | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  // A callback ref rather than a plain one: the scrolling element is a `div`
  // or a `ul` depending on what is being railed, and one ref object cannot be
  // typed as both.
  const holdRail = useCallback((node: HTMLElement | null) => {
    rail.current = node;
  }, []);

  const measure = useCallback(() => {
    const element = rail.current;
    if (!element) return;

    // A pixel of slack: sub-pixel widths mean scrollLeft rarely lands exactly
    // on the end, and a fade that never quite switches off is the old bug.
    const room = element.scrollWidth - element.clientWidth;
    const start = element.scrollLeft > 1;
    const end = room > 1 && element.scrollLeft < room - 1;

    setEdges((previous) =>
      previous.start === start && previous.end === end
        ? previous
        : { start, end },
    );
  }, []);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;

    measure();
    element.addEventListener("scroll", measure, { passive: true });

    // The rail can stop overflowing without ever being scrolled — a rotated
    // phone, a font that finally loaded, a filter row that lost a chip.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);

    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure, children]);

  const railClassName = cn("rail", className);

  return (
    <div
      className={cn("rail-shell", tone === "deep" && "rail-shell-deep", shellClassName)}
      data-from-start={edges.start ? "true" : undefined}
      data-more={edges.end ? "true" : undefined}
    >
      {as === "ul" ? (
        <ul ref={holdRail} className={railClassName} {...rest}>
          {children}
        </ul>
      ) : (
        <div ref={holdRail} className={railClassName} {...rest}>
          {children}
        </div>
      )}
    </div>
  );
}
