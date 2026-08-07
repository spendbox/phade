import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import { isVideoUrl } from "@/lib/media";

/**
 * Renders a piece of product media. Videos get a real <video> element so the
 * admin can scrub what they uploaded rather than guessing from a filename.
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

  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        className={cn("bg-ink object-cover", className)}
        muted
        playsInline
        preload="metadata"
        controls={controls}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      loading="lazy"
      className={cn("object-cover", className)}
    />
  );
}
