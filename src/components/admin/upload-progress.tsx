"use client";

import { Loader2 } from "lucide-react";

/**
 * How far each file has actually got.
 *
 * A spinner says "something is happening"; it does not say whether a 40MB clip
 * on a phone tether is a minute from finishing or has stalled entirely, and
 * the difference decides whether someone waits or gives up and re-drops it.
 * The number comes from the browser's own upload progress — see
 * `@/lib/upload-client` — so it is the real figure, not a guess on a timer.
 */
export function UploadProgress({
  going,
}: {
  going: { id: number; name: string; at: number }[];
}) {
  if (going.length === 0) return null;

  return (
    <ul className="space-y-2" aria-live="polite">
      {going.map((file) => {
        const percent = Math.round(file.at * 100);
        return (
          <li key={file.id} className="rounded-lg bg-plane px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Loader2 className="size-3.5 shrink-0 animate-spin text-ink-muted" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                {file.name}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-ink-secondary">
                {percent}%
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={`Uploading ${file.name}`}
              className="mt-2 h-1 overflow-hidden rounded-full bg-surface"
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-200 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
