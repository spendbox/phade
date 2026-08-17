"use client";

import { useEffect, useState } from "react";
import { ChevronsLeft } from "lucide-react";

/**
 * The one-time lesson that a product pop-up walks sideways.
 *
 * Swiping across moves to the next piece in the row this one was tapped out
 * of — which is the fastest way to shop the whole rail and is invisible until
 * someone happens to try it. A line of help text would be read once and
 * ignored, so the gesture is performed instead: a chevron drifts the way a
 * thumb should go, and then the cue removes itself.
 *
 * It shows a few times and never again. A tutorial that keeps appearing after
 * it has been learnt is no longer a tutorial, it is a thing in the way of the
 * dress — so it sits over the very top of the pop-up, takes no clicks, and
 * fades out on its own rather than waiting to be dismissed.
 */

const SEEN_KEY = "phade.swipe-cue";
/** How many pop-ups it teaches before assuming the lesson landed. */
const TIMES = 3;

export function SwipeCue() {
  // Read as the component mounts rather than in an effect: the pop-up only
  // exists once someone has opened one, so there is no server render of this
  // to disagree with.
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    // A cursor cannot swipe, and already has the arrows on either side of the
    // pop-up. Teaching it a thumb gesture would be teaching it nothing.
    if (window.matchMedia?.("(hover: hover)").matches) return false;
    try {
      return Number(window.localStorage.getItem(SEEN_KEY) ?? "0") < TIMES;
    } catch {
      // Private mode, storage disabled. Not worth a broken pop-up.
      return false;
    }
  });

  useEffect(() => {
    if (!show) return;
    try {
      const seen = Number(window.localStorage.getItem(SEEN_KEY) ?? "0");
      window.localStorage.setItem(SEEN_KEY, String(seen + 1));
    } catch {
      // Nothing to remember it with; it will simply show again next time.
    }
  }, [show]);

  if (!show) return null;

  return (
    <div
      aria-hidden
      // The chevron's own loop reports iterations, not ends, so the only
      // animationend that reaches here is the cue finishing.
      onAnimationEnd={(event) => {
        if (event.currentTarget === event.target) setShow(false);
      }}
      className="swipe-cue pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center pt-5"
    >
      <span className="flex items-center gap-1.5 rounded-full bg-noir/60 py-1.5 pl-2.5 pr-3 text-[11px] font-medium text-white shadow-sm backdrop-blur">
        <ChevronsLeft className="swipe-cue-glyph size-3.5" />
        Swipe for the next piece
      </span>
    </div>
  );
}
