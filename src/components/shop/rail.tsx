"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  arrows = false,
  className,
  shellClassName,
  children,
  ...rest
}: {
  /** The scrolling element itself. A list of things deserves to be a list. */
  as?: "div" | "ul";
  /** Which surface the rail sits on, so the fade dissolves into it. */
  tone?: "canvas" | "deep";
  /** Adds nudge buttons for a pointer, on rails big enough to want them. */
  arrows?: boolean;
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

  /** Moves the rail by most of a screenful, landing on a snap point. */
  function nudge(by: 1 | -1) {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({ left: by * element.clientWidth * 0.8, behavior: "smooth" });
  }

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

      {/* Only where there is a pointer, and only towards an edge with
          something behind it: a thumb already knows what to do here, and a
          button it can't hover over would just cover a picture. */}
      {arrows && (edges.start || edges.end) && (
        <>
          {edges.start && (
            <Nudge side="left" onClick={() => nudge(-1)} />
          )}
          {edges.end && <Nudge side="right" onClick={() => nudge(1)} />}
        </>
      )}
    </div>
  );
}

function Nudge({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Scroll back" : "Scroll on"}
      className={cn(
        "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-canvas/90 text-noir shadow-md ring-1 ring-noir/10 backdrop-blur transition hover:bg-canvas [@media(hover:hover)]:flex",
        side === "left" ? "left-2" : "right-2",
      )}
    >
      {side === "left" ? (
        <ChevronLeft className="size-5" aria-hidden />
      ) : (
        <ChevronRight className="size-5" aria-hidden />
      )}
    </button>
  );
}
