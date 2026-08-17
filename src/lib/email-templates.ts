import { cache } from "react";

import { getSupabase } from "@/lib/supabase";

/**
 * The words in the order emails, editable from the dashboard.
 *
 * Structure is code and copy is a setting — the same split the storefront
 * settings make. The shop writes the subject and the sentences either side of
 * the order; the item table, the totals, the address block and the button are
 * rendered by `order-email.ts` and can't be broken by a stray tag, because the
 * fields here are plain text and are escaped on their way into the HTML.
 *
 * Two audiences, because they want opposite things. The customer wants
 * reassurance and their own reference. The shop wants to know a sale landed and
 * what to pack — a message it reads on a phone, twenty seconds after the money
 * arrives.
 */

export type EmailTemplate = {
  /** The subject line. Tokens allowed. */
  subject: string;
  /** The large line at the top of the message. Tokens allowed. */
  heading: string;
  /** The paragraph above the order. Tokens allowed. */
  intro: string;
  /** The paragraph below the order, before the sign-off. Tokens allowed. */
  outro: string;
};

export type EmailTemplates = {
  /** Whether order mail goes out at all. Off leaves the shop as it was. */
  enabled: boolean;
  /** The name an inbox shows as the sender, and the name in the footer. */
  shopName: string;
  /**
   * Where the shop's own copy of an order goes.
   *
   * Blank means the support address in Settings → Storefront, which is where
   * it should go for all but the shop that wants orders and questions in
   * different inboxes.
   */
  notifyEmail: string;
  /** The receipt, to the person who bought something. */
  customer: EmailTemplate;
  /** The alert, to the shop. */
  shop: EmailTemplate;
};

export const EMAIL_TEMPLATES_KEY = "email_templates";

/**
 * What a shop can drop into any of the fields above.
 *
 * Listed here rather than in the form so the admin page and the renderer can
 * never disagree about which tokens exist — the page reads this list to show
 * them, and `fill` reads it to replace them.
 */
export const EMAIL_TOKENS = [
  { token: "{{customer_name}}", hint: "Halima Bello" },
  { token: "{{first_name}}", hint: "Halima" },
  { token: "{{reference}}", hint: "PW-9F2C4A81B0E7D3A6C5" },
  { token: "{{total}}", hint: "₦148,500" },
  { token: "{{item_count}}", hint: "3 items" },
  { token: "{{fulfilment}}", hint: "delivery / collection" },
  { token: "{{shop_name}}", hint: "the name below" },
  { token: "{{order_url}}", hint: "the link to their order page" },
] as const;

export const DEFAULT_CUSTOMER_TEMPLATE: EmailTemplate = {
  subject: "Your phadewoman order {{reference}}",
  heading: "Thank you, {{first_name}}",
  intro:
    "We've got your order and we're packing it now. Here's everything you bought, so you have it in writing.",
  outro:
    "Keep this email — the button above opens your order at any time, and it's the quickest way for us to find it if you need anything. Just reply to this message and a person will answer.",
};

export const DEFAULT_SHOP_TEMPLATE: EmailTemplate = {
  subject: "New order {{reference}} · {{total}}",
  heading: "{{total}} from {{customer_name}}",
  intro: "A new order has been paid for. Here's what to pack.",
  outro: "Open the dashboard to mark it packed once it's on its way.",
};

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplates = {
  enabled: true,
  shopName: "phadewoman",
  notifyEmail: "",
  customer: DEFAULT_CUSTOMER_TEMPLATE,
  shop: DEFAULT_SHOP_TEMPLATE,
};

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function group(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * One template, with blanks taking their default back.
 *
 * Unlike a storefront section, an emptied field here is never a decision worth
 * honouring: a message with no subject is spam-filtered and one with no heading
 * arrives looking broken. Clearing a field restores our words instead.
 */
function parseTemplate(raw: unknown, fallback: EmailTemplate): EmailTemplate {
  const value = group(raw);
  return {
    subject: str(value.subject, "").trim() || fallback.subject,
    heading: str(value.heading, "").trim() || fallback.heading,
    intro: str(value.intro, "").trim() || fallback.intro,
    // The only field a shop may genuinely want silent — some shops sign off in
    // the intro and want nothing after the total.
    outro:
      Object.keys(value).length > 0
        ? str(value.outro, "").trim()
        : fallback.outro,
  };
}

export function parseEmailTemplates(raw: unknown): EmailTemplates {
  const value = group(raw);
  const email = str(value.notifyEmail, "").trim().toLowerCase();

  return {
    // A row that has never been saved sends, because a shop that connects
    // Resend wants the emails — having to find a switch afterwards is a
    // silence nobody would think to go looking for.
    enabled: Object.keys(value).length === 0 ? true : value.enabled !== false,
    shopName:
      str(value.shopName, "").trim() || DEFAULT_EMAIL_TEMPLATES.shopName,
    notifyEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
    customer: parseTemplate(value.customer, DEFAULT_CUSTOMER_TEMPLATE),
    shop: parseTemplate(value.shop, DEFAULT_SHOP_TEMPLATE),
  };
}

/**
 * Substitutes the tokens in one field.
 *
 * Single pass over the whole string, so a value that happens to contain
 * something shaped like a token — a customer literally named `{{total}}` —
 * can't have it replaced in a second round.
 */
export function fill(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, key: string) =>
    key in values ? values[key] : whole,
  );
}

async function loadEmailTemplates(): Promise<EmailTemplates> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_EMAIL_TEMPLATES;

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", EMAIL_TEMPLATES_KEY)
    .maybeSingle();

  if (error || !data) return DEFAULT_EMAIL_TEMPLATES;
  return parseEmailTemplates((data as { value: unknown }).value);
}

/**
 * Read fresh, cached only for the length of one request.
 *
 * Deliberately not `unstable_cache`: this is read at the moment an order is
 * paid for, not on every page view, so there is no load to spare — and a shop
 * that has just fixed a typo in a receipt should not watch the next customer
 * get the old one for another minute.
 */
export const getEmailTemplates = cache(
  async function getEmailTemplates(): Promise<EmailTemplates> {
    return loadEmailTemplates();
  },
);
