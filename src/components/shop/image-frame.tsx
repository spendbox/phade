"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * A photograph, and the wait for it.
 *
 * Everything below the fold is loaded lazily — which is right, and which means
 * a shopper scrolling a wall of dresses on mobile data spends real seconds
 * looking at whatever is behind the picture. A flat grey rectangle in that
 * moment reads as broken. A grey rectangle with light moving across it reads
 * as coming, and the picture fades over it when it lands.
 *
 * The shimmer lives underneath rather than instead of the image, so there is
 * no swap and nothing jumps. It stops the moment the image decodes.
 *
 * The `complete` check in the ref is not belt-and-braces: an image already in
 * the browser's cache is decoded before React attaches anything, its `load`
 * event has been and gone, and without this it would sit shimmering under a
 * picture that is already there.
 */
export function ImageFrame({
  src,
  alt,
  sizes,
  priority = false,
  optimised,
  style,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Whether this host is one `next/image` has been told it may serve. */
  optimised: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  // Something the page needs immediately is never behind a placeholder: the
  // hero would flash grey on every visit for no gain.
  const [loaded, setLoaded] = useState(priority);

  const settle = (node: HTMLImageElement | null) => {
    if (node?.complete) setLoaded(true);
  };

  const shared = {
    sizes,
    onLoad: () => setLoaded(true),
    // A picture that will never arrive should not shimmer forever; the empty
    // frame underneath is the honest end state.
    onError: () => setLoaded(true),
    style,
    ref: settle,
  } as const;

  return (
    <span
      className={cn(
        "relative block overflow-hidden",
        !loaded && "shimmer",
        className,
      )}
    >
      {optimised ? (
        <Image
          {...shared}
          src={src}
          alt={alt}
          fill
          priority={priority}
          className={cn(
            "framed transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...shared}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className={cn(
            "framed absolute inset-0 size-full transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </span>
  );
}
