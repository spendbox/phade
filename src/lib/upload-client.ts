import {
  ACCEPTED_IMAGE_TYPES,
  isHeicFile,
  MAX_UPLOAD_BYTES,
} from "@/lib/media";

/**
 * Browser-side media upload.
 *
 * Images are resized and re-encoded first — a 6MB phone photo becomes a few
 * hundred KB, which makes the gallery quick to load. Videos go up untouched.
 * Both then PUT straight to Supabase Storage using a signed URL, bypassing the
 * serverless request body limit.
 *
 * HEIC gets converted here rather than rejected. It is what an iPhone takes
 * pictures in, so telling a shop owner to go and export their photographs
 * first is telling them to do the computer's job. Safari can decode one on its
 * own; every other browser needs a decoder, which is downloaded only for the
 * shop that actually uploads a HEIC and never by anyone else.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.86;

/** Re-encodes a decoded picture at a sane size. Null if the canvas refuses. */
async function encodeWebp(
  bitmap: ImageBitmap,
  filename: string,
): Promise<File | null> {
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return null;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY),
  );
  if (!blob) return null;

  return new File([blob], filename.replace(/\.\w+$/, "") + ".webp", {
    type: "image/webp",
  });
}

/**
 * A HEIC photograph, as a WebP.
 *
 * Safari decodes HEIC natively, so it is asked first and the decoder is never
 * fetched on the device most likely to be holding these files. Everywhere else
 * falls back to a WebAssembly decoder, imported at the moment of need.
 */
async function convertHeic(file: File): Promise<File> {
  const native = await createImageBitmap(file).catch(() => null);
  if (native) {
    const converted = await encodeWebp(native, file.name);
    if (converted) return converted;
  }

  try {
    const { heicTo } = await import("heic-to/next");
    const blob = await heicTo({
      blob: file,
      type: "image/webp",
      quality: QUALITY,
    });
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", {
      type: "image/webp",
    });
  } catch {
    throw new Error(
      `${file.name} couldn't be read. Save it as a JPEG and try again.`,
    );
  }
}

async function prepareImage(file: File): Promise<File> {
  if (isHeicFile(file)) return convertHeic(file);

  // AVIF is already efficient, and re-encoding it usually costs quality.
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type === "image/avif") {
    return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const encoded = await encodeWebp(bitmap, file.name);
  // A photo that got bigger on the way through keeps its original form.
  return encoded && encoded.size < file.size ? encoded : file;
}

/** Uploads one file and resolves to its public URL. Throws on failure. */
export async function uploadMedia(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${file.name} is larger than 50MB.`);
  }

  const prepared =
    file.type.startsWith("image/") || isHeicFile(file)
      ? await prepareImage(file)
      : file;

  const ticket = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: prepared.name,
      contentType: prepared.type,
      size: prepared.size,
    }),
  });

  const issued = (await ticket.json()) as {
    uploadUrl?: string;
    publicUrl?: string;
    error?: string;
  };

  if (!ticket.ok || !issued.uploadUrl || !issued.publicUrl) {
    throw new Error(issued.error ?? "Could not start the upload.");
  }

  const put = await fetch(issued.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": prepared.type },
    body: prepared,
  });

  if (!put.ok) {
    throw new Error(`Upload failed for ${file.name}.`);
  }

  return issued.publicUrl;
}
