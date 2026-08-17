/**
 * Sending mail, through Resend.
 *
 * One place that knows the API, so the contact form and the order emails send
 * the same way and a change of provider is a change to this file. Everything
 * here is deliberately forgiving: mail is a notification, never the thing a
 * shopper is waiting on, and a provider having a bad minute must not be the
 * reason an order fails to save.
 *
 * Two environment variables:
 *
 * - `RESEND_API_KEY` — without it nothing is sent, and every caller is told so
 *   rather than left to assume it worked.
 * - `CONTACT_FROM` — the address mail is sent *from*. It must be on a domain
 *   verified with Resend; the fallback works out of the box but announces
 *   itself as a test address, which is fine for a message landing in the
 *   shop's own inbox and wrong on a receipt going to a customer.
 */

/** Resend's shared sandbox sender — works with no DNS, looks like what it is. */
export const FALLBACK_FROM = "onboarding@resend.dev";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** True once mail can go to a customer without looking like a test message. */
export function isSenderVerified(): boolean {
  return Boolean(process.env.CONTACT_FROM?.trim());
}

/**
 * Who the mail comes from.
 *
 * Resend accepts a bare address or a `Name <address>` pair; the pair is what an
 * inbox shows as the sender, so a shop that has set its own address gets its
 * own name on the message rather than a string of letters before an @.
 */
export function emailFrom(shopName?: string): string {
  const address = process.env.CONTACT_FROM?.trim() || FALLBACK_FROM;
  const name = shopName?.trim();
  // A display name containing a quote or a newline would break the header, and
  // there is no version of that worth rescuing — send it bare instead.
  if (!name || /["\r\n<>]/.test(name)) return address;
  return `${name} <${address}>`;
}

/**
 * Where the links in an email point.
 *
 * An email outlives the request that sent it, so a relative path is no use and
 * the request's own host isn't always there to ask — the Paystack webhook
 * arrives on its own. Set `NEXT_PUBLIC_SITE_URL` to be certain; the Vercel
 * variables cover a normal deployment, and the last fallback is the live shop.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "https://phadewoman.com";
}

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export type SendInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text: string;
  /** Where a reply goes, when that isn't the sending address. */
  replyTo?: string;
  /** Overrides the sender — only the shop's own name, never the address. */
  fromName?: string;
};

/**
 * Sends one email, and never throws.
 *
 * Callers get a result they can log or ignore. That is the whole contract: no
 * order, payment or webhook acknowledgement should be undone because a message
 * about it didn't go out.
 */
export async function sendEmail(input: SendInput): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set." };

  const to = (Array.isArray(input.to) ? input.to : [input.to])
    .map((address) => address.trim())
    .filter(Boolean);
  if (to.length === 0) return { ok: false, error: "No recipient." };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom(input.fromName),
        to,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        subject: input.subject,
        ...(input.html ? { html: input.html } : {}),
        text: input.text,
      }),
    });

    if (!response.ok) {
      // Resend explains itself in the body — a rejected sender domain is the
      // usual cause, and the message says which. Worth keeping.
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Resend refused the message (${response.status}). ${detail}`.trim(),
      };
    }

    const body = (await response.json().catch(() => null)) as {
      id?: string;
    } | null;
    return { ok: true, id: body?.id ?? null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not reach Resend.",
    };
  }
}

/** Escapes text on its way into an HTML email body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
