"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/cn";

const MAX_EDGE = 1600;
const QUALITY = 0.86;

/**
 * Resizes and re-encodes in the browser before upload. Keeps the request well
 * inside the serverless body limit and means the admin can drop a 6MB phone
 * photo straight in without thinking about it.
 */
async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/avif") return file; // already small; re-encoding loses

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return file;
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

export function ImageUploader({
  name = "images",
  initial = [],
}: {
  name?: string;
  initial?: string[];
}) {
  const [images, setImages] = useState<string[]>(initial);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (files: FileList | File[]) => {
    const list = [...files].filter((file) => file.type.startsWith("image/"));
    if (list.length === 0) return;

    setError(null);
    setUploading((count) => count + list.length);

    await Promise.all(
      list.map(async (file) => {
        try {
          const prepared = await compress(file);
          const body = new FormData();
          body.append("file", prepared);

          const response = await fetch("/api/admin/upload", {
            method: "POST",
            body,
          });
          const result = (await response.json()) as {
            url?: string;
            error?: string;
          };

          if (!response.ok || !result.url) {
            throw new Error(result.error ?? "Upload failed.");
          }
          setImages((current) => [...current, result.url!]);
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "That image didn't upload.",
          );
        } finally {
          setUploading((count) => count - 1);
        }
      }),
    );
  }, []);

  function remove(url: string) {
    setImages((current) => current.filter((item) => item !== url));
  }

  function makeCover(url: string) {
    setImages((current) => [url, ...current.filter((item) => item !== url)]);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(images)} />

      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {images.map((url, index) => (
            <li
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg bg-plane ring-1 ring-inset ring-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />

              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              )}

              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => makeCover(url)}
                    title="Make cover image"
                    aria-label="Make cover image"
                    className="flex size-7 items-center justify-center rounded-md bg-surface/95 text-ink-secondary shadow-sm hover:text-ink"
                  >
                    <Star className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(url)}
                  title="Remove image"
                  aria-label="Remove image"
                  className="flex size-7 items-center justify-center rounded-md bg-surface/95 text-critical shadow-sm"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          dragging
            ? "border-series bg-series-soft/40"
            : "border-line-strong bg-plane/60",
        )}
      >
        {uploading > 0 ? (
          <Loader2 className="size-5 animate-spin text-ink-muted" />
        ) : (
          <ImagePlus className="size-5 text-ink-muted" />
        )}

        <p className="mt-2 text-sm text-ink-secondary">
          {uploading > 0
            ? `Uploading ${uploading} image${uploading === 1 ? "" : "s"}…`
            : "Drop images here"}
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1 text-sm font-medium text-series hover:underline"
        >
          or choose files
        </button>

        <p className="mt-1 text-xs text-ink-muted">
          Resized automatically — the first image is the cover.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void upload(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
