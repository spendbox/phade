"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";

import { MediaThumb } from "@/components/admin/media-thumb";
import { cn } from "@/lib/cn";
import { ACCEPTED_MEDIA_TYPES } from "@/lib/media";
import { uploadMedia } from "@/lib/upload-client";

/**
 * Media gallery for a single product. Images are downscaled in the browser and
 * everything goes straight to Supabase Storage through a signed URL, so a large
 * video isn't limited by the serverless request body size.
 */
export function ImageUploader({
  name = "images",
  initial = [],
  onChange,
}: {
  name?: string;
  initial?: string[];
  /** For callers that own the value rather than reading the hidden input. */
  onChange?: (media: string[]) => void;
}) {
  const [media, setMedia] = useState<string[]>(initial);

  // Reported from an effect rather than inside the state updater: uploads land
  // concurrently, so the updater has to stay a pure function of the previous
  // value and can't be the place a callback fires.
  const report = useRef(onChange);
  useEffect(() => {
    report.current = onChange;
  }, [onChange]);
  useEffect(() => {
    report.current?.(media);
  }, [media]);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (files: FileList | File[]) => {
    const list = [...files].filter((file) =>
      ACCEPTED_MEDIA_TYPES.includes(file.type),
    );
    if (list.length === 0) return;

    setError(null);
    setUploading((count) => count + list.length);

    await Promise.all(
      list.map(async (file) => {
        try {
          const url = await uploadMedia(file);
          setMedia((current) => [...current, url]);
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "That file didn't upload.",
          );
        } finally {
          setUploading((count) => count - 1);
        }
      }),
    );
  }, []);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(media)} />

      {media.length > 0 && (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {media.map((url, index) => (
            <li
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg bg-plane ring-1 ring-inset ring-line"
            >
              <MediaThumb url={url} className="size-full" />

              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              )}

              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setMedia((current) => [
                        url,
                        ...current.filter((item) => item !== url),
                      ])
                    }
                    title="Make cover"
                    aria-label="Make cover"
                    className="flex size-7 items-center justify-center rounded-md bg-surface/95 text-ink-secondary shadow-sm hover:text-ink"
                  >
                    <Star className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setMedia((current) => current.filter((item) => item !== url))
                  }
                  title="Remove"
                  aria-label="Remove"
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
            ? "border-brand bg-brand-soft/50"
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
            ? `Uploading ${uploading} file${uploading === 1 ? "" : "s"}…`
            : "Drop photos or videos here"}
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1 text-sm font-medium text-brand hover:underline"
        >
          or choose files
        </button>

        <p className="mt-1 text-xs text-ink-muted">
          Images are resized automatically — the first one is the cover.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MEDIA_TYPES.join(",")}
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
