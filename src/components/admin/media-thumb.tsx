import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  firstFrame,
  isVideoUrl,
  objectPosition,
  readFocus,
} from "@/lib/media";

/**
 * Renders a piece of product media. Videos get a real <video> element so the
 * admin can scrub what they uploaded rather than guessing from a filename.
 *
 * It crops the way the shop does, framing included, so the thumbnail beside a
 * product is the picture a shopper will actually see.
 */
export function MediaThumb({
  url,
  className,
  controls = false,
}: {
  url?: string | null;
  className?: string;
  controls?: boolean;
}) {
  if (!url) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex items-center justify-center bg-plane text-ink-muted ring-1 ring-inset ring-line",
          className,
        )}
      >
        <ImageIcon className="size-4" />
      </span>
    );
  }

  const { src, focus } = readFocus(url);
  const framing = { objectPosition: objectPosition(focus) };

  if (isVideoUrl(src)) {
    return (
      <video
        // A frame to look at rather than a black rectangle: see `firstFrame`.
        src={firstFrame(src)}
        preload="metadata"
        style={framing}
        className={cn("bg-plane object-cover", className)}
        muted
        playsInline
        controls={controls}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      style={framing}
      className={cn("object-cover", className)}
    />
  );
}
