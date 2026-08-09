"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";

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

/** The tick itself, popping in wherever a label used to be. */
export function Confirmed({ className }: { className?: string }) {
  return <Check className={`pop-in ${className ?? "size-4"}`} aria-hidden />;
}
