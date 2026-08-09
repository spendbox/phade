"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * "That worked."
 *
 * A button that fires a server action or drops something in a bag has to say
 * so at the moment it is pressed, or a shopper presses it again — and on a
 * phone, where the thing that changed is often off screen, pressing again is
 * the reasonable response to silence.
 *
 * So the button becomes its own confirmation for a second: a tick, then back
 * to what it was. It says it in the place the finger already is, which is the
 * one place nobody has to go looking.
 *
 * Returns whether it is currently confirming, and the function that starts it.
 * The timer is replaced rather than stacked, so a shopper adding three of
 * something in a row gets three ticks and not a queue of them.
 */
export function useConfirmed(
  ms = 1200,
): [confirming: boolean, confirm: () => void] {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return [
    confirming,
    () => {
      if (timer.current) clearTimeout(timer.current);
      setConfirming(true);
      timer.current = setTimeout(() => setConfirming(false), ms);
    },
  ];
}

/**
 * One icon turning into another.
 *
 * Both are drawn, stacked, and cross-faded through a quarter-turn — so the
 * plus doesn't vanish and a tick appear in its place, it *becomes* the tick
 * and comes back. A swap is an event a shopper has to notice; a movement is
 * one they feel.
 *
 * The box is sized rather than the glyphs, so the button never resizes as the
 * two trade places.
 */
export function Morph({
  confirming,
  children,
  className = "size-4",
}: {
  confirming: boolean;
  /** What it is the rest of the time. */
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("relative grid shrink-0 place-items-center", className)}>
      <span
        className={cn(
          "col-start-1 row-start-1 flex items-center justify-center transition-all duration-300 ease-out",
          confirming
            ? "scale-50 rotate-90 opacity-0"
            : "scale-100 rotate-0 opacity-100",
        )}
      >
        {children}
      </span>

      <span
        className={cn(
          "col-start-1 row-start-1 flex items-center justify-center transition-all duration-300 ease-out",
          confirming
            ? "scale-100 rotate-0 opacity-100"
            : "scale-50 -rotate-90 opacity-0",
        )}
      >
        <Check className={className} strokeWidth={3} aria-hidden />
      </span>
    </span>
  );
}
