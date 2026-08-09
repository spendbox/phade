"use client";

import { useActionState, useState } from "react";
import { Clock, Loader2, MapPin, Plus, Trash2 } from "lucide-react";

import {
  saveShipping,
  type ShippingFormState,
} from "@/app/admin/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, MoneyInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/stat-tile";
import { cn } from "@/lib/cn";
import { formatNairaShort, koboToNairaInput, nairaToKobo } from "@/lib/format";
import {
  AREA_STATE,
  coversLagos,
  formatEta,
  LAGOS_AREAS,
  NIGERIAN_STATES,
  type DeliveryEta,
  type PickupLocation,
  type ShippingSettings,
  type ShippingZone,
} from "@/lib/shipping";

const initialState: ShippingFormState = { ok: null };

/**
 * What delivery costs, and where.
 *
 * A shop sending parcels across Nigeria doesn't have one delivery price, so
 * this is built around zones: name a group of states, give it a price, and
 * anything not named falls back to the default. Most shops will set one
 * default and stop; the ones that need six zones can have six.
 *
 * The whole thing is edited as one form and submitted as one JSON field — the
 * same shape it is stored in — so there is no half-saved state where a zone
 * exists but its states don't.
 */
export function ShippingForm({ shipping }: { shipping: ShippingSettings }) {
  const [state, formAction, pending] = useActionState(
    saveShipping,
    initialState,
  );

  const [zones, setZones] = useState<ShippingZone[]>(shipping.zones);
  const [eta, setEta] = useState<DeliveryEta>(shipping.eta);
  const [lagosEta, setLagosEta] = useState<DeliveryEta>(shipping.lagosEta);
  const [pickup, setPickup] = useState(shipping.pickupEnabled);
  const [places, setPlaces] = useState<PickupLocation[]>(
    shipping.pickupLocations,
  );

  // Only a zone that takes a whole state claims it. A zone built out of parts
  // of Lagos leaves Lagos free for the next one — which is the whole point of
  // having more than one Lagos zone.
  const claimed = new Set(
    zones
      .filter((zone) => zone.areas.length === 0)
      .flatMap((zone) => zone.states.map((name) => name.toLowerCase())),
  );
  const claimedAreas = new Set(
    zones.flatMap((zone) => zone.areas.map((name) => name.toLowerCase())),
  );

  function update(id: string, patch: Partial<ShippingZone>) {
    setZones((current) =>
      current.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)),
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="zones" value={JSON.stringify(zones)} />

      <Panel title="The two base prices">
        <div className="space-y-4">
          <p className="text-sm text-ink-secondary">
            A rider crosses Lagos in an afternoon; a parcel to Sokoto goes on a
            bus. One price for both is a loss on every Sokoto order or a Lagos
            price nobody in Lagos will pay — so the two are asked separately.
            Zones below override either of them.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Within Lagos"
              htmlFor="lagos_fee"
              hint={`Arrives "${formatEta(lagosEta).toLowerCase()}".`}
            >
              <div className="space-y-2">
                <MoneyInput
                  id="lagos_fee"
                  name="lagos_fee"
                  defaultValue={koboToNairaInput(shipping.lagosFeeKobo)}
                />
                <EtaFields value={lagosEta} onChange={setLagosEta} />
              </div>
            </Field>

            <Field
              label="Outside Lagos"
              htmlFor="default_fee"
              hint={`Arrives "${formatEta(eta).toLowerCase()}". What a state with no zone of its own costs.`}
            >
              <div className="space-y-2">
                <MoneyInput
                  id="default_fee"
                  name="default_fee"
                  defaultValue={koboToNairaInput(shipping.defaultFeeKobo)}
                />
                <EtaFields value={eta} onChange={setEta} />
              </div>
            </Field>
          </div>

          <Field
            label="Free delivery over"
            htmlFor="free_over"
            hint="Spend this much and delivery is free, wherever it's going. Set 0 to always charge."
          >
            <MoneyInput
              id="free_over"
              name="free_over"
              defaultValue={koboToNairaInput(shipping.freeOverKobo)}
            />
          </Field>
          <input type="hidden" name="eta" value={JSON.stringify(eta)} />
          <input
            type="hidden"
            name="lagos_eta"
            value={JSON.stringify(lagosEta)}
          />
        </div>
      </Panel>

      <Panel
        title="Zones"
        action={
          <button
            type="button"
            onClick={() =>
              setZones((current) => [
                ...current,
                {
                  id: `zone_${Date.now()}`,
                  name: "",
                  states: [],
                  areas: [],
                  feeKobo: shipping.defaultFeeKobo,
                  eta: null,
                  freeOverKobo: null,
                },
              ])
            }
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark"
          >
            <Plus className="size-3.5" />
            Add a zone
          </button>
        }
      >
        {zones.length === 0 ? (
          <p className="rounded-lg bg-plane px-3 py-6 text-center text-sm text-ink-muted">
            No zones. Everywhere is charged the default above — which is all a
            lot of shops ever need.
          </p>
        ) : (
          <ul className="space-y-4">
            {zones.map((zone) => (
              <li key={zone.id} className="rounded-xl bg-plane p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_9rem]">
                    <Field label="Zone name" htmlFor={`name-${zone.id}`}>
                      <Input
                        id={`name-${zone.id}`}
                        value={zone.name}
                        onChange={(event) =>
                          update(zone.id, { name: event.target.value })
                        }
                        placeholder="South West"
                      />
                    </Field>

                    <Field label="Charge" htmlFor={`fee-${zone.id}`}>
                      <MoneyInput
                        id={`fee-${zone.id}`}
                        value={koboToNairaInput(zone.feeKobo)}
                        onChange={(event) =>
                          update(zone.id, {
                            feeKobo: nairaToKobo(event.target.value),
                          })
                        }
                      />
                    </Field>

                    <Field
                      label="Free over"
                      htmlFor={`free-${zone.id}`}
                      hint="Blank uses the shop-wide figure."
                    >
                      <MoneyInput
                        id={`free-${zone.id}`}
                        value={
                          zone.freeOverKobo === null
                            ? ""
                            : koboToNairaInput(zone.freeOverKobo)
                        }
                        placeholder="—"
                        onChange={(event) =>
                          update(zone.id, {
                            freeOverKobo:
                              event.target.value === ""
                                ? null
                                : nairaToKobo(event.target.value),
                          })
                        }
                      />
                    </Field>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setZones((current) =>
                        current.filter((entry) => entry.id !== zone.id),
                      )
                    }
                    aria-label={`Remove ${zone.name || "zone"}`}
                    className="mt-6 flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-critical-soft hover:text-critical"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {/* Somewhere further away takes longer, and a shop that has
                    bothered to price it separately usually knows by how much. */}
                <div className="mt-3">
                  {zone.eta ? (
                    <Field
                      label="How long this zone takes"
                      hint={`Shoppers going here are told "${formatEta(zone.eta)}".`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <EtaFields
                          value={zone.eta}
                          onChange={(next) => update(zone.id, { eta: next })}
                        />
                        <button
                          type="button"
                          onClick={() => update(zone.id, { eta: null })}
                          className="text-xs font-medium text-ink-secondary underline underline-offset-4 hover:text-ink"
                        >
                          Use the shop-wide window
                        </button>
                      </div>
                    </Field>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        update(zone.id, {
                          eta: { ...(coversLagos(zone) ? lagosEta : eta) },
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark"
                    >
                      <Clock className="size-3.5" />
                      This zone takes longer
                    </button>
                  )}
                </div>

                <fieldset className="mt-3">
                  <legend className="flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary">
                    <MapPin className="size-3.5 text-ink-muted" />
                    States in this zone
                    <span className="text-ink-muted">
                      ({zone.states.length})
                    </span>
                  </legend>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {NIGERIAN_STATES.map((name) => {
                      const chosen = zone.states.includes(name);
                      // A state belongs to one zone: claimed by another one, it
                      // is shown but not offered, so the reason is visible.
                      const taken = !chosen && claimed.has(name.toLowerCase());

                      return (
                        <button
                          key={name}
                          type="button"
                          disabled={taken}
                          onClick={() =>
                            update(zone.id, {
                              states: chosen
                                ? zone.states.filter((entry) => entry !== name)
                                : [...zone.states, name],
                            })
                          }
                          aria-pressed={chosen}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs transition",
                            chosen
                              ? "bg-brand font-medium text-white"
                              : taken
                                ? "cursor-not-allowed bg-surface text-ink-muted opacity-50"
                                : "bg-surface text-ink-secondary hover:bg-line-strong hover:text-ink",
                          )}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Lagos is twenty million people and an hour's drive
                    across, so it can be split as finely as a shop likes: name
                    the parts a zone covers and it prices only those, which
                    leaves the rest of Lagos for the next zone. */}
                {zone.areas.length === 0 &&
                  !zone.states.includes(AREA_STATE) && (
                    <button
                      type="button"
                      onClick={() =>
                        update(zone.id, { areas: [LAGOS_AREAS[0]] })
                      }
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark"
                    >
                      <Plus className="size-3.5" />
                      Price parts of Lagos separately
                    </button>
                  )}

                {(zone.states.includes(AREA_STATE) ||
                  zone.areas.length > 0) && (
                  <fieldset className="mt-3">
                    <legend className="flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary">
                      <MapPin className="size-3.5 text-ink-muted" />
                      Parts of Lagos
                      <span className="text-ink-muted">
                        ({zone.areas.length === 0
                          ? "all of it"
                          : zone.areas.length})
                      </span>
                    </legend>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {LAGOS_AREAS.map((area) => {
                        const chosen = zone.areas.includes(area);
                        const taken =
                          !chosen && claimedAreas.has(area.toLowerCase());

                        return (
                          <button
                            key={area}
                            type="button"
                            disabled={taken}
                            onClick={() =>
                              update(zone.id, {
                                areas: chosen
                                  ? zone.areas.filter((entry) => entry !== area)
                                  : [...zone.areas, area],
                              })
                            }
                            aria-pressed={chosen}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs transition",
                              chosen
                                ? "bg-noir font-medium text-white"
                                : taken
                                  ? "cursor-not-allowed bg-surface text-ink-muted opacity-50"
                                  : "bg-surface text-ink-secondary hover:bg-line-strong hover:text-ink",
                            )}
                          >
                            {area}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-2 text-xs text-ink-muted">
                      {zone.areas.length === 0
                        ? "None picked, so this zone covers all of Lagos. Pick some and it covers only those — and Lagos stays available for another zone at another price."
                        : "This zone covers only these parts, at this price. Anywhere in Lagos nobody has named falls to a whole-Lagos zone, or to the default."}
                    </p>
                  </fieldset>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Pickup">
        <div className="space-y-4">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="pickup_enabled"
              checked={pickup}
              onChange={(event) => setPickup(event.target.checked)}
              className="size-4 rounded border-line-strong accent-brand"
            />
            <span className="font-medium text-ink">Offer collection</span>
            <span className="text-ink-muted">
              A free option at checkout, instead of delivery
            </span>
          </label>

          <Field
            label="What to tell them"
            htmlFor="pickup_note"
            hint="Shown at checkout and on the order, under whichever counter they chose."
          >
            <Input
              id="pickup_note"
              name="pickup_note"
              defaultValue={shipping.pickupNote}
              disabled={!pickup}
              placeholder="Collect Mon–Sat, 10am–6pm."
            />
          </Field>

          <input
            type="hidden"
            name="pickup_locations"
            value={JSON.stringify(places)}
          />

          <Field
            label="Where they collect from"
            hint={
              places.length === 0
                ? "No address yet — the checkout just says collection is free."
                : `${places.length} to choose from at checkout.`
            }
            action={
              <button
                type="button"
                onClick={() =>
                  setPlaces((current) => [
                    ...current,
                    {
                      id: `place_${Date.now()}`,
                      name: "",
                      address: "",
                      note: "",
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark"
              >
                <Plus className="size-3.5" />
                Add an address
              </button>
            }
          >
            {places.length === 0 ? (
              <p className="rounded-lg bg-plane px-3 py-5 text-center text-sm text-ink-muted">
                Add the shop, the studio, wherever a customer can walk in.
              </p>
            ) : (
              <ul className="space-y-3">
                {places.map((place) => (
                  <li key={place.id} className="rounded-xl bg-plane p-3">
                    <div className="flex items-start gap-3">
                      <div className="grid flex-1 gap-3">
                        <Input
                          value={place.name}
                          onChange={(event) =>
                            setPlaces((current) =>
                              current.map((entry) =>
                                entry.id === place.id
                                  ? { ...entry, name: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          placeholder="The studio"
                          aria-label="Name"
                        />
                        <Input
                          value={place.address}
                          onChange={(event) =>
                            setPlaces((current) =>
                              current.map((entry) =>
                                entry.id === place.id
                                  ? { ...entry, address: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          placeholder="12 Awolowo Road, Ikoyi, Lagos"
                          aria-label="Address"
                        />
                        <Input
                          value={place.note}
                          onChange={(event) =>
                            setPlaces((current) =>
                              current.map((entry) =>
                                entry.id === place.id
                                  ? { ...entry, note: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          placeholder="Mon–Sat, 10am–6pm · ring the bell at the black gate"
                          aria-label="Opening hours or directions"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPlaces((current) =>
                            current.filter((entry) => entry.id !== place.id),
                          )
                        }
                        aria-label={`Remove ${place.name || "address"}`}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-critical-soft hover:text-critical"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Field>
        </div>
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs" role="status">
          {state.ok === true && (
            <span className="text-good-text">{state.message}</span>
          )}
          {state.ok === false && (
            <span className="text-critical">{state.error}</span>
          )}
          {state.ok === null && zones.length > 0 && (
            <span className="text-ink-muted">
              {zones.length} zone{zones.length === 1 ? "" : "s"} ·{" "}
              {claimed.size} state{claimed.size === 1 ? "" : "s"} covered ·
              everywhere else {formatNairaShort(shipping.defaultFeeKobo)}
            </span>
          )}
        </p>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save shipping
        </Button>
      </div>
    </form>
  );
}

/**
 * A delivery window, as two numbers.
 *
 * Hours rather than days: a Lagos shop delivering the same afternoon would
 * otherwise have to write "0 days", and "within 24 hours" is the promise a
 * shopper here is used to reading. Setting both ends the same says one figure
 * rather than a range, which is what most shops mean.
 */
function EtaFields({
  value,
  onChange,
}: {
  value: DeliveryEta;
  onChange: (next: DeliveryEta) => void;
}) {
  const hours = (raw: string) => Math.min(Math.max(Number(raw) || 1, 1), 336);

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={336}
        step={1}
        inputMode="numeric"
        value={value.minHours}
        aria-label="Fastest, in hours"
        onChange={(event) =>
          onChange({ ...value, minHours: hours(event.target.value) })
        }
        className="h-10 w-20 rounded-lg bg-surface px-3 text-sm tabular-nums text-ink shadow-[0_0_0_1px_rgb(11_11_12_/_0.10)] focus:shadow-[0_0_0_2px_var(--color-brand)] focus:outline-none"
      />
      <span className="text-sm text-ink-muted">to</span>
      <input
        type="number"
        min={1}
        max={336}
        step={1}
        inputMode="numeric"
        value={value.maxHours}
        aria-label="Slowest, in hours"
        onChange={(event) =>
          onChange({ ...value, maxHours: hours(event.target.value) })
        }
        className="h-10 w-20 rounded-lg bg-surface px-3 text-sm tabular-nums text-ink shadow-[0_0_0_1px_rgb(11_11_12_/_0.10)] focus:shadow-[0_0_0_2px_var(--color-brand)] focus:outline-none"
      />
      <span className="text-sm text-ink-muted">hours</span>
    </div>
  );
}
