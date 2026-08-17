import { Check, Minus } from "lucide-react";

import { EmailTemplatesForm } from "@/components/admin/email-templates-form";
import { Panel } from "@/components/ui/stat-tile";
import { adminCredentialsState } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { isEmailConfigured, isSenderVerified } from "@/lib/email";
import { getEmailTemplates } from "@/lib/email-templates";
import { isPaystackConfigured } from "@/lib/paystack";
import { getStorefront } from "@/lib/storefront";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Developers · Settings" };

export default async function DevelopersSettingsPage() {
  const credentials = adminCredentialsState();
  const configured = isSupabaseConfigured();
  const [templates, storefront] = await Promise.all([
    getEmailTemplates(),
    getStorefront(),
  ]);

  const integrations = [
    {
      name: "Admin login",
      ready: credentials.configured,
      variables: ["ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET"],
      detail:
        "Change the email or password in Vercel and redeploy — the new credentials take effect immediately, and existing sessions keep working until they expire.",
    },
    {
      name: "Supabase",
      ready: configured,
      variables: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      detail:
        "Stores products, orders, customers, inventory and payments, plus product media. Run supabase/schema.sql once in the SQL editor to create the tables.",
    },
    {
      name: "Paystack",
      ready: isPaystackConfigured(),
      variables: ["PAYSTACK_SECRET_KEY"],
      detail:
        "Records revenue. Point your Paystack webhook at /api/paystack/webhook, and use “Sync from Paystack” on the Payments page to backfill.",
    },
    {
      name: "AI assistant",
      ready: Boolean(process.env.OPENAI_API_KEY),
      variables: ["OPENAI_API_KEY", "OPENAI_MODEL"],
      detail:
        "Powers the write/improve buttons on product and category descriptions, and tag suggestions. OPENAI_MODEL is optional and defaults to gpt-4o-mini.",
    },
    {
      name: "Email — Resend",
      ready: isEmailConfigured(),
      variables: ["RESEND_API_KEY", "CONTACT_FROM", "NEXT_PUBLIC_SITE_URL"],
      detail: isSenderVerified()
        ? "Sends order receipts, your own new-order alerts, and the “Here to help” form. CONTACT_FROM is the address they're sent from and must be on a domain verified with Resend. NEXT_PUBLIC_SITE_URL is optional and sets where the links in an email point."
        : "Sends order receipts, your own new-order alerts, and the “Here to help” form. CONTACT_FROM is not set, so mail goes out from onboarding@resend.dev — fine for messages to yourself, wrong on a receipt. Verify a domain with Resend and set it to an address on that domain.",
    },
    {
      name: "Cart tracking",
      ready: Boolean(process.env.STOREFRONT_API_KEY),
      variables: ["STOREFRONT_API_KEY"],
      detail:
        "Lets the storefront report cart activity to /api/cart so unfinished checkouts appear under Checkouts. Until it is set the endpoint stays closed.",
    },
  ];

  return (
    <>
      <Panel title="Integrations" bodyClassName="p-0">
        <ul className="divide-y divide-line">
          {integrations.map((integration) => (
            <li key={integration.name} className="px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {integration.name}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                    {integration.detail}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {integration.variables.map((variable) => (
                      <li
                        key={variable}
                        className="rounded bg-plane px-1.5 py-0.5 font-mono text-[11px] text-ink-secondary"
                      >
                        {variable}
                      </li>
                    ))}
                  </ul>
                </div>

                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                    integration.ready
                      ? "bg-good-soft text-good-text"
                      : "bg-plane text-ink-secondary",
                  )}
                >
                  {integration.ready ? (
                    <Check className="size-3" />
                  ) : (
                    <Minus className="size-3" />
                  )}
                  {integration.ready ? "Connected" : "Not set"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Order emails">
        <EmailTemplatesForm
          templates={templates}
          supportEmail={storefront.support.email}
          canSend={isEmailConfigured()}
        />
      </Panel>

      <Panel title="Webhook endpoint">
        <p className="text-sm text-ink-secondary">
          Paste this into Paystack → Settings → API Keys &amp; Webhooks:
        </p>
        <code className="mt-2 block overflow-x-auto rounded-lg bg-plane px-3 py-2 font-mono text-[13px] text-ink">
          https://phadewoman.com/api/paystack/webhook
        </code>
        <p className="mt-2 text-xs text-ink-muted">
          Deliveries are verified with your Paystack secret key, and repeated
          deliveries are safe.
        </p>
      </Panel>
    </>
  );
}
