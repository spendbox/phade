"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";

import { MediaThumb } from "@/components/admin/media-thumb";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import {
  FOCUS_KEYS,
  isVideoUrl,
  objectPosition,
  readHints,
  withHints,
  type Focus,
  type Screens,
} from "@/lib/media";

/**
 * Framing a hero, twice.
 *
 * The hero is the one place in the shop where the same file is asked to fill
 * two completely different shapes: a wide band on a laptop and a tall column
 * on a phone. A photograph shot for a shop is usually portrait, so a single
 * centred crop either keeps the model and wastes the desktop, or fills the
 * desktop and cuts her head off.
 *
 * The old answer was to show the whole picture over a blurred copy of itself,
 * which is a workaround for a decision nobody had been given a way to make.
 * This is the decision: press the part of each preview that matters, in each
 * shape, and watch the crop move under your finger. A picture that only works
 * in one shape can say so instead, and it simply won't appear on the other.
 */
export function HeroEditor({
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
  const saved = readHints(url);

  const [focus, setFocus] = useState<Focus>(saved.focus);
  const [mobileFocus, setMobileFocus] = useState<Focus>(saved.mobileFocus);
  const [screens, setScreens] = useState<Screens>(saved.screens);

  const clip = isVideoUrl(url);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={clip ? "Frame this clip" : "Frame this picture"}
      size="lg"
    >
      <div className="space-y-5 p-5">
        <Field
          label="Where it appears"
          hint="Some shots only work wide and some only work tall. Hiding the wrong one beats cropping it into something you'd never have chosen."
        >
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-plane p-1">
            {(
              [
                [null, "Both screens"],
                ["desktop", "Desktop only"],
                ["mobile", "Mobile only"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setScreens(value)}
                className={cn(
                  "rounded-md py-1.5 text-[13px] font-medium transition-colors",
                  screens === value
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-secondary hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {screens !== "mobile" && (
            <Crop
              url={url}
              label="On a desktop"
              icon={<Monitor className="size-3.5" aria-hidden />}
              ratio="16 / 9"
              focus={focus}
              onChoose={setFocus}
            />
          )}

          {screens !== "desktop" && (
            <Crop
              url={url}
              label="On a phone"
              icon={<Smartphone className="size-3.5" aria-hidden />}
              ratio="9 / 16"
              focus={mobileFocus}
              onChoose={setMobileFocus}
            />
          )}
        </div>

        <p className="text-xs text-ink-muted">
          Press the part of each preview worth keeping. These are the real
          crops, at the shapes the hero actually is.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(withHints(url, { focus, mobileFocus, screens }));
              onClose();
            }}
          >
            Save framing
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * One shape, with the picture cropped into it and a grid over the top.
 *
 * The picker is the picture: pressing a cell moves the crop there at once,
 * under the finger. A dropdown reading "top left" would ask someone to hold a
 * mental model of a crop they cannot see; this is the crop.
 */
function Crop({
  url,
  label,
  icon,
  ratio,
  focus,
  onChoose,
}: {
  url: string;
  label: string;
  icon: React.ReactNode;
  ratio: string;
  focus: Focus;
  onChoose: (next: Focus) => void;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary">
        {icon}
        {label}
      </p>

      <div
        className="relative overflow-hidden rounded-xl bg-ink ring-1 ring-inset ring-line"
        style={{ aspectRatio: ratio }}
      >
        <MediaThumb
          url={url}
          className="absolute inset-0 size-full"
          style={{ objectPosition: objectPosition(focus) }}
        />

        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
          {FOCUS_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={key.replace("-", " ")}
              aria-pressed={key === focus}
              onClick={() => onChoose(key)}
              className={cn(
                "flex items-center justify-center border border-white/20 transition",
                key === focus ? "bg-white/20" : "hover:bg-white/25",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full transition",
                  key === focus
                    ? "scale-150 bg-white shadow"
                    : "bg-white/50",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
