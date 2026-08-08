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

/** What may be stored, and so what the upload endpoint will sign for. */
export const ACCEPTED_MEDIA_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_VIDEO_TYPES,
];

/**
 * HEIC — what an iPhone actually takes photographs in.
 *
 * It is missing from the list above on purpose: half the browsers in the world
 * can't display one, so a HEIC that reached the storefront would be a broken
 * picture for the shopper rather than a photograph. It is converted in the
 * browser before it is uploaded (see `@/lib/upload-client`), and what lands in
 * storage is a WebP like everything else.
 *
 * The extensions matter as much as the types: asked for a `.heic`, Chrome on
 * Windows hands over a file whose `type` is the empty string.
 */
export const HEIC_TYPES = ["image/heic", "image/heif", "image/heic-sequence"];
const HEIC_EXTENSIONS = [".heic", ".heif"];

export function isHeicFile(file: { name: string; type: string }): boolean {
  if (HEIC_TYPES.includes(file.type.toLowerCase())) return true;
  const name = file.name.toLowerCase();
  return HEIC_EXTENSIONS.some((extension) => name.endsWith(extension));
}

/** What a file picker will let someone choose — storable, or convertible. */
export const PICKABLE_MEDIA_TYPES = [
  ...ACCEPTED_MEDIA_TYPES,
  ...HEIC_TYPES,
  ...HEIC_EXTENSIONS,
];

/** The picker's filter, which a `type` of "" must still be able to pass. */
export function isPickableMedia(file: { name: string; type: string }): boolean {
  return ACCEPTED_MEDIA_TYPES.includes(file.type) || isHeicFile(file);
}

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
