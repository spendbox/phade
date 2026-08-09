"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Lock,
  Mail,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { HelpSheet } from "@/components/shop/help-sheet";
import { Sheet } from "@/components/shop/sheet";
import { cn } from "@/lib/cn";
import { formatNairaShort } from "@/lib/format";
import {
  etaForZone,
  formatEta,
  lagosIsZoned,
  type ShippingSettings,
} from "@/lib/shipping";
import type { SupportDetails } from "@/lib/storefront";

/**
 * The three promises at the foot of every page — and what is behind them.
 *
 * They used to be paragraphs, which is the wrong shape for the questions they
 * answer. "Delivered nationwide" is really "what will it cost to send this to
 * me, and when will it come?", and that is a table, not a sentence. So each
 * one is a button that opens the answer.
 *
 * Being a button has to be visible before it is pressed, or it is a paragraph
 * that happens to react: each carries a chevron, lifts on hover, and presses
 * in under a finger.
 */
export function Assurances({
  shipping,
  support,
  deliveryLine,
}: {
  shipping: ShippingSettings;
  support: SupportDetails;
  /** The one-line summary, worked out from the same rules checkout uses. */
  deliveryLine: string;
}) {
  const [open, setOpen] = useState<"delivery" | "payment" | "help" | null>(null);

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-3">
        <Card
          icon={<Truck className="size-4" aria-hidden />}
          title="Delivered nationwide"
          body={deliveryLine}
          onOpen={() => setOpen("delivery")}
        />
        <Card
          icon={<ShieldCheck className="size-4" aria-hidden />}
          title="Paid securely"
          body="Card, transfer and USSD through Paystack. We never see your card."
          onOpen={() => setOpen("payment")}
        />
        <Card
          icon={<Mail className="size-4" aria-hidden />}
          title="Here to help"
          body="Questions about sizing or an order? Message us and we'll answer."
          onOpen={() => setOpen("help")}
        />
      </ul>

      <Panel
        open={open === "delivery"}
        onClose={() => setOpen(null)}
        label="Delivery"
      >
        <Delivery shipping={shipping} />
      </Panel>

      <Panel
        open={open === "payment"}
        onClose={() => setOpen(null)}
        label="How payment works"
      >
        <Payment />
      </Panel>

      <HelpSheet
        open={open === "help"}
        onClose={() => setOpen(null)}
        support={support}
      />
    </>
  );
}

function Card({
  icon,
  title,
  body,
  onOpen,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-start gap-3 rounded-2xl bg-canvas p-4 text-left ring-1 ring-inset ring-line transition hover:-translate-y-0.5 hover:shadow-md hover:ring-line-strong active:translate-y-0 active:scale-[0.99]"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="mt-1 block text-sm text-ink-secondary">{body}</span>
        </span>

        <ChevronRight
          className="mt-0.5 size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>
    </li>
  );
}

