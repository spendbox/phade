"use client";

import { useState } from "react";
import { Link2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

/**
 * The web address a thing lives at.
 *
 * On something new there is nothing to show: the slug is made from the name,
 * and offering an empty box for it invites a decision nobody has the
 * information to make yet. So it only appears once a thing exists — and then
 * it appears locked, because by that point the address is out in the world.
 *
 * Changing it is a real action with real consequences: every link anyone has
 * saved, sent or posted stops working, and the search engines that had found
 * the page have to find it again. That deserves a sentence and a deliberate
 * press, not a text box that looks like all the others.
 */
export function SlugField({
  name = "slug",
  value,
  onChange,
  /** What the address looks like in full — "/product/…" or "/shop?category=…". */
  prefix,
  /** Nothing is shown at all until the thing being edited has an address. */
  editing,
}: {
  name?: string;
  value: string;
  onChange: (next: string) => void;
  prefix: string;
  editing: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  if (!editing) {
    // Created from the name, and shown from then on.
    return <input type="hidden" name={name} value={value} />;
  }

  return (
    <Field
      label="Web address"
      htmlFor={unlocked ? name : undefined}
      hint={
        unlocked
          ? "Lower case, words joined by hyphens. Blank rebuilds it from the name."
          : "Where this lives on the site."
      }
      action={
        unlocked ? undefined : (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="text-xs font-medium text-brand hover:text-brand-dark"
          >
            Change
          </button>
        )
      }
    >
      {unlocked ? (
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoFocus
        />
      ) : (
        <>
          <input type="hidden" name={name} value={value} />
          <p className="flex items-center gap-2 rounded-lg bg-plane px-3 py-2.5 text-sm text-ink-secondary">
            <Link2 className="size-4 shrink-0 text-ink-muted" aria-hidden />
            <span className="truncate">
              {prefix}
              <span className="font-medium text-ink">{value}</span>
            </span>
          </p>
        </>
      )}

      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        title="Change the web address?"
      >
        <div className="space-y-4 p-5">
          <p className="flex gap-3 rounded-lg bg-warning-soft px-3 py-3 text-sm text-ink">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-warning"
              aria-hidden
            />
            <span>
              The current address is{" "}
              <span className="font-medium">
                {prefix}
                {value}
              </span>
              .
            </span>
          </p>

          <ul className="space-y-2 text-sm text-ink-secondary">
            <li>
              Every link already shared — a WhatsApp message, an Instagram bio,
              a customer&apos;s bookmark — will stop working.
            </li>
            <li>
              Google has to find the page again, so it can drop out of search
              results for a while.
            </li>
            <li>
              The name, the pictures and the price are all safe. This is only
              the address.
            </li>
          </ul>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setAsking(false)}>
              Leave it
            </Button>
            <Button
              onClick={() => {
                setUnlocked(true);
                setAsking(false);
              }}
            >
              I understand, let me edit
            </Button>
          </div>
        </div>
      </Modal>
    </Field>
  );
}
