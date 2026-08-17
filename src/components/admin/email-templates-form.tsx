"use client";

import { useActionState, useState } from "react";
import { Loader2, Send } from "lucide-react";

import {
  saveEmailTemplates,
  sendTestEmail,
  type EmailTemplatesFormState,
  type TestEmailState,
} from "@/app/admin/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  EMAIL_TOKENS,
  type EmailTemplate,
  type EmailTemplates,
} from "@/lib/email-templates";

/**
 * The words in the order emails, edited where the keys that send them are
 * explained.
 *
 * The shop writes copy, never markup: four plain fields per message, and the
 * order itself — the items, the totals, the address, the button — is drawn by
 * the sender. So a shop can rewrite every sentence and still cannot produce a
 * receipt that arrives looking broken.
 */

const initialSave: EmailTemplatesFormState = { ok: null };
const initialTest: TestEmailState = { ok: null };

function TemplateFields({
  prefix,
  template,
  subjectHint,
}: {
  prefix: "customer" | "shop";
  template: EmailTemplate;
  subjectHint: string;
}) {
  return (
    <div className="space-y-4">
      <Field
        label="Subject"
        htmlFor={`${prefix}_subject`}
        hint={subjectHint}
      >
        <Input
          id={`${prefix}_subject`}
          name={`${prefix}_subject`}
          defaultValue={template.subject}
          maxLength={160}
        />
      </Field>

      <Field label="Heading" htmlFor={`${prefix}_heading`}>
        <Input
          id={`${prefix}_heading`}
          name={`${prefix}_heading`}
          defaultValue={template.heading}
          maxLength={120}
        />
      </Field>

      <Field
        label="Above the order"
        htmlFor={`${prefix}_intro`}
        hint="The paragraph between the heading and the items."
      >
        <Textarea
          id={`${prefix}_intro`}
          name={`${prefix}_intro`}
          rows={3}
          defaultValue={template.intro}
          maxLength={600}
        />
      </Field>

      <Field
        label="Below the order"
        htmlFor={`${prefix}_outro`}
        hint="The sign-off, under the total. Leave empty for none."
      >
        <Textarea
          id={`${prefix}_outro`}
          name={`${prefix}_outro`}
          rows={3}
          defaultValue={template.outro}
          maxLength={600}
        />
      </Field>
    </div>
  );
}

export function EmailTemplatesForm({
  templates,
  supportEmail,
  canSend,
}: {
  templates: EmailTemplates;
  /** Where the shop's copy goes when no override is set. */
  supportEmail: string;
  /** Whether RESEND_API_KEY is actually set in this deployment. */
  canSend: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveEmailTemplates,
    initialSave,
  );
  const [testState, testAction, testing] = useActionState(
    sendTestEmail,
    initialTest,
  );
  const [which, setWhich] = useState<"customer" | "shop">("customer");

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-6">
        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="emails_enabled"
              defaultChecked={templates.enabled}
              className="mt-0.5 size-4 rounded border-line-strong text-brand focus:ring-brand"
            />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink">
                Send order emails
              </span>
              <span className="block text-xs text-ink-muted">
                A receipt to the customer and an alert to you, the moment an
                order is paid for. Turn this off and the shop goes quiet again.
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Shop name"
              htmlFor="shop_name"
              hint="What an inbox shows as the sender."
            >
              <Input
                id="shop_name"
                name="shop_name"
                defaultValue={templates.shopName}
                maxLength={60}
              />
            </Field>

            <Field
              label="Send my copy to"
              htmlFor="notify_email"
              hint={`Empty sends it to ${supportEmail}, from Settings → Storefront.`}
            >
              <Input
                id="notify_email"
                name="notify_email"
                type="email"
                placeholder={supportEmail}
                defaultValue={templates.notifyEmail}
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl bg-plane p-3">
          <p className="text-xs font-medium text-ink-secondary">
            Drop any of these into a field below
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
            {EMAIL_TOKENS.map((item) => (
              <li key={item.token} className="text-[11px] text-ink-muted">
                <code className="font-mono text-ink-secondary">
                  {item.token}
                </code>{" "}
                {item.hint}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 border-t border-line pt-5">
          <div>
            <h3 className="text-sm font-medium text-ink">
              To the customer
            </h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              Their receipt. The items, totals and a link to their order are
              added underneath whatever you write.
            </p>
          </div>
          <TemplateFields
            prefix="customer"
            template={templates.customer}
            subjectHint="What they see in their inbox before opening anything."
          />
        </div>

        <div className="space-y-4 border-t border-line pt-5">
          <div>
            <h3 className="text-sm font-medium text-ink">To you</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              The alert that a sale landed, with what to pack and where it goes.
            </p>
          </div>
          <TemplateFields
            prefix="shop"
            template={templates.shop}
            subjectHint="Keep the total and the reference here — it's what you'll scan on a phone."
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs" role="status">
            {state.ok === true && (
              <span className="text-good-text">{state.message}</span>
            )}
            {state.ok === false && (
              <span className="text-critical">{state.error}</span>
            )}
          </p>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save templates
          </Button>
        </div>
      </form>

      <form
        action={testAction}
        className="space-y-3 rounded-xl bg-plane p-4"
      >
        <input type="hidden" name="which" value={which} />

        <div>
          <p className="text-[13px] font-medium text-ink">Send yourself one</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            A sample order through the real sender, so you can check the wording
            and the sending domain before a customer does. Save first — the test
            uses what&apos;s stored, not what&apos;s on screen.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["customer", "shop"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setWhich(option)}
              aria-pressed={which === option}
              className={
                which === option
                  ? "rounded-full bg-brand px-3 py-1 text-xs font-medium text-white"
                  : "rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-secondary ring-1 ring-inset ring-line-strong hover:text-ink"
              }
            >
              {option === "customer" ? "Customer receipt" : "Your alert"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            name="test_to"
            type="email"
            placeholder="you@example.com"
            className="h-9 max-w-[16rem] flex-1"
            aria-label="Send the test to"
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="h-9"
            disabled={testing || !canSend}
          >
            {testing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send test
          </Button>
        </div>

        <p className="text-xs" role="status">
          {!canSend && (
            <span className="text-ink-muted">
              Add RESEND_API_KEY in Vercel and redeploy to send anything.
            </span>
          )}
          {canSend && testState.ok === true && (
            <span className="text-good-text">{testState.message}</span>
          )}
          {canSend && testState.ok === false && (
            <span className="text-critical">{testState.error}</span>
          )}
        </p>
      </form>
    </div>
  );
}
