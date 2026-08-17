import type { SupabaseClient } from "@supabase/supabase-js";

import { BRAND_COLOR } from "@/lib/brand";
import { escapeHtml, isEmailConfigured, sendEmail, siteUrl } from "@/lib/email";
import {
  fill,
  getEmailTemplates,
  type EmailTemplate,
  type EmailTemplates,
} from "@/lib/email-templates";
import { formatNairaShort } from "@/lib/format";
import { getStorefront } from "@/lib/storefront";
import type { OrderItem, OrderWithRelations } from "@/lib/types";

/**
 * The two emails an order sends: a receipt to the shopper, and an alert to the
 * shop.
 *
 * Sent once, at the moment the order is settled — which is the payment landing
 * for a card order, and the order being placed for one with nothing to pay.
 * The callers own that "once": every one of them fires on the pending → paid
 * transition, which happens a single time however many times a webhook is
 * redelivered.
 *
 * Nothing in here throws. An order is a fact in the database the instant it is
 * written; the email is a courtesy about that fact, and a courtesy must never
 * be able to roll one back.
 */

type OrderEmailOutcome = {
  customer: boolean;
  shop: boolean;
  errors: string[];
};

const SILENT: OrderEmailOutcome = { customer: false, shop: false, errors: [] };

/**
 * The way out of each message, and the line at the very bottom.
 *
 * The customer is told why they got this, which is what a receipt owes anyone
 * who didn't ask to be emailed. The shop already knows why, and is told where
 * to turn it off instead.
 */
const CUSTOMER_BUTTON = {
  label: "View your order",
  footer: "You're receiving this because you placed an order with us.",
};

const SHOP_BUTTON = {
  label: "Open in the dashboard",
  footer: "Sent to you because a sale landed. Settings \u2192 Developers turns these off.",
};

