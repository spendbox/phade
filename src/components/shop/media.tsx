import { ImageIcon } from "lucide-react";

import { ImageFrame } from "@/components/shop/image-frame";
import { VideoFrame } from "@/components/shop/video-frame";
import { cn } from "@/lib/cn";
import {
  firstFrame,
  isVideoUrl,
  objectPosition,
  readHints,
} from "@/lib/media";

/**
 * One frame of product media.
 *
 * Products carry photos and clips in the same list, told apart by extension,
 * so every surface that shows media has to handle both — this is that in one
 * place. Clips play the way they do in a feed: muted, looping, inline, never
 * asking permission and never making a sound.
 *
 * Photos from the shop's own bucket go through `next/image`, which is the
 * single biggest thing standing between a grid of forty products and a phone
 * on Nigerian mobile data. The uploader stores at 1600px; a card renders at
 * about 180. Without this, every card downloads the full thing, and the shop
 * feels slow for reasons no amount of clever rendering can fix.
 *
 * Everything below the fold loads lazily, and shimmers while it does — see
 * `ImageFrame`.
 *
 * Anything else — an SVG, a brand asset, a URL from somewhere we haven't
 * listed in `next.config.ts` — falls back to a plain `<img>`. The optimiser
 * refuses hosts it wasn't told about, and a broken picture is worse than an
 * unoptimised one.
 *
 * A stored URL may carry how the shop wants it framed (`#pos=top`), which is
 * read off here and never passed on to the network — see `@/lib/media`.
 */

const STORAGE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

/** SVGs are excluded: the optimiser won't touch them without loosening its CSP. */
function isOptimisable(url: string): boolean {
  if (!STORAGE_HOST) return false;
  if (url.split("?")[0].toLowerCase().endsWith(".svg")) return false;
  try {
    return new URL(url).hostname === STORAGE_HOST;
  } catch {
    return false;
  }
}

export function Media({
  url,
  alt,
  className,
  sizes = "100vw",
  priority = false,
  autoPlay = false,
  poster,
  fit = "cover",
}: {
  url: string | null | undefined;
  alt: string;
  /** Sizes and effects for the box. The picture inside always covers it. */
  className?: string;
  sizes?: string;
  priority?: boolean;
  /**
   * Whether a clip should be playing — true for the frame someone is actually
   * looking at. It is driven, not merely requested: see `VideoFrame`.
   */
  autoPlay?: boolean;
  /**
   * The still to hold on before a clip plays. The first frame of a video is
   * rarely the frame anyone would have chosen, so the shop can choose one.
   */
  poster?: string | null;
  /**
   * `cover` fills the box and crops; `contain` shows the whole picture and
   * leaves room around it. The hero uses `contain` so that one photograph
   * looks the same on a phone as on a laptop, instead of being cropped two
   * different ways by two different shapes of screen.
   */
  fit?: "cover" | "contain";
}) {
  if (!url) {
    return (
      <span
        className={cn(
          "flex items-center justify-center bg-canvas-deep text-ink-muted",
          className,
        )}
      >
        <ImageIcon className="size-6" aria-hidden />
      </span>
    );
  }

  const hints = readHints(url);
  const { src, focus } = hints;
  // The shop's own poster wins over anything a caller guessed at.
  const still = hints.poster ?? poster ?? null;
  const framing = {
    objectPosition: objectPosition(focus),
    objectFit: fit,
  } as const;

  if (isVideoUrl(src)) {
    return (
      <VideoFrame
        // Trimmed clips carry their range as a media fragment, which the
        // browser honours by itself. Untrimmed ones with no still to hold on
        // are asked for the frame a tenth of a second in, so a clip is a
        // picture rather than a black box while it loads.
        src={
          hints.trim
            ? `${src}#t=${hints.trim.start},${hints.trim.end}`
            : still
              ? src
              : firstFrame(src)
        }
        poster={still ?? undefined}
        playing={autoPlay}
        style={framing}
        className={cn("bg-canvas-deep", className)}
        label={alt}
      />
    );
  }

  // `fill` needs a positioned box, so the frame brings its own rather than
  // asking every caller to remember one.
  return (
    <ImageFrame
      src={src}
      alt={alt}
      sizes={sizes}
      priority={priority}
      optimised={isOptimisable(src)}
      style={framing}
      className={className}
    />
  );
}
