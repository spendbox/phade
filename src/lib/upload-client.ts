import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/media";

/**
 * Browser-side media upload.
 *
 * Images are resized and re-encoded first — a 6MB phone photo becomes a few
 * hundred KB, which makes the gallery quick to load. Videos go up untouched.
 * Both then PUT straight to Supabase Storage using a signed URL, bypassing the
 * serverless request body limit.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.86;

async function compressImage(file: File): Promise<File> {
  // AVIF is already efficient, and re-encoding it usually costs quality.
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type === "image/avif") {
    return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY),
  );
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.\w+$/, ".webp"), {
    type: "image/webp",
  });
}

/** Uploads one file and resolves to its public URL. Throws on failure. */
export async function uploadMedia(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${file.name} is larger than 50MB.`);
  }

  const prepared = file.type.startsWith("image/")
    ? await compressImage(file)
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
