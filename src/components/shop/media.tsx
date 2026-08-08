import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import { isVideoUrl } from "@/lib/media";

/**
 * One frame of product media.
 *
 * Products carry photos and clips in the same list, told apart by extension,
 * so every surface that shows media has to handle both — this is that in one
 * place. Clips play the way they do in a feed: muted, looping, inline, never
 * asking permission and never making a sound.
 *
 * These are plain `<img>` tags rather than `next/image`. The media lives in a
 * Supabase bucket whose URL is set per deployment, which the image optimiser
 * would need listed in `next.config.ts` at build time — so optimising it here
 * would mean a shop that breaks whenever the project it points at changes.
 */
export function Media({
  url,
  alt,
  className,
  sizes,
  priority = false,
  autoPlay = false,
}: {
  url: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  autoPlay?: boolean;
}) {
  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-canvas-deep text-ink-muted",
          className,
        )}
      >
        <ImageIcon className="size-6" aria-hidden />
      </div>
    );
  }

  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        className={cn("object-cover", className)}
        muted
        loop
        playsInline
        autoPlay={autoPlay}
        preload={autoPlay ? "auto" : "metadata"}
        aria-label={alt}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("object-cover", className)}
    />
  );
}