/** The pop-up itself: the shop's own sheet, so it drags away like every other. */
function Panel({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={label}
      side="center"
      className="max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-canvas sm:max-w-md sm:rounded-3xl"
    >
      <div className="p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-6">
        {children}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// What it costs, and when it comes
// ---------------------------------------------------------------------------

function Delivery({ shipping }: { shipping: ShippingSettings }) {
  const free = shipping.freeOverKobo > 0;

  return (
    <div className="stagger space-y-4">
      <div>
        <Title icon={<Truck className="size-4" aria-hidden />}>
          Delivered nationwide
        </Title>

        {/* A parcel making its way along the line, leaving a trail of road
            behind it. It is the one picture that says "on its way" without a
            word of copy. */}
        <div className="relative mt-4 h-8 overflow-hidden rounded-full bg-canvas-deep">
          <span className="van-road absolute inset-y-0 left-0 rounded-full bg-brand-soft" />
          <span className="van-track absolute top-1 flex size-6 items-center justify-center rounded-full bg-noir text-white shadow-md">
            <Package className="size-3.5" aria-hidden />
          </span>
        </div>

        <p className="mt-3 text-sm text-ink-secondary">
          Most orders reach Lagos {formatEta(shipping.lagosEta).toLowerCase()},
          and the rest of Nigeria in{" "}
          {formatEta(shipping.eta).toLowerCase().replace(/^within /, "")}.
        </p>
      </div>

      {free && (
        <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
          Free delivery on orders over{" "}
          {formatNairaShort(shipping.freeOverKobo)}.
        </p>
      )}

      <dl className="overflow-hidden rounded-2xl ring-1 ring-inset ring-line">
        {shipping.zones.map((zone) => (
          <Row
            key={zone.id}
            name={zone.name}
            note={formatEta(etaForZone(shipping, zone))}
            value={
              zone.feeKobo === 0 ? "Free" : formatNairaShort(zone.feeKobo)
            }
          />
        ))}

        {/* Lagos always gets a line of its own, unless a zone already speaks
            for it — it is where most of these parcels go and it is the one
            place with a different answer. */}
        {!lagosIsZoned(shipping) && (
          <Row
            name="Within Lagos"
            note={formatEta(shipping.lagosEta)}
            value={
              shipping.defaultFeeKobo === 0
                ? "Free"
                : formatNairaShort(shipping.defaultFeeKobo)
            }
          />
        )}

        <Row
          name="Everywhere else in Nigeria"
          note={formatEta(shipping.eta)}
          value={
            shipping.defaultFeeKobo === 0
              ? "Free"
              : formatNairaShort(shipping.defaultFeeKobo)
          }
        />
      </dl>

      {shipping.pickupEnabled && (
        <p className="text-sm text-ink-secondary">
          Or collect it from us, free, at checkout
          {shipping.pickupLocations.length > 1
            ? ` — ${shipping.pickupLocations.length} places to choose from.`
            : "."}
        </p>
      )}

      <p className="text-xs text-ink-muted">
        The exact charge is worked out at checkout, from where it&apos;s going.
      </p>
    </div>
  );
}

function Row({
  name,
  note,
  value,
}: {
  name: string;
  note: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <dt className="min-w-0">
        <span className="block truncate text-sm text-ink">{name}</span>
        <span className="block text-xs text-ink-muted">{note}</span>
      </dt>
      <dd className="shrink-0 text-sm font-semibold tabular-nums text-ink">
        {value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// How money changes hands
// ---------------------------------------------------------------------------

const CHANNELS = [
  { name: "Card", note: "Verve, Mastercard, Visa" },
  { name: "Bank transfer", note: "A one-off account for your order" },
  { name: "USSD", note: "From any phone, no app needed" },
];

function Payment() {
  return (
    <div className="stagger space-y-4">
      <div>
        <Title icon={<ShieldCheck className="size-4" aria-hidden />}>
          Paid securely
        </Title>

        {/* Not a photograph of a card — a drawing of one, catching the light
            the way a real one does when you turn it over. */}
        <div className="pay-card mt-4 aspect-[1.6] w-full max-w-[17rem] rounded-2xl bg-gradient-to-br from-noir via-[#241d24] to-brand p-4 text-white shadow-xl">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="h-6 w-9 rounded-md bg-gradient-to-br from-[#e9d8a6] to-[#c9a227]" />
              <Lock className="size-4 opacity-70" aria-hidden />
            </div>
            <div>
              <p className="font-mono text-sm tracking-[0.18em] opacity-90">
                •••• •••• •••• ••••
              </p>
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.18em] opacity-60">
                Secured by Paystack
              </p>
            </div>
          </div>
        </div>
      </div>

      <ul className="overflow-hidden rounded-2xl ring-1 ring-inset ring-line">
        {CHANNELS.map((channel) => (
          <li
            key={channel.name}
            className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
          >
            <Check className="size-4 shrink-0 text-brand" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm text-ink">{channel.name}</span>
              <span className="block text-xs text-ink-muted">
                {channel.note}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-sm text-ink-secondary">
        Payment happens on Paystack, not here. Your card number never touches
        this shop — we&apos;re told the money arrived, and nothing else.
      </p>

      <a
        href="https://paystack.com"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        About Paystack
        <ArrowUpRight className="size-3.5" aria-hidden />
      </a>
    </div>
  );
}

function Title({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h2 className={cn("flex items-center gap-2 text-base font-semibold text-ink")}>
      <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand">
        {icon}
      </span>
      {children}
    </h2>
  );
}
