/**
 * Product media.
 *
 * Images and videos live in the same `images` array on the product row and are
 * told apart by file extension, so adding video didn't need a schema change.
 */

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogv"];

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = url.split("#")[0].split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((extension) => path.endsWith(extension));
}

/**
 * The still to show for a product whose cover is a clip.
 *
 * A `<video>` with nothing to hold on paints black until it has downloaded
 * enough to decode a frame — so a shop that leads with video gets a grid of
 * black rectangles, which reads as broken rather than as film. The next
 * photograph in the same product is the honest stand-in: it is the same piece,
 * shot by the same person, on the same day.
 */
export function posterFor(media: string[]): string | null {
  return media.find((url) => !isVideoUrl(url)) ?? null;
}

/**
 * Asks the browser for one frame.
 *
 * A media fragment of `#t=0.1` tells it to seek a tenth of a second in, which
 * every browser will do off `preload="metadata"` — a few kilobytes rather than
 * the whole clip — and paint what it finds. It is the difference between a
 * black box and a picture for a product with no photograph to fall back on.
 */
export function firstFrame(url: string): string {
  return url.includes("#") ? url : `${url}#t=0.1`;
}

// ---------------------------------------------------------------------------
// Where a picture is framed
// ---------------------------------------------------------------------------

/**
 * Which part of a picture to keep when a box crops it.
 *
 * Every surface in the shop crops: a square tile, a 3:4 card, a hero. A studio
 * shot of a dress with the model's head near the top loses the head to a
 * centred crop, and the shop owner is the only person who knows which part of
 * their own photograph matters. So they choose, once, when they upload it.
 *
 * The choice rides along in the URL's fragment — `…/dress.webp#pos=top`.
 * A fragment is never sent to a server, so the file still resolves exactly as
 * it did before, every URL already stored keeps working untouched, and no
 * column had to change shape to hold nine words.
 */
export const FOCUS_POSITIONS = {
  "top-left": "0% 0%",
  top: "50% 0%",
  "top-right": "100% 0%",
  left: "0% 50%",
  center: "50% 50%",
  right: "100% 50%",
  "bottom-left": "0% 100%",
  bottom: "50% 100%",
  "bottom-right": "100% 100%",
} as const;

export type Focus = keyof typeof FOCUS_POSITIONS;

export const FOCUS_KEYS = Object.keys(FOCUS_POSITIONS) as Focus[];

const FOCUS_MARK = "#pos=";

function isFocus(value: string): value is Focus {
  return value in FOCUS_POSITIONS;
}

/** Splits a stored URL into the file and how it should be framed. */
export function readFocus(url: string): { src: string; focus: Focus } {
  const at = url.indexOf(FOCUS_MARK);
  if (at === -1) return { src: url, focus: "center" };

  const wanted = url.slice(at + FOCUS_MARK.length);
  return {
    src: url.slice(0, at),
    focus: isFocus(wanted) ? wanted : "center",
  };
}

/** Stores a framing choice on a URL. Centre is the default, so it stores none. */
export function withFocus(url: string, focus: Focus): string {
  const { src } = readFocus(url);
  return focus === "center" ? src : `${src}${FOCUS_MARK}${focus}`;
}

/** The CSS for a framing choice. */
export function objectPosition(focus: Focus): string {
  return FOCUS_POSITIONS[focus];
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
