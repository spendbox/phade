"use client";

import { useActionState } from "react";
import { Check, Loader2, Mail, MessageCircle, Send } from "lucide-react";

import { sendMessage, type ContactState } from "@/app/(shop)/contact-actions";
import { Sheet } from "@/components/shop/sheet";
import type { SupportDetails } from "@/lib/storefront";

/**
 * Reaching a person.
 *
 * Opened from the foot of every page and from "Contact us" in the menu, so it
 * lives on its own rather than inside either of them.
 *
 * WhatsApp first where the shop offers it — that is how most people here would
 * rather ask a question, and burying it under a form would be pretending
 * otherwise. The form is for everyone else, and for anything with an order
 * number in it that a shop will want to be able to find again.
 */
export function HelpSheet({
  open,
  onClose,
  support,
}: {
  open: boolean;
  onClose: () => void;
  support: SupportDetails;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="Help"
      side="center"
      className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-canvas sm:max-w-md sm:rounded-3xl"
    >
      <div className="p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-6">
        <Help support={support} />
      </div>
    </Sheet>
  );
}

const initial: ContactState = { ok: null };

export function Help({ support }: { support: SupportDetails }) {
  const [state, formAction, pending] = useActionState(sendMessage, initial);

  const unsent = state.ok === false && "unsent" in state ? state : null;
  const failed = state.ok === false && "error" in state ? state.error : null;

  return (
    <div className="stagger space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Mail className="size-4" aria-hidden />
          </span>
          Here to help
        </h2>
        {support.note && (
          <p className="mt-2 text-sm text-ink-secondary">{support.note}</p>
        )}
      </div>

      {support.whatsappEnabled && (
        <a
          href={`https://wa.me/${support.whatsappNumber}`}
          target="_blank"
          rel="noreferrer noopener"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25d366] text-sm font-semibold text-white transition hover:brightness-95 active:scale-[0.98]"
        >
          <MessageCircle className="size-4" aria-hidden />
          Chat on WhatsApp
        </a>
      )}

      {state.ok === true ? (
        <p className="flex items-center gap-2.5 rounded-2xl bg-brand-soft px-4 py-3.5 text-sm font-medium text-brand">
          <span className="pop-in flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Check className="size-4" aria-hidden />
          </span>
          {state.message}
        </p>
      ) : (
        <form action={formAction} className="space-y-3">
          {support.whatsappEnabled && (
            <p className="text-center text-xs uppercase tracking-[0.14em] text-ink-muted">
              or send an email
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Text name="name" label="Your name" autoComplete="name" required />
            <Text
              name="email"
              label="Your email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-[13px] font-medium text-ink-secondary"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={4}
              required
              placeholder="What can we help with?"
              className="mt-1.5 w-full rounded-2xl bg-canvas-deep px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {failed && (
            <p role="alert" className="text-sm text-critical">
              {failed}
            </p>
          )}

          {/* No mail provider is configured, so rather than swallow what
              somebody took the trouble to write, it is handed to their own
              mail app with every word already in it. */}
          {unsent && (
            <div className="rounded-2xl bg-canvas-deep px-4 py-3 text-[13px] text-ink-secondary">
              <p>Nearly — finish in your mail app and it&apos;s on its way.</p>
              <a
                href={`mailto:${unsent.to}?subject=${encodeURIComponent(unsent.subject)}&body=${encodeURIComponent(unsent.body)}`}
                className="mt-2 inline-flex h-10 items-center gap-2 rounded-full bg-noir px-4 text-sm font-semibold text-white transition hover:bg-brand"
              >
                <Mail className="size-4" aria-hidden />
                Open mail to {unsent.to}
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-noir text-sm font-semibold text-white transition hover:bg-brand disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {pending ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </div>
  );
}

function Text({
  name,
  label,
  ...props
}: React.ComponentPropsWithoutRef<"input"> & { name: string; label: string }) {
  return (
    <div>
      <label
        htmlFor={`contact-${name}`}
        className="block text-[13px] font-medium text-ink-secondary"
      >
        {label}
      </label>
      <input
        id={`contact-${name}`}
        name={name}
        className="mt-1.5 h-12 w-full rounded-2xl bg-canvas-deep px-4 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
        {...props}
      />
    </div>
  );
}
