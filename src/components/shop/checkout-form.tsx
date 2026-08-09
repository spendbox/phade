"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Lock,
  MapPin,
  Plus,
  ShoppingBag,
  Store,
  Truck,
  X,
} from "lucide-react";

import {
  placeOrder,
  tryCoupon,
  type CheckoutState,
} from "@/app/(shop)/checkout/actions";
import { Media } from "@/components/shop/media";
import { SearchSelect } from "@/components/shop/search-select";
import { useShop } from "@/components/shop/shop-provider";
import { usePersistent } from "@/lib/browser-store";
import {
  DEFAULT_DIAL,
  DIAL_CODES,
  digitCount,
  splitDial,
} from "@/lib/dial-codes";
import { cn } from "@/lib/cn";
import { formatNairaShort } from "@/lib/format";
import { lineKey } from "@/lib/shop";
import {
  detailsFrom,
  detailsStore,
  hasDetails,
  NO_DETAILS,
  safeDetails,
} from "@/lib/shopper-details";
import {
  AREA_STATE,
  cheapestFee,
  LAGOS_AREAS,
  NIGERIAN_STATES,
  quoteDelivery,
  type ShippingSettings,
} from "@/lib/shipping";

const initial: CheckoutState = { ok: null };

/**
 * Checkout.
 *
 * One screen, asked one step at a time, in the order a person actually answers
 * the questions: how it reaches them, who they are, where it goes, then pay.
 * The bag travels as ids and quantities only — the server prices it — so
 * nothing here is worth tampering with.
 *
 * The bag is deliberately not emptied on submit. Payment can be abandoned, and
 * a shopper who comes back to try again should find their bag as they left it;
 * the order page clears it once the money has actually arrived.
 */
export function CheckoutForm({ shipping }: { shipping: ShippingSettings }) {
  const { bag, ready } = useShop();

  if (!ready) return <div className="min-h-[50dvh]" aria-hidden />;

  if (bag.length === 0) {
    return (
      <div className="mx-auto max-w-sm px-6 py-20 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-canvas-deep text-ink-muted">
          <ShoppingBag className="size-6" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-ink">
          There&apos;s nothing to check out
        </h2>
        <p className="mt-2 text-sm text-ink-secondary">
          Add something to your bag and it will be waiting here.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-noir px-6 text-sm font-medium text-white transition hover:bg-brand"
        >
          Back to the shop
        </Link>
      </div>
    );
  }

  // Mounted only once the browser's own state is readable, so the fields can
  // be uncontrolled and still open with what was typed last time.
  return <CheckoutFields shipping={shipping} />;
}

type StepKey = "how" | "who" | "where" | "note";

