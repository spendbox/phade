"use client";

import { useEffect, useRef } from "react";

/**
 * A clip in the shop.
 *
 * The `autoplay` attribute is a request the browser answers once, when the
 * element is created, and only if it likes the look of it — a video that
 * mounts inside a pop-up, or one that becomes the frame in view after a swipe,
 * is routinely left sitting on its poster. So playback is driven from here
 * instead: whichever frame is in view is told to play, every other one is told
 * to stop, and the browser is asked again each time that changes.
 *
 * It is muted, always — a shop that makes a noise at someone scrolling in
 * public is a shop they close. Muted is also what buys the right to play at
 * all: it is the one case every browser allows without a tap.
 *
 * Nothing here touches the file. It streams at whatever it was uploaded at,
 * full resolution, and the poster is only what is held on to before the first
 * frame is decodable.
 */
export function VideoFrame({
  src,
  poster,
  playing,
  className,
  style,
  label,
}: {
  src: string;
  poster?: string;
  /** True while this is the frame someone is actually looking at. */
  playing: boolean;
  className?: string;
  style?: React.CSSProperties;
  label: string;
}) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (!element) return;

    if (!playing) {
      element.pause();
      return;
    }

    // Muted before the ask, in case the attribute hasn't been reflected yet:
    // an unmuted play() is rejected outright and the clip never starts.
    element.muted = true;
    // Rejected plays are ordinary — a tab in the background, a phone on Low
    // Power Mode. The poster stays up and nothing is broken.
    void element.play().catch(() => {});
  }, [playing, src]);

  return (
    <video
      ref={video}
      src={src}
      poster={poster}
      style={style}
      className={className}
      muted
      loop
      playsInline
      // A clip in view is going to be watched, so let it buffer; one waiting
      // its turn costs a shopper on mobile data nothing until it is swiped to.
      preload={playing ? "auto" : "metadata"}
      aria-label={label}
    />
  );
}
