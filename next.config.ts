import type { NextConfig } from "next";

/**
 * Product media lives in a Supabase Storage bucket whose host is whichever
 * project this deployment points at, so the image optimiser is pointed at that
 * host rather than a literal.
 *
 * The uploader caps what it stores at 1600px, which is the right size for a
 * product page and roughly eight times the size of a card in a grid. Listing
 * the host here is what lets `next/image` serve each surface the width it
 * actually renders at, in AVIF or WebP, instead of sending the same 1600px
 * original to a phone forty times over.
 */
function storageHost(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
}

const host = storageHost();

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // A year: an object's URL changes when its content does, because uploads
    // are written under a fresh name rather than overwritten.
    minimumCacheTTL: 31_536_000,
    remotePatterns: host
      ? [
          {
            protocol: "https",
            hostname: host,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
