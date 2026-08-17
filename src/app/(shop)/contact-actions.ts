"use server";

import { isEmailConfigured, sendEmail } from "@/lib/email";
import { getEmailTemplates } from "@/lib/email-templates";
import { getStorefront } from "@/lib/storefront";

/**
 * A message from the shop front.
 *
 * Where it goes is a setting, not a constant — the shop types the address in
 * Settings → Storefront, and it is read here rather than sent up from the
 * browser, so nobody can redirect a form on someone else's site at an inbox of
 * their choosing.
 *
 * Sending needs a mail provider. When `RESEND_API_KEY` is set the message is
 * delivered from the server and the shopper never leaves the page; when it
 * isn't — which is the state a shop is in the day it opens — the answer says
 * so, and the pop-up falls back to opening the shopper's own mail app with the
 * whole message already written. That is a worse experience and a working one,
 * which beats a form that silently drops what someone took the trouble to
 * type.
 */

export type ContactState =
  | { ok: null }
  | { ok: true; message: string }
  | { ok: false; error: string }
  /** No provider configured: hand it back for the browser to post itself. */
  | { ok: false; unsent: true; to: string; subject: string; body: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMessage(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const from = String(formData.get("email") ?? "").trim();
  const body = String(formData.get("message") ?? "").trim();

  if (!name) return { ok: false, error: "Tell us your name." };
  if (!EMAIL.test(from)) {
    return { ok: false, error: "That email address doesn't look right." };
  }
  if (body.length < 4) return { ok: false, error: "Write your message first." };
  if (body.length > 4000) {
    return { ok: false, error: "That message is too long to send." };
  }

  const { support } = await getStorefront();
  const subject = `Message from ${name}`;
  const text = `${body}\n\n—\n${name}\n${from}`;

  if (!isEmailConfigured()) {
    return { ok: false, unsent: true, to: support.email, subject, body: text };
  }

  const { shopName } = await getEmailTemplates();

  const result = await sendEmail({
    to: support.email,
    subject,
    text,
    // Sending as the shopper would be forged mail that never arrives; replying
    // to them is the part that matters, and that is honest.
    replyTo: from,
    fromName: shopName,
  });

  if (!result.ok) {
    return { ok: false, unsent: true, to: support.email, subject, body: text };
  }

  return { ok: true, message: "Sent — we'll reply to that address." };
}
