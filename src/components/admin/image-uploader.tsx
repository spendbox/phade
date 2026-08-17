"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Crop, ImagePlus, Scissors, Star, Trash2 } from "lucide-react";

import { HeroEditor } from "@/components/admin/hero-editor";
import { MediaThumb } from "@/components/admin/media-thumb";
import { UploadProgress } from "@/components/admin/upload-progress";
import { VideoEditor } from "@/components/admin/video-editor";
import { cn } from "@/lib/cn";
import {
  FOCUS_KEYS,
  isPickableMedia,
  isVideoUrl,
  PICKABLE_MEDIA_TYPES,
  readFocus,
  readHints,
  withFocus,
} from "@/lib/media";
import { uploadMedia } from "@/lib/upload-client";

/**
 * Media gallery for a single product. Images are downscaled in the browser and
 * everything goes straight to Supabase Storage through a signed URL, so a large
 * video isn't limited by the serverless request body size.
 */
export function ImageUploader({
  name = "images",
  initial = [],
  limit,
  hint = "Images are resized automatically, iPhone HEIC photos converted — the first one is the cover.",
  onChange,
  hero = false,
}: {
  name?: string;
  initial?: string[];
  /** How many files this field holds. One, for a single picture or clip. */
  limit?: number;
  hint?: string;
  /** For callers that own the value rather than reading the hidden input. */
  onChange?: (media: string[]) => void;
  /**
   * Hero media, which is a different problem: the same file has to fill a wide
   * band and a tall column. Each upload opens the framing editor straight
   * away, because a hero nobody framed is a hero cropped by accident.
   */
  hero?: boolean;
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
  /**
   * What is going up, and how far it has got.
   *
   * Keyed by a per-file id rather than by name, because dropping the same
   * photograph twice is a thing people do and two entries under one key would
   * be one bar moving twice.
   */
  const [going, setGoing] = useState<{ id: number; name: string; at: number }[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  /** The picture whose framing grid is open, if any. */
  const [framing, setFraming] = useState<string | null>(null);
  /** The clip open in the trim-and-placeholder editor, if any. */
  const [editing, setEditing] = useState<string | null>(null);
  /** The hero frame open in the desktop/mobile framing editor, if any. */
  const [framingHero, setFramingHero] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const room = limit ? Math.max(limit - media.length, 0) : Infinity;
  const full = room === 0;

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = [...files].filter(isPickableMedia).slice(0, room);
      if (list.length === 0) return;

      setError(null);
      const started = Date.now();

      setGoing((current) => [
        ...current,
        ...list.map((file, index) => ({
          id: started + index,
          name: file.name,
          at: 0,
        })),
      ]);

      await Promise.all(
        list.map(async (file, index) => {
          const id = started + index;
          try {
            const url = await uploadMedia(file, (at) =>
              setGoing((current) =>
                current.map((item) => (item.id === id ? { ...item, at } : item)),
              ),
            );
            setMedia((current) => [...current, url]);
            // Asked at the moment it lands, while the shop is still looking at
            // it — not left as a button somebody has to know to press.
            if (hero) setFramingHero(url);
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "That file didn't upload.",
            );
          } finally {
            setGoing((current) => current.filter((item) => item.id !== id));
          }
        }),
      );
    },
    [room, hero],
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(media)} />

      {media.length > 0 && (
        <ul
          className={cn(
            "grid gap-2.5",
            limit === 1 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3 sm:grid-cols-4",
          )}
        >
          {media.map((url, index) => (
            <li
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg bg-plane ring-1 ring-inset ring-line"
            >
              <MediaThumb url={url} className="size-full" />

              {index === 0 && limit !== 1 && !hero && (
                <span className="absolute left-1.5 top-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              )}

              {/* A frame that only shows on one screen says so on the tile —
                  otherwise a shop wonders why the hero it uploaded isn't
                  there when it looks on its phone. */}
              {hero && readHints(url).screens && (
                <span className="absolute left-1.5 top-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium capitalize text-white">
                  {readHints(url).screens} only
                </span>
              )}

              {framing === url && !hero && (
                <FramePicker
                  url={url}
                  onChoose={(next) =>
                    setMedia((current) =>
                      current.map((item) => (item === url ? next : item)),
                    )
                  }
                  onClose={() => setFraming(null)}
                />
              )}

              {/* Always there on a touchscreen, which has no hover and so no
                  way to summon a button that only appears on one. A pointer
                  that can hover still gets them out of the way of the
                  picture. */}
              <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-end gap-1 transition-opacity focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                {/* What you do *to* this file sits left; what you do to its
                    place in the list sits right. A hero clip has both. */}
                <span className="mr-auto flex gap-1">
                  {isVideoUrl(url) && (
                    <button
                      type="button"
                      onClick={() => setEditing(url)}
                      title="Trim and placeholder"
                      aria-label="Trim this clip and choose its placeholder"
                      className="flex size-7 items-center justify-center rounded-md bg-surface/95 text-ink-secondary shadow-sm hover:text-ink"
                    >
                      <Scissors className="size-3.5" />
                    </button>
                  )}

                  {/* A hero is framed twice — once for each shape of screen —
                      so it gets the full editor rather than the nine-cell grid
                      that sits over a product thumbnail. */}
                  {hero ? (
                    <button
                      type="button"
                      onClick={() => setFramingHero(url)}
                      title="Framing"
                      aria-label="Choose how this is framed and where it appears"
                      className="flex size-7 items-center justify-center rounded-md bg-surface/95 text-ink-secondary shadow-sm hover:text-ink"
                    >
                      <Crop className="size-3.5" />
                    </button>
                  ) : (
                    !isVideoUrl(url) && (
                      <button
                        type="button"
                        onClick={() =>
                          setFraming((current) => (current === url ? null : url))
                        }
                        title="Framing"
                        aria-label="Choose how this picture is framed"
                        aria-pressed={framing === url}
                        className="flex size-7 items-center justify-center rounded-md bg-surface/95 text-ink-secondary shadow-sm hover:text-ink"
                      >
                        <Crop className="size-3.5" />
                      </button>
                    )
                  )}
                </span>

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

      {/* A field that holds one file has nowhere to put a second, so the
          dropzone goes away rather than failing silently on the next drop. */}
      {!full && (
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
        <ImagePlus className="size-5 text-ink-muted" />

        <p className="mt-2 text-sm text-ink-secondary">
          {limit === 1
            ? "Drop a photo or a video here"
            : "Drop photos or videos here"}
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1 text-sm font-medium text-brand hover:underline"
        >
          {limit === 1 ? "or choose a file" : "or choose files"}
        </button>

        <p className="mt-1 text-xs text-ink-muted">{hint}</p>

        <input
          ref={inputRef}
          type="file"
          accept={PICKABLE_MEDIA_TYPES.join(",")}
          multiple={limit !== 1}
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void upload(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      )}

      <UploadProgress going={going} />

      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}

      {framingHero && (
        <HeroEditor
          url={framingHero}
          open
          onClose={() => setFramingHero(null)}
          onSave={(next) =>
            setMedia((current) =>
              current.map((item) => (item === framingHero ? next : item)),
            )
          }
        />
      )}

      {editing && (
        <VideoEditor
          url={editing}
          open
          onClose={() => setEditing(null)}
          onSave={(next) =>
            setMedia((current) =>
              current.map((item) => (item === editing ? next : item)),
            )
          }
        />
      )}
    </div>
  );
}

/**
 * Choosing which part of a photograph survives the crop.
 *
 * The picker is the picture: a three-by-three grid over the thumbnail itself,
 * and pressing a cell moves the framing there at once, under your finger. A
 * dropdown of the words "top left" would make someone hold a mental model of a
 * crop they can't see; this is the crop.
 */
function FramePicker({
  url,
  onChoose,
  onClose,
}: {
  url: string;
  onChoose: (next: string) => void;
  onClose: () => void;
}) {
  const { focus } = readFocus(url);

  return (
    <div className="absolute inset-0 z-10 bg-ink/45">
      <div className="grid size-full grid-cols-3 grid-rows-3">
        {FOCUS_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={key.replace("-", " ")}
            aria-pressed={key === focus}
            onClick={() => onChoose(withFocus(url, key))}
            className={cn(
              "flex items-center justify-center border border-white/25 transition",
              key === focus ? "bg-white/85" : "hover:bg-white/30",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                key === focus ? "bg-ink" : "bg-white/70",
              )}
            />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Done framing"
        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-md bg-surface/95 text-ink-secondary shadow-sm hover:text-ink"
      >
        <Check className="size-3.5" />
      </button>
    </div>
  );
}