type Phone = { dial: string; number: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fullNumber(phone: Phone): string {
  return `${phone.dial} ${phone.number.trim()}`.trim();
}

/**
 * The checkout, as a short conversation rather than a wall of boxes.
 *
 * Everything asked here was always asked; the difference is that it is asked
 * one question at a time. A checkout that opens with fourteen fields is a
 * checkout a shopper closes — and on a phone the whole form is three screens
 * of scrolling before the first answer is typed. So each step opens when the
 * one before it is answered, and folds up into a line once it is, which keeps
 * both the place they are and the answers they have already given on screen at
 * once.
 *
 * The fields are held in state rather than left to the DOM because the form
 * has to know when a step is finished. That is the whole reason; nothing else
 * about the submission changed, and what the server receives is the same set
 * of names it has always parsed.
 */
function CheckoutFields({ shipping }: { shipping: ShippingSettings }) {
  const { bag, subtotalKobo, cartToken, count, say } = useShop();
  const [state, formAction, pending] = useActionState(placeOrder, initial);

  const stored = safeDetails(usePersistent(detailsStore));

  const [fulfilment, setFulfilment] = useState<"shipping" | "pickup">(
    shipping.pickupEnabled ? stored.fulfilment : "shipping",
  );
  const [name, setName] = useState(stored.name);
  const [email, setEmail] = useState(stored.email);
  const [phones, setPhones] = useState<Phone[]>(() =>
    stored.phones.length > 0
      ? stored.phones.map(splitDial)
      : [{ dial: DEFAULT_DIAL, number: "" }],
  );
  const [line1, setLine1] = useState(stored.line1);
  const [line2, setLine2] = useState(stored.line2);
  const [city, setCity] = useState(stored.city);
  // The delivery charge depends on where it's going, so the state field is the
  // one input on this form that changes the total as you use it.
  const [state_, setState] = useState(stored.state);
  // Lagos is asked about twice: the state, then the part of it. Getting a
  // parcel to Ikoyi is not what it costs to get one to Ikorodu.
  const [area, setArea] = useState(stored.area);
  const [note, setNote] = useState("");
  const [pickupAt, setPickupAt] = useState(
    () => shipping.pickupLocations[0]?.id ?? "",
  );

  const delivering = fulfilment === "shipping";
  const inLagos = delivering && state_ === AREA_STATE;
  const counters = shipping.pickupLocations;
  const collectingFrom = counters.find((place) => place.id === pickupAt);

  const whoDone =
    Boolean(name.trim()) &&
    EMAIL.test(email.trim()) &&
    digitCount(phones[0]?.number ?? "") >= 7;
  const whereDone =
    !delivering ||
    Boolean(line1.trim() && city.trim() && state_ && (!inLagos || area));
  // Collection with nowhere chosen is an order nobody can hand over.
  const howDone = delivering || counters.length === 0 || Boolean(collectingFrom);
  const ready = howDone && whoDone && whereDone;

  const steps: StepKey[] = delivering
    ? ["how", "who", "where", "note"]
    : ["how", "who", "note"];

  // Someone returning with their details already filled in shouldn't be walked
  // through steps they answered last time.
  const [open, setOpen] = useState<StepKey>(() =>
    !whoDone ? "who" : !whereDone ? "where" : "note",
  );
  // Choosing collection removes a step; it must not stay the open one.
  if (!steps.includes(open)) setOpen("note");

  const at = (step: StepKey) => steps.indexOf(step);
  /** A step opens once every step before it has been answered. */
  const reachable = (step: StepKey) =>
    (at(step) <= at("who") || whoDone) && (at(step) <= at("where") || whereDone);

  const answered: Record<StepKey, boolean> = {
    how: howDone,
    who: whoDone,
    where: whereDone,
    note: ready,
  };
  const settled = steps.filter((step) => answered[step]).length;

  const lines = JSON.stringify(
    bag.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      color: line.color,
      size: line.size,
    })),
  );

  const coupon = useCoupon(lines);

  const cheapest = cheapestFee(shipping);
  // Delivery is quoted on the merchandise total, before the coupon — the same
  // way the server prices it, so this figure is never a surprise.
  const quote = quoteDelivery(shipping, subtotalKobo, {
    fulfilment,
    state: state_,
    area,
  });
  const total = subtotalKobo - (coupon.applied?.amountKobo ?? 0) + quote.feeKobo;

  // Paystack is a different origin, so this is a real navigation rather than a
  // router push. Internal redirects go the same way for one code path.
  useEffect(() => {
    if (state.ok === true) window.location.assign(state.redirect);
  }, [state]);

  function forget() {
    detailsStore.set(NO_DETAILS);
    setName("");
    setEmail("");
    setPhones([{ dial: DEFAULT_DIAL, number: "" }]);
    setLine1("");
    setLine2("");
    setCity("");
    setState("");
    setOpen("who");
    say("Details forgotten on this device");
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        // Captured here rather than on success: a payment that fails should
        // still leave the shopper with their details filled in next time.
        detailsStore.set(detailsFrom(new FormData(event.currentTarget)));
      }}
      className={cn(
        "grid gap-8 px-4 pb-10 pt-4 sm:px-6 lg:gap-12 lg:px-8",
        // The order and the way to pay for it arrive together, at the end. A
        // summary pinned beside a half-answered form is a total that keeps
        // moving under a shopper still trying to type their address, and a Pay
        // button that has been sitting there greyed out since the first field.
        ready
          ? "lg:grid-cols-[minmax(0,1fr)_22rem]"
          : "mx-auto w-full max-w-2xl",
      )}
    >
      {/* Every answer, whether or not its step is open.
          A folded-up step is not rendered — that is what makes the form short —
          so the inputs a shopper typed into are gone by the time they press
          Pay. These carry the answers instead, which also means the visible
          fields are free to be nothing but fields. */}
      <input type="hidden" name="cart_token" value={cartToken} />
      <input type="hidden" name="lines" value={lines} />
      <input type="hidden" name="fulfilment" value={fulfilment} />
      <input type="hidden" name="name" value={name.trim()} />
      <input type="hidden" name="email" value={email.trim()} />
      <input type="hidden" name="note" value={note.trim()} />
      {delivering && (
        <>
          <input type="hidden" name="line1" value={line1.trim()} />
          <input type="hidden" name="line2" value={line2.trim()} />
          <input type="hidden" name="city" value={city.trim()} />
          <input type="hidden" name="state" value={state_} />
          {inLagos && <input type="hidden" name="area" value={area} />}
        </>
      )}
      {!delivering && collectingFrom && (
        <input type="hidden" name="pickup_location" value={collectingFrom.id} />
      )}
      {coupon.applied && (
        <input type="hidden" name="coupon" value={coupon.applied.code} />
      )}
      {/* The first number is the one to ring; the rest travel with the order
          so nobody is undeliverable because one line was busy. */}
      <input type="hidden" name="phone" value={fullNumber(phones[0])} />
      {phones
        .filter((phone) => digitCount(phone.number) >= 7)
        .map((phone, index) => (
          <input
            key={`${phone.dial}-${index}`}
            type="hidden"
            name="phones"
            value={fullNumber(phone)}
          />
        ))}

      <div className="space-y-3">
        <Progress
          settled={settled}
          total={steps.length}
          ready={ready}
          next={
            !howDone
              ? "How would you like it?"
              : !whoDone
                ? "Who is it for?"
                : !whereDone
                  ? "Where is it going?"
                  : "Anything we should know?"
          }
        />

        <Step
          step={1}
          title="How would you like it?"
          summary={
            delivering
              ? [
                  state_
                    ? `Delivered to ${[area, state_].filter(Boolean).join(", ")}`
                    : "Delivered — anywhere in Nigeria",
                  quote.free
                    ? "Free on this order"
                    : state_
                      ? `${formatNairaShort(quote.feeKobo)} delivery`
                      : `From ${formatNairaShort(cheapest)}`,
                ]
              : collectingFrom
                ? [`Collect from ${collectingFrom.name}`, collectingFrom.address]
                : ["Collected from us"]
          }
          open={open === "how"}
          done={howDone}
          onOpen={() => setOpen("how")}
          onNext={() => setOpen(whoDone && !delivering ? "note" : "who")}
          nextDisabled={!howDone}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              name="fulfilment_choice"
              value="shipping"
              checked={delivering}
              onChange={() => setFulfilment("shipping")}
              icon={<Truck className="size-4" aria-hidden />}
              title="Delivered"
              note={
                !delivering
                  ? "Anywhere in Nigeria"
                  : quote.free
                    ? "Free on this order"
                    : state_
                      ? `${formatNairaShort(quote.feeKobo)} to ${state_}`
                      : `From ${formatNairaShort(cheapest)} — pick a state below`
              }
            />
            {shipping.pickupEnabled && (
              <Choice
                name="fulfilment_choice"
                value="pickup"
                checked={!delivering}
                onChange={() => setFulfilment("pickup")}
                icon={<Store className="size-4" aria-hidden />}
                title="Picked up"
                note={
                  counters.length > 1
                    ? `Free · ${counters.length} places`
                    : "Free"
                }
              />
            )}
          </div>

          {/* Where to come, chosen rather than described: the address travels
              on the order, so the confirmation says where to go. */}
          {!delivering && counters.length > 0 && (
            <fieldset className="mt-4">
              <legend className="text-[13px] font-medium text-ink-secondary">
                Collect from
              </legend>
              <ul className="mt-2 space-y-2">
                {counters.map((place) => {
                  const chosen = place.id === pickupAt;
                  return (
                    <li key={place.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-2xl p-3.5 transition",
                          chosen
                            ? "bg-canvas ring-2 ring-noir"
                            : "bg-canvas-deep/60 ring-1 ring-inset ring-line hover:ring-line-strong",
                        )}
                      >
                        <input
                          type="radio"
                          name="pickup_choice"
                          value={place.id}
                          checked={chosen}
                          onChange={() => setPickupAt(place.id)}
                          className="sr-only"
                        />
                        <MapPin
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            chosen ? "text-brand" : "text-ink-muted",
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-ink">
                            {place.name}
                          </span>
                          <span className="block text-xs text-ink-secondary">
                            {place.address}
                          </span>
                          {place.note && (
                            <span className="mt-0.5 block text-xs text-ink-muted">
                              {place.note}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )}
        </Step>

        <Step
          step={2}
          title="Who is it for?"
          summary={[
            name,
            email,
            phones
              .filter((phone) => digitCount(phone.number) >= 7)
              .map(fullNumber)
              .join(" · "),
          ]}
          open={open === "who"}
          done={whoDone}
          locked={!reachable("who")}
          onOpen={() => setOpen("who")}
          onNext={() => setOpen(delivering ? "where" : "note")}
          nextDisabled={!whoDone}
        >
          <div className="space-y-4">
            {hasDetails(stored) && (
              <p className="text-xs text-ink-muted">
                Filled in from last time ·{" "}
                <button
                  type="button"
                  onClick={forget}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Forget them
                </button>
              </p>
            )}

            <Text
              field="name"
              label="Full name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <Text
              field="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              hint="Your receipt and updates go here."
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <PhoneFields phones={phones} onChange={setPhones} />
          </div>
        </Step>

        {delivering && (
          <Step
            step={3}
            title="Where is it going?"
            summary={[
              line1,
              line2,
              [city, state_].filter(Boolean).join(", "),
              inLagos ? area : "",
            ]}
            open={open === "where"}
            done={whereDone}
            locked={!reachable("where")}
            onOpen={() => setOpen("where")}
            onNext={() => setOpen("note")}
            nextDisabled={!whereDone}
          >
            <div className="space-y-4">
              <Text
                field="line1"
                label="Street address"
                autoComplete="address-line1"
                required
                value={line1}
                onChange={(event) => setLine1(event.target.value)}
              />
              <Text
                field="line2"
                label="Apartment, floor, landmark"
                autoComplete="address-line2"
                value={line2}
                onChange={(event) => setLine2(event.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Text
                  field="city"
                  label="City"
                  autoComplete="address-level2"
                  required
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
                <div>
                  <label
                    htmlFor="state"
                    className="block text-[13px] font-medium text-ink-secondary"
                  >
                    State<span className="ml-0.5 text-critical">*</span>
                  </label>
                  <div className="mt-1.5">
                    <SearchSelect
                      id="state"
                      options={[...NIGERIAN_STATES]}
                      value={state_}
                      onChange={setState}
                      placeholder="Start typing — Lagos, Kano…"
                      emptyLabel="No state by that name"
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    Delivery is priced from here.
                  </p>
                </div>
              </div>

              {inLagos && (
                <div>
                  <label
                    htmlFor="area"
                    className="block text-[13px] font-medium text-ink-secondary"
                  >
                    Part of Lagos<span className="ml-0.5 text-critical">*</span>
                  </label>
                  <div className="mt-1.5">
                    <SearchSelect
                      id="area"
                      options={[...LAGOS_AREAS]}
                      value={area}
                      onChange={setArea}
                      placeholder="Ikeja, Lekki, Yaba…"
                      emptyLabel="No area by that name"
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    Lagos is an hour across. This is what the rider is given.
                  </p>
                </div>
              )}
            </div>
          </Step>
        )}

        <Step
          step={delivering ? 4 : 3}
          title="Anything we should know?"
          summary={[note.trim() || "Nothing to add"]}
          open={open === "note"}
          done={ready}
          locked={!reachable("note")}
          onOpen={() => setOpen("note")}
          last
        >
          <textarea
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Delivery instructions, a gift note, a preferred day…"
            className="w-full rounded-2xl bg-canvas-deep px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </Step>
      </div>

      {/* Nothing to price until we know where it's going, and nothing to pay
          with until then either. */}
      <aside
        className={cn("lg:sticky lg:top-24 lg:self-start", !ready && "hidden")}
      >
        <div className="rise rounded-3xl bg-canvas-deep/60 p-5">
          <h2 className="text-sm font-semibold text-ink">
            Your order
            <span className="ml-1.5 font-normal text-ink-muted tabular-nums">
              ({count})
            </span>
          </h2>

          <ul className="mt-4 space-y-3">
            {bag.map((line) => (
              <li key={lineKey(line)} className="flex gap-3">
                <Media
                  url={line.image}
                  alt=""
                  className="size-14 shrink-0 rounded-xl bg-canvas"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {line.name}
                  </p>
                  <p className="text-xs text-ink-secondary">
                    {[
                      line.color,
                      line.size ? `UK ${line.size}` : null,
                      `×${line.quantity}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <p className="text-[13px] font-semibold text-ink tabular-nums">
                  {formatNairaShort(line.priceKobo * line.quantity)}
                </p>
              </li>
            ))}
          </ul>

          <CouponField coupon={coupon} />

          <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-secondary">Subtotal</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatNairaShort(subtotalKobo)}
              </dd>
            </div>
            {coupon.applied && (
              <div className="flex justify-between gap-3">
                <dt className="min-w-0 truncate text-ink-secondary">
                  {coupon.applied.name}
                  <span className="text-ink-muted"> · {coupon.applied.code}</span>
                </dt>
                <dd className="shrink-0 font-medium text-good-text tabular-nums">
                  −{formatNairaShort(coupon.applied.amountKobo)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="min-w-0 text-ink-secondary">
                {!delivering
                  ? "Pickup"
                  : area || state_
                    ? `Delivery · ${area || state_}`
                    : "Delivery"}
              </dt>
              <dd className="shrink-0 font-medium text-ink tabular-nums">
                {delivering && !state_
                  ? `from ${formatNairaShort(cheapest)}`
                  : quote.free
                    ? "Free"
                    : formatNairaShort(quote.feeKobo)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="font-semibold text-ink tabular-nums">
                {formatNairaShort(total)}
              </dd>
            </div>
          </dl>

          {!delivering && collectingFrom && (
            <p className="mt-4 rounded-xl bg-canvas px-3 py-2.5 text-[13px] text-ink-secondary">
              <span className="font-medium text-ink">
                {collectingFrom.name}
              </span>
              <br />
              {collectingFrom.address}
            </p>
          )}

          {!delivering && shipping.pickupNote && (
            <p className="mt-4 rounded-xl bg-canvas px-3 py-2.5 text-[13px] text-ink-secondary">
              {shipping.pickupNote}
            </p>
          )}

          {quote.toFreeKobo !== null && quote.toFreeKobo > 0 && (
            <p className="mt-4 rounded-xl bg-brand-soft px-3 py-2.5 text-[13px] text-brand">
              {formatNairaShort(quote.toFreeKobo)} more and delivery is free.
            </p>
          )}

          {state.ok === false && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-critical-soft px-3 py-2.5 text-[13px] text-critical"
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || state.ok === true}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-noir text-sm font-semibold text-white transition hover:bg-brand disabled:opacity-60"
          >
            {pending || state.ok === true ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Lock className="size-4" aria-hidden />
            )}
            {pending || state.ok === true
              ? "Taking you to payment…"
              : `Pay ${formatNairaShort(total)}`}
          </button>

          <p className="mt-3 text-center text-xs text-ink-muted">
            Card, bank transfer and USSD, handled by Paystack. We never see your
            card details. Your name and address stay on this device so the next
            checkout is quicker.
          </p>
        </div>
      </aside>
    </form>
  );
}

/**
 * How far through this is, without having to count the boxes.
 *
 * A form that reveals itself one question at a time is kinder to answer and
 * worse to estimate — a shopper cannot see how much is left, and a checkout
 * whose end is out of sight is a checkout people abandon. So the bar says so,
 * and names what is being asked right now.
 */
function Progress({
  settled,
  total,
  next,
  ready,
}: {
  settled: number;
  total: number;
  next: string;
  ready: boolean;
}) {
  return (
    <div className="px-1 pb-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-medium text-ink">
          {ready ? "Everything we need — you can pay below." : next}
        </p>
        <p className="shrink-0 text-xs tabular-nums text-ink-muted">
          {settled} of {total}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={settled}
        aria-label="Checkout progress"
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas-deep"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            ready ? "bg-brand" : "bg-noir",
          )}
          style={{ width: `${Math.round((settled / total) * 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * One step of the conversation.
 *
 * Answered and closed, it becomes a card of what was said — the whole answer,
 * not a truncated line — and pressing anywhere on it opens it again. That is
 * the part that makes a folded form trustworthy: a shopper can see that the
 * address really did save before they pay for it to be used.
 *
 * Unreachable, it is a heading and nothing else — visible, so a shopper knows
 * how much is left, but not open for business until its turn.
 */
function Step({
  step,
  title,
  summary = [],
  open,
  done,
  locked = false,
  last = false,
  onOpen,
  onNext,
  nextDisabled = false,
  children,
}: {
  step: number;
  title: string;
  /** What was answered, a line at a time. Blank entries are left out. */
  summary?: string[];
  open: boolean;
  done: boolean;
  locked?: boolean;
  last?: boolean;
  onOpen: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  children: React.ReactNode;
}) {
  const lines = summary.filter(Boolean);

  const badge = (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
        done && !open
          ? "bg-noir text-white"
          : open
            ? "bg-brand text-white"
            : "bg-canvas-deep text-ink-muted",
      )}
      aria-hidden
    >
      {done && !open ? <Check className="size-4" /> : step}
    </span>
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        disabled={locked}
        className={cn(
          "flex w-full gap-3 rounded-3xl p-4 text-left transition",
          done
            ? "bg-canvas-deep/50 hover:bg-canvas-deep"
            : "ring-1 ring-inset ring-line hover:ring-line-strong",
          locked && "pointer-events-none opacity-45",
        )}
      >
        {badge}

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
              {title}
            </span>
            {!locked && (
              <span className="shrink-0 text-xs font-medium text-ink-secondary underline underline-offset-4">
                {done ? "Edit" : "Open"}
              </span>
            )}
          </span>

          {done && lines.length > 0 && (
            <span className="mt-1.5 block space-y-0.5">
              {lines.map((line) => (
                <span
                  key={line}
                  className="block truncate text-[13px] text-ink-secondary"
                >
                  {line}
                </span>
              ))}
            </span>
          )}
        </span>
      </button>
    );
  }

  return (
    <section className="rounded-3xl bg-canvas-deep/40 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        {badge}
        <h2 className="min-w-0 flex-1 text-sm font-semibold text-ink">
          {title}
        </h2>
      </div>

      <div className="mt-4">
        {children}

        {!last && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="mt-5 flex h-11 items-center justify-center rounded-full bg-noir px-6 text-sm font-semibold text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * Phone numbers: the code, the number, and room for a second one.
 *
 * A dialling code rather than a free-text box, because "0801…", "234 801…"
 * and "+234 801…" are the same line written three ways and only one of them
 * can be rung from abroad. Nigeria is chosen already, since that is where the
 * parcels go.
 *
 * More than one number is not a nicety here: a courier who cannot get through
 * on the first line is a parcel that goes back to the depot.
 */
function PhoneFields({
  phones,
  onChange,
}: {
  phones: Phone[];
  onChange: (next: Phone[]) => void;
}) {
  function set(index: number, patch: Partial<Phone>) {
    onChange(
      phones.map((phone, at) => (at === index ? { ...phone, ...patch } : phone)),
    );
  }

  return (
    <div>
      <span className="block text-[13px] font-medium text-ink-secondary">
        Phone<span className="ml-0.5 text-critical">*</span>
      </span>

      <ul className="mt-1.5 space-y-2">
        {phones.map((phone, index) => (
          <li key={index} className="flex gap-2">
            <label className="sr-only" htmlFor={`dial-${index}`}>
              Country code
            </label>
            <select
              id={`dial-${index}`}
              value={phone.dial}
              onChange={(event) => set(index, { dial: event.target.value })}
              className="h-12 w-[7.5rem] shrink-0 rounded-2xl bg-canvas-deep px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {DIAL_CODES.map((country) => (
                <option key={country.iso} value={country.dial}>
                  {country.flag} {country.dial}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor={`phone-${index}`}>
              {index === 0 ? "Phone number" : `Phone number ${index + 1}`}
            </label>
            <input
              id={`phone-${index}`}
              type="tel"
              inputMode="tel"
              autoComplete={index === 0 ? "tel-national" : "off"}
              value={phone.number}
              onChange={(event) => set(index, { number: event.target.value })}
              placeholder="801 234 5678"
              className="h-12 min-w-0 flex-1 rounded-2xl bg-canvas-deep px-4 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
            />

            {phones.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  onChange(phones.filter((_, at) => at !== index))
                }
                aria-label={`Remove phone number ${index + 1}`}
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-ink-muted transition hover:bg-canvas-deep hover:text-critical"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      {phones.length < 3 && (
        <button
          type="button"
          onClick={() => onChange([...phones, { dial: DEFAULT_DIAL, number: "" }])}
          className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary transition hover:text-ink"
        >
          <Plus className="size-3.5" aria-hidden />
          Add another number
        </button>
      )}

      <p className="mt-1.5 text-xs text-ink-muted">
        The first one is the number the courier rings.
      </p>
    </div>
  );
}

type Applied = { code: string; name: string; amountKobo: number };

type Coupon = ReturnType<typeof useCoupon>;

/**
 * A coupon code, checked by the shop rather than by the browser.
 *
 * The code alone is state; what it is worth is always the server's answer to
 * this exact bag. So it is re-checked whenever the bag changes — a shopper who
 * opens the drawer and drops a dress that the code depended on is told, rather
 * than finding out at the payment page that the total moved.
 */
function useCoupon(lines: string) {
  // Every press of Apply is its own attempt, timestamp and all, so retyping a
  // code that failed a moment ago actually asks again.
  const [attempt, setAttempt] = useState<{ code: string; at: number } | null>(
    null,
  );
  const [applied, setApplied] = useState<Applied | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!attempt) return;

    let cancelled = false;

    void tryCoupon({ code: attempt.code, lines })
      .then((result) => {
        if (cancelled) return;
        setApplied(result.ok ? result : null);
        setError(result.ok ? null : result.error);
      })
      .catch(() => {
        if (cancelled) return;
        setApplied(null);
        setError("We couldn't check that code just now.");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, lines]);

  return {
    applied,
    error,
    checking,
    apply(raw: string) {
      const code = raw.trim().toUpperCase();
      if (!code) {
        setError("Type a code first.");
        return;
      }
      setAttempt({ code, at: Date.now() });
      setError(null);
      setChecking(true);
    },
    clear() {
      setAttempt(null);
      setApplied(null);
      setError(null);
      setChecking(false);
    },
  };
}

/** Where a code from a sale gets typed in. */
function CouponField({ coupon }: { coupon: Coupon }) {
  const field = useRef<HTMLInputElement>(null);
  const { applied, error, checking } = coupon;

  if (applied) {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-brand-soft px-3 py-2.5">
        <p className="min-w-0 flex-1 text-[13px] text-brand">
          <span className="font-semibold">{applied.code}</span> applied ·{" "}
          {formatNairaShort(applied.amountKobo)} off
        </p>
        <button
          type="button"
          onClick={coupon.clear}
          aria-label={`Remove coupon ${applied.code}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-brand transition hover:bg-canvas"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  const send = () => coupon.apply(field.current?.value ?? "");

  return (
    <div className="mt-5">
      <label
        htmlFor="coupon"
        className="block text-[13px] font-medium text-ink-secondary"
      >
        Coupon code
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="coupon"
          ref={field}
          name="coupon_input"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="From a sale or a post"
          // Enter inside a form submits it, and this field is a guest in the
          // checkout form — so Enter applies the code instead of paying.
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            send();
          }}
          className="h-11 min-w-0 flex-1 rounded-2xl bg-canvas-deep px-4 text-sm uppercase tracking-wide text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button
          type="button"
          onClick={send}
          disabled={checking}
          className="h-11 shrink-0 rounded-full px-4 text-sm font-medium text-ink ring-1 ring-inset ring-line-strong transition hover:bg-canvas-deep disabled:opacity-60"
        >
          {checking ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            "Apply"
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

function Choice({
  name,
  value,
  checked,
  onChange,
  icon,
  title,
  note,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  title: string;
  note: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl p-4 transition",
        checked
          ? "bg-canvas ring-2 ring-noir"
          : "bg-canvas-deep/60 ring-1 ring-inset ring-line hover:ring-line-strong",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          checked ? "bg-noir text-white" : "bg-canvas text-ink-secondary",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-xs text-ink-secondary">{note}</span>
      </span>
    </label>
  );
}

function Text({
  field,
  label,
  hint,
  ...props
}: React.ComponentPropsWithoutRef<"input"> & {
  /** Names the label's target. Not a form name — see the hidden inputs. */
  field: string;
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={field}
        className="block text-[13px] font-medium text-ink-secondary"
      >
        {label}
        {props.required && <span className="ml-0.5 text-critical">*</span>}
      </label>
      <input
        id={field}
        className="mt-1.5 h-12 w-full rounded-2xl bg-canvas-deep px-4 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
        {...props}
      />
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
