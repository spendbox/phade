"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Play, Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { readHints, withHints } from "@/lib/media";
import { uploadMedia } from "@/lib/upload-client";

/**
 * Trimming a clip, and choosing the frame it rests on.
 *
 * Neither of these re-encodes anything. The trim is stored as a media fragment
 * (`#t=1.4,8.2`) — the standard way to name a range of a video, which browsers
 * play by themselves — so a shop can cut the wobbly first second off a clip
 * instantly, from a phone, on Nigerian mobile data, and change its mind later
 * with nothing lost. The file in storage is never touched.
 *
 * The placeholder is a real still: scrub to the frame worth showing, press the
 * button, and that frame is drawn to a canvas, encoded as a WebP and uploaded
 * like any other picture. It becomes the video's poster everywhere the shop
 * shows it.
 */
export function VideoEditor({
  url,
  open,
  onSave,
  onClose,
}: {
  url: string;
  open: boolean;
  onSave: (next: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const hints = readHints(url);

  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(hints.trim?.start ?? 0);
  const [end, setEnd] = useState(hints.trim?.end ?? 0);
  const [at, setAt] = useState(hints.trim?.start ?? 0);
  const [poster, setPoster] = useState(hints.poster);
  const [grabbing, setGrabbing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Everything is measured against the whole clip, so the editor loads the
  // file itself rather than whatever range is currently stored on it.
  const source = hints.src;

  function onLoaded() {
    const element = video.current;
    if (!element || !Number.isFinite(element.duration)) return;

    setDuration(element.duration);
    if (end <= 0 || end > element.duration) setEnd(element.duration);
    element.currentTime = start;
  }

  function seek(to: number) {
    const element = video.current;
    if (!element) return;
    const clamped = Math.min(Math.max(to, 0), duration || 0);
    element.currentTime = clamped;
    setAt(clamped);
  }

  function playRange() {
    const element = video.current;
    if (!element) return;
    element.currentTime = start;
    void element.play();
  }

  /** Draws whatever is on screen right now and uploads it as the poster. */
  async function grabFrame() {
    const element = video.current;
    if (!element) return;

    setGrabbing(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = element.videoWidth;
      canvas.height = element.videoHeight;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser wouldn't draw the frame.");
      context.drawImage(element, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.86),
      );
      if (!blob) throw new Error("This browser wouldn't encode the frame.");

      const file = new File([blob], "placeholder.webp", { type: "image/webp" });
      setPoster(await uploadMedia(file));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "That frame couldn't be saved. Try another one.",
      );
    } finally {
      setGrabbing(false);
    }
  }

  function save() {
    const trimmed =
      duration > 0 && (start > 0.05 || end < duration - 0.05)
        ? { start, end }
        : null;
    onSave(withHints(url, { trim: trimmed, poster }));
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Trim and set the placeholder">
      <div className="space-y-4 p-5">
        <div className="overflow-hidden rounded-xl bg-ink">
          {/* Anonymous, so the frame can be drawn to a canvas: a video loaded
              without it taints the canvas and the grab throws instead. */}
          <video
            ref={video}
            src={source}
            crossOrigin="anonymous"
            playsInline
            muted
            preload="metadata"
            onLoadedMetadata={onLoaded}
            onTimeUpdate={(event) => {
              const element = event.currentTarget;
              setAt(element.currentTime);
              // Preview the trim rather than the whole file.
              if (end > 0 && element.currentTime >= end) element.pause();
            }}
            className="mx-auto max-h-[45vh] w-full object-contain"
          />
        </div>

        <Field
          label="Where it starts and ends"
          hint={
            duration > 0
              ? `${clock(start)} to ${clock(end)} of ${clock(duration)} — the rest is left out of the shop, and the file is untouched.`
              : "Reading the clip…"
          }
        >
          <div className="space-y-2">
            <Handle
              label="Start"
              value={start}
              max={duration}
              onChange={(next) => {
                const capped = Math.min(next, Math.max(end - 0.5, 0));
                setStart(capped);
                seek(capped);
              }}
            />
            <Handle
              label="End"
              value={end}
              max={duration}
              onChange={(next) => {
                const capped = Math.max(next, start + 0.5);
                setEnd(capped);
                seek(capped);
              }}
            />
          </div>
        </Field>

        <Field
          label="Placeholder"
          hint="Scrub to the frame you want and grab it. Shown before the clip plays, everywhere in the shop."
        >
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.1}
              value={at}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Scrub"
              className="h-9 min-w-40 flex-1 accent-brand"
            />

            <button
              type="button"
              onClick={playRange}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-plane px-3 text-sm font-medium text-ink transition hover:bg-line-strong"
            >
              <Play className="size-3.5" />
              Preview
            </button>

            <button
              type="button"
              onClick={() => void grabFrame()}
              disabled={grabbing || duration === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-surface px-3 text-sm font-medium text-ink ring-1 ring-inset ring-line-strong transition hover:bg-plane disabled:opacity-50"
            >
              {grabbing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Camera className="size-3.5" />
              )}
              Use this frame
            </button>
          </div>

          {poster && (
            <div className="mt-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={poster}
                alt=""
                className="h-14 w-20 rounded-md object-cover ring-1 ring-inset ring-line"
              />
              <button
                type="button"
                onClick={() => setPoster(null)}
                className="text-xs font-medium text-ink-secondary hover:text-ink"
              >
                Remove placeholder
              </button>
            </div>
          )}
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>
            <Scissors className="size-4" />
            Save clip
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Handle({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-10 shrink-0 text-xs font-medium text-ink-secondary">
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={Math.max(max, 0.1)}
        step={0.1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 min-w-0 flex-1 accent-brand"
      />
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-ink-muted">
        {clock(value)}
      </span>
    </label>
  );
}

function clock(value: number): string {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
