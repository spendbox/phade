/**
 * Product media.
 *
 * Images and videos live in the same `images` array on the product row and are
 * told apart by file extension, so adding video didn't need a schema change.
 */

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogv"];

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = url.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((extension) => path.endsWith(extension));
}

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export const ACCEPTED_MEDIA_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_VIDEO_TYPES,
];

/** Matches Supabase Storage's default per-file ceiling. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function extensionFor(contentType: string, filename: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;

  const fromType = contentType.split("/")[1]?.toLowerCase();
  if (!fromType) return "bin";
  if (fromType === "jpeg") return "jpg";
  if (fromType === "quicktime") return "mov";
  return fromType;
}