/** The message shell — one narrow column, inline styles, tables. */
function shell(body: string, footer: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#f4f2f1;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f2f1;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
${body}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:20px 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8a8380;text-align:center;">
${footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** One row per line bought, with what it cost. */
function itemRows(items: OrderItem[]): string {
  return items
    .map(
      (item) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid #efecea;font-size:14px;color:#1a1718;">
${escapeHtml(item.name)}
<span style="display:block;font-size:12px;color:#8a8380;padding-top:2px;">
&times;${item.quantity} &middot; ${escapeHtml(formatNairaShort(item.unit_price_kobo))}
</span>
</td>
<td align="right" style="padding:10px 0;border-bottom:1px solid #efecea;font-size:14px;font-weight:600;color:#1a1718;white-space:nowrap;">
${escapeHtml(formatNairaShort(item.unit_price_kobo * item.quantity))}
</td>
</tr>`,
    )
    .join("");
}

function totalRow(label: string, value: string, strong = false): string {
  const weight = strong ? "600" : "400";
  const size = strong ? "16px" : "14px";
  const border = strong ? "border-top:1px solid #efecea;padding-top:12px;" : "";
  return `<tr>
<td style="padding:4px 0;${border}font-size:${size};color:${strong ? "#1a1718" : "#6b6462"};font-weight:${weight};">${escapeHtml(label)}</td>
<td align="right" style="padding:4px 0;${border}font-size:${size};color:#1a1718;font-weight:${strong ? "600" : "500"};white-space:nowrap;">${escapeHtml(value)}</td>
</tr>`;
}

/** Where it's going, or where it's being collected from. */
function addressLines(order: OrderWithRelations): string[] {
  const address = order.shipping_address;
  if (!address) return [];

  if (order.fulfilment === "pickup") {
    if (!address.pickup) return [];
    return [
      address.pickup.name,
      address.pickup.address,
      address.pickup.note ?? "",
    ].filter(Boolean);
  }

  return [
    order.customer?.full_name ?? "",
    address.line1 ?? "",
    address.line2 ?? "",
    address.area ?? "",
    [address.city, address.state].filter(Boolean).join(", "),
    address.country ?? "",
    address.phone ?? "",
  ].filter(Boolean);
}

function block(title: string, lines: string[]): string {
  if (lines.length === 0) return "";
  return `<tr><td style="padding:0 28px 24px;">
<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#8a8380;">${escapeHtml(title)}</p>
<p style="margin:0;font-size:14px;line-height:1.6;color:#1a1718;">
${lines.map((line) => escapeHtml(line)).join("<br>")}
</p>
</td></tr>`;
}

/** The values every token in a template can be replaced with. */
function tokensFor(
  order: OrderWithRelations,
  templates: EmailTemplates,
  orderUrl: string,
): Record<string, string> {
  const name = order.customer?.full_name?.trim() || "";
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    customer_name: name || "a customer",
    // "Hi there" reads better to a stranger than "Hi ," does.
    first_name: name.split(/\s+/)[0] || "there",
    reference: order.reference,
    total: formatNairaShort(order.total_kobo),
    item_count: `${count} item${count === 1 ? "" : "s"}`,
    fulfilment: order.fulfilment === "pickup" ? "collection" : "delivery",
    shop_name: templates.shopName,
    order_url: orderUrl,
  };
}

/** The HTML body shared by both messages, differing only in its words. */
function renderHtml(
  template: EmailTemplate,
  values: Record<string, string>,
  order: OrderWithRelations,
  templates: EmailTemplates,
  button: { label: string; href: string; footer: string },
): string {
  const heading = escapeHtml(fill(template.heading, values));
  const intro = escapeHtml(fill(template.intro, values));
  const outro = fill(template.outro, values).trim();

  const totals = [
    totalRow("Subtotal", formatNairaShort(order.subtotal_kobo)),
    order.discount_kobo > 0
      ? totalRow(
          order.discount_code ? `Coupon · ${order.discount_code}` : "Coupon",
          `−${formatNairaShort(order.discount_kobo)}`,
        )
      : "",
    totalRow(
      order.fulfilment === "pickup" ? "Pickup" : "Delivery",
      order.shipping_kobo === 0 ? "Free" : formatNairaShort(order.shipping_kobo),
    ),
    totalRow("Total", formatNairaShort(order.total_kobo), true),
  ].join("");

  const body = `
<tr><td style="height:4px;background:${BRAND_COLOR};font-size:0;line-height:0;">&nbsp;</td></tr>

<tr><td style="padding:24px 28px 0;">
<p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:lowercase;color:${BRAND_COLOR};">${escapeHtml(templates.shopName)}</p>
</td></tr>

<tr><td style="padding:20px 28px 0;">
<h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:600;color:#1a1718;">${heading}</h1>
<p style="margin:12px 0 0;font-size:14px;line-height:1.65;color:#6b6462;">${intro}</p>
</td></tr>

<tr><td style="padding:24px 28px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf9f8;border-radius:10px;">
<tr><td style="padding:10px 14px;font-size:12px;color:#8a8380;">
Reference <strong style="color:#1a1718;letter-spacing:0.02em;">${escapeHtml(order.reference)}</strong>
</td></tr>
</table>
</td></tr>

<tr><td style="padding:20px 28px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${itemRows(order.items)}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
${totals}
</table>
</td></tr>

<tr><td style="padding:26px 28px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="border-radius:999px;background:${BRAND_COLOR};">
<a href="${escapeHtml(button.href)}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(button.label)}</a>
</td></tr>
</table>
</td></tr>

<tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>

${block(
  order.fulfilment === "pickup" ? "Collection" : "Delivering to",
  addressLines(order),
)}

${
  order.note
    ? block("Note from the customer", [order.note])
    : ""
}

${
  outro
    ? `<tr><td style="padding:0 28px 28px;">
<p style="margin:0;font-size:13px;line-height:1.65;color:#6b6462;">${escapeHtml(outro)}</p>
</td></tr>`
    : ""
}`;

  return shell(
    body,
    `${escapeHtml(templates.shopName)} &middot; Nigeria<br>${escapeHtml(button.footer)}`,
  );
}

/** The same message as words, for clients that won't render the HTML. */
function renderText(
  template: EmailTemplate,
  values: Record<string, string>,
  order: OrderWithRelations,
  button: { label: string; href: string; footer: string },
): string {
  const lines = [
    fill(template.heading, values),
    "",
    fill(template.intro, values),
    "",
    `Reference: ${order.reference}`,
    "",
    ...order.items.map(
      (item) =>
        `${item.name} ×${item.quantity} — ${formatNairaShort(item.unit_price_kobo * item.quantity)}`,
    ),
    "",
    `Subtotal: ${formatNairaShort(order.subtotal_kobo)}`,
  ];

  if (order.discount_kobo > 0) {
    lines.push(
      `Coupon${order.discount_code ? ` (${order.discount_code})` : ""}: −${formatNairaShort(order.discount_kobo)}`,
    );
  }

  lines.push(
    `${order.fulfilment === "pickup" ? "Pickup" : "Delivery"}: ${
      order.shipping_kobo === 0 ? "Free" : formatNairaShort(order.shipping_kobo)
    }`,
    `Total: ${formatNairaShort(order.total_kobo)}`,
    "",
    `${button.label}: ${button.href}`,
  );

  const address = addressLines(order);
  if (address.length > 0) {
    lines.push(
      "",
      order.fulfilment === "pickup" ? "Collection:" : "Delivering to:",
      ...address,
    );
  }

  if (order.note) lines.push("", `Note: ${order.note}`);

  const outro = fill(template.outro, values).trim();
  if (outro) lines.push("", outro);

  return lines.join("\n");
}

/** A believable order, for the shop to see its own wording arrive. */
function sampleOrder(): OrderWithRelations {
  const now = new Date().toISOString();
  const item = (
    name: string,
    unit: number,
    quantity: number,
  ): OrderItem => ({
    id: name,
    order_id: "sample",
    product_id: null,
    name,
    unit_price_kobo: unit,
    quantity,
    image_url: null,
    created_at: now,
  });

  return {
    id: "00000000-0000-0000-0000-000000000000",
    reference: "PW-SAMPLE0000000000",
    customer_id: null,
    status: "paid",
    fulfilment: "shipping",
    subtotal_kobo: 14_250_000,
    shipping_kobo: 350_000,
    discount_kobo: 1_425_000,
    discount_code: "WELCOME10",
    discount_id: null,
    total_kobo: 13_175_000,
    shipping_address: {
      line1: "14 Karimu Kotun Street",
      area: "Victoria Island",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
      phone: "+234 801 234 5678",
    },
    note: "Please call before delivery — the gate is usually locked.",
    placed_at: now,
    created_at: now,
    updated_at: now,
    customer: {
      id: "sample",
      email: "halima@example.com",
      full_name: "Halima Bello",
      phone: "+234 801 234 5678",
      notes: null,
      created_at: now,
      updated_at: now,
    },
    items: [
      item("Adire wrap dress · Indigo · UK 12", 8_500_000, 1),
      item("Raffia tote · Natural", 2_875_000, 2),
    ],
  };
}

/**
 * Sends one of the two templates, filled with a sample order, to an address of
 * the shop's choosing.
 *
 * The point is to prove the whole chain at once — the key, the sender domain,
 * the wording, and what it looks like on a phone — without waiting for someone
 * to buy something. Unlike the real send this one reports its failure, because
 * a test that fails silently is worse than no test.
 */
export async function sendTestOrderEmail(
  which: "customer" | "shop",
  to: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Add RESEND_API_KEY in Vercel and redeploy." };
  }

  const templates = await getEmailTemplates();
  const order = sampleOrder();
  const orderUrl = `${siteUrl()}/order/${order.reference}`;
  const values = tokensFor(order, templates, orderUrl);
  const template = which === "customer" ? templates.customer : templates.shop;

  const button =
    which === "customer"
      ? { ...CUSTOMER_BUTTON, href: orderUrl }
      : { ...SHOP_BUTTON, href: `${siteUrl()}/admin/orders` };

  const result = await sendEmail({
    to,
    subject: `[Test] ${fill(template.subject, values)}`,
    html: renderHtml(template, values, order, templates, button),
    text: renderText(template, values, order, button),
    fromName: templates.shopName,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/**
 * Sends both emails for one order.
 *
 * Takes the order id rather than the order because every caller has just
 * written to it and none of them holds the whole thing with its items and its
 * customer attached.
 */
export async function sendOrderEmails(
  supabase: SupabaseClient,
  orderId: string,
): Promise<OrderEmailOutcome> {
  try {
    if (!isEmailConfigured()) return SILENT;

    const templates = await getEmailTemplates();
    if (!templates.enabled) return SILENT;

    const { data, error } = await supabase
      .from("orders")
      .select("*, customer:customers(*), items:order_items(*)")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !data) return SILENT;
    const order = data as unknown as OrderWithRelations;

    const orderUrl = `${siteUrl()}/order/${order.reference}`;
    const values = tokensFor(order, templates, orderUrl);

    // Where the shop's own copy goes: its own override, or the address the
    // storefront already sends questions to.
    const { support } = await getStorefront();
    const shopInbox = templates.notifyEmail || support.email;
    const customerEmail = order.customer?.email?.trim() ?? "";

    const errors: string[] = [];

    // Sent one after the other rather than together: the customer's receipt is
    // the one that matters, and a shop inbox that bounces must not take it
    // down with it.
    let customerSent = false;
    if (customerEmail) {
      const button = { ...CUSTOMER_BUTTON, href: orderUrl };
      const result = await sendEmail({
        to: customerEmail,
        subject: fill(templates.customer.subject, values),
        html: renderHtml(templates.customer, values, order, templates, button),
        text: renderText(templates.customer, values, order, button),
        fromName: templates.shopName,
        // A receipt someone replies to should reach the shop, not the sending
        // domain's dead letter box.
        replyTo: shopInbox,
      });
      customerSent = result.ok;
      if (!result.ok) errors.push(`customer: ${result.error}`);
    }

    let shopSent = false;
    if (shopInbox) {
      const button = {
        ...SHOP_BUTTON,
        href: `${siteUrl()}/admin/orders/${order.id}`,
      };
      const result = await sendEmail({
        to: shopInbox,
        subject: fill(templates.shop.subject, values),
        html: renderHtml(templates.shop, values, order, templates, button),
        text: renderText(templates.shop, values, order, button),
        fromName: templates.shopName,
        // So the shop can answer the customer straight from the alert.
        ...(customerEmail ? { replyTo: customerEmail } : {}),
      });
      shopSent = result.ok;
      if (!result.ok) errors.push(`shop: ${result.error}`);
    }

    if (errors.length > 0) {
      console.error(`[order-email] ${order.reference}`, errors.join(" | "));
    }

    return { customer: customerSent, shop: shopSent, errors };
  } catch (error) {
    // Belt and braces: this is called from a webhook that must still return 200
    // and from a checkout that has already taken the money.
    console.error("[order-email] failed", error);
    return SILENT;
  }
}
