import { cache } from "react";
import { unstable_cache } from "next/cache";

import { CATALOGUE_TAG } from "@/lib/shop-queries";
import { getSupabase } from "@/lib/supabase";

/**
 * What delivery costs, and where.
 *
 * A flat national fee is the wrong shape for a shop that sends parcels across
 * Nigeria: getting something to the next street is not what it costs to get it
 * to Maiduguri. So delivery is a set of zones, each covering some states with
 * its own price, plus a default for anywhere not named and an optional free-
 * delivery threshold.
 *
 * It lives in `app_settings` beside the storefront copy rather than in its own
 * table, for the same reasons: one row of JSON, one form, and adding a field
 * later costs no migration. Zones are a list inside that row because they are
 * only ever read and written whole.
 */

export type ShippingZone = {
  /** Stable across edits, so a reordered list doesn't rewrite every rule. */
  id: string;
  name: string;
  /** State names this zone covers, matched case-insensitively. */
  states: string[];
  /**
   * Areas of Lagos this zone covers, when the shop prices Lagos more finely
   * than "Lagos". Getting a parcel to Ikoyi is not what it costs to get one to
   * Ikorodu, and both are Lagos. A zone with areas only claims those areas; a
   * zone with none claims whole states, as it always did.
   */
  areas: string[];
  feeKobo: number;
  /**
   * Spend this much and this zone ships free. Null falls back to the shop-wide
   * threshold, which is what most shops want.
   */
  freeOverKobo: number | null;
};

/** Somewhere a shopper can collect an order in person. */
export type PickupLocation = {
  id: string;
  /** What the shop calls it — "The studio", "Lekki shop". */
  name: string;
  address: string;
  /** Opening hours, a landmark, which gate to use. */
  note: string;
};

export type ShippingSettings = {
  /** Charged for a state no zone claims. */
  defaultFeeKobo: number;
  /** Shop-wide free-delivery threshold. 0 turns it off. */
  freeOverKobo: number;
  zones: ShippingZone[];
  pickupEnabled: boolean;
  /** Where and when, shown wherever pickup is offered. */
  pickupNote: string;
  /**
   * The shop's own counters. A shopper choosing collection picks one, and it
   * travels on the order so the confirmation says where to go rather than
   * "we'll message you".
   */
  pickupLocations: PickupLocation[];
};

export const SHIPPING_KEY = "shipping_settings";

export const DEFAULT_SHIPPING: ShippingSettings = {
  defaultFeeKobo: 500_000,
  freeOverKobo: 10_000_000,
  zones: [],
  pickupEnabled: true,
  pickupNote: "Collect from us — we'll message you when it's ready.",
  pickupLocations: [],
};

/**
 * Nigeria's states, plus the FCT. The checkout offers this list rather than a
 * text box so that what a shopper picks can actually match a zone — "Lagos",
 * "lagos state" and "LAG" are three different strings and one place.
 */
export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT — Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

/**
 * Lagos, in the pieces a courier actually thinks in.
 *
 * The state is one entry in the list above and about twenty million people in
 * practice, spread from Badagry to Epe. A shop that charges one Lagos price is
 * either overcharging Yaba or losing money on Ikorodu, so the checkout asks
 * which part of Lagos, and a zone can be built out of these.
 */
export const LAGOS_AREAS = [
  "Agege",
  "Ajah",
  "Alimosho",
  "Amuwo-Odofin",
  "Apapa",
  "Badagry",
  "Egbeda",
  "Epe",
  "Festac",
  "Gbagada",
  "Ibeju-Lekki",
  "Idimu",
  "Ifako-Ijaiye",
  "Ijesha",
  "Ikeja",
  "Ikorodu",
  "Ikoyi",
  "Ilupeju",
  "Isolo",
  "Ketu",
  "Lagos Island",
  "Lekki",
  "Magodo",
  "Maryland",
  "Mushin",
  "Ogba",
  "Ogudu",
  "Ojo",
  "Ojota",
  "Okota",
  "Oshodi",
  "Sangotedo",
  "Shomolu",
  "Surulere",
  "Victoria Island",
  "Yaba",
] as const;

/** The one state that is asked about in more detail. */
export const AREA_STATE = "Lagos";

function textList(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter(
        (item): item is string => typeof item === "string" && item.trim() !== "",
      )
    : [];
}

function kobo(value: unknown, fallback: number): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return fallback;
  return Math.trunc(amount);
}

function parsePickup(raw: unknown): PickupLocation[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): PickupLocation[] => {
    if (typeof item !== "object" || item === null) return [];
    const value = item as Record<string, unknown>;

    const name = typeof value.name === "string" ? value.name.trim() : "";
    const address =
      typeof value.address === "string" ? value.address.trim() : "";
    // A counter with no address is not somewhere anyone can go.
    if (!name || !address) return [];

    return [
      {
        id:
          typeof value.id === "string" && value.id
            ? value.id
            : name.toLowerCase(),
        name,
        address,
        note: typeof value.note === "string" ? value.note.trim() : "",
      },
    ];
  });
}

function parseZone(raw: unknown): ShippingZone[] {
  if (typeof raw !== "object" || raw === null) return [];
  const value = raw as Record<string, unknown>;

  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return [];

  const states = textList(value.states);
  const areas = textList(value.areas);
  // A zone that claims nothing would silently price everything.
  if (states.length === 0 && areas.length === 0) return [];

  const freeOver =
    value.freeOverKobo === null || value.freeOverKobo === undefined
      ? null
      : kobo(value.freeOverKobo, 0);

  return [
    {
      id: typeof value.id === "string" && value.id ? value.id : name.toLowerCase(),
      name,
      states,
      areas,
      feeKobo: kobo(value.feeKobo, 0),
      freeOverKobo: freeOver,
    },
  ];
}

/** Anything missing or the wrong shape falls back, so a half-filled row works. */
export function parseShipping(raw: unknown): ShippingSettings {
  if (typeof raw !== "object" || raw === null) return DEFAULT_SHIPPING;
  const value = raw as Record<string, unknown>;

  return {
    defaultFeeKobo: kobo(value.defaultFeeKobo, DEFAULT_SHIPPING.defaultFeeKobo),
    freeOverKobo: kobo(value.freeOverKobo, DEFAULT_SHIPPING.freeOverKobo),
    zones: Array.isArray(value.zones) ? value.zones.flatMap(parseZone) : [],
    pickupEnabled: value.pickupEnabled !== false,
    pickupNote:
      typeof value.pickupNote === "string"
        ? value.pickupNote
        : DEFAULT_SHIPPING.pickupNote,
    pickupLocations: parsePickup(value.pickupLocations),
  };
}

/**
 * The zone that claims this destination, or null when none does.
 *
 * An area beats a state: a shop that has priced Lekki separately means it,
 * and the Lagos-wide zone it also sits inside is the fallback, not the answer.
 */
export function zoneFor(
  shipping: ShippingSettings,
  state: string | null | undefined,
  area?: string | null,
): ShippingZone | null {
  const claims = (list: string[], wanted: string) =>
    list.some((name) => name.trim().toLowerCase() === wanted);

  const wantedArea = area?.trim().toLowerCase();
  if (wantedArea) {
    const byArea = shipping.zones.find((zone) =>
      claims(zone.areas, wantedArea),
    );
    if (byArea) return byArea;
  }

  const wantedState = state?.trim().toLowerCase();
  if (!wantedState) return null;

  return (
    shipping.zones.find(
      (zone) => zone.areas.length === 0 && claims(zone.states, wantedState),
    ) ??
    shipping.zones.find((zone) => claims(zone.states, wantedState)) ??
    null
  );
}

export type DeliveryQuote = {
  feeKobo: number;
  /** Why it costs what it costs — shown beside the figure at checkout. */
  label: string;
  free: boolean;
  /** How much more to spend for free delivery, or null when not applicable. */
  toFreeKobo: number | null;
};

/**
 * What this basket costs to deliver, and why.
 *
 * One function, used by the bag, the checkout and the order it becomes, so the
 * figure a shopper is quoted is the figure they are charged. Pickup is always
 * free; so is anything over the threshold that applies to the destination.
 */
export function quoteDelivery(
  shipping: ShippingSettings,
  subtotalKobo: number,
  options: {
    fulfilment: "shipping" | "pickup";
    state?: string | null;
    /** Which part of Lagos, when that is where it is going. */
    area?: string | null;
  },
): DeliveryQuote {
  if (options.fulfilment === "pickup") {
    return { feeKobo: 0, label: "Pickup", free: true, toFreeKobo: null };
  }

  const zone = zoneFor(shipping, options.state, options.area);
  const fee = zone ? zone.feeKobo : shipping.defaultFeeKobo;
  const threshold = zone?.freeOverKobo ?? shipping.freeOverKobo;

  if (threshold > 0 && subtotalKobo >= threshold) {
    return {
      feeKobo: 0,
      label: zone ? `${zone.name} · free over ${threshold / 100}` : "Free delivery",
      free: true,
      toFreeKobo: null,
    };
  }

  return {
    feeKobo: fee,
    label: zone?.name ?? "Delivery",
    free: fee === 0,
    toFreeKobo: threshold > 0 ? threshold - subtotalKobo : null,
  };
}

/** The cheapest delivery anywhere — for "from ₦x" before a state is chosen. */
export function cheapestFee(shipping: ShippingSettings): number {
  return shipping.zones.reduce(
    (lowest, zone) => Math.min(lowest, zone.feeKobo),
    shipping.defaultFeeKobo,
  );
}

async function loadShipping(): Promise<ShippingSettings> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_SHIPPING;

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", SHIPPING_KEY)
    .maybeSingle();

  if (error || !data) return DEFAULT_SHIPPING;
  return parseShipping((data as { value: unknown }).value);
}

/** Cached like the catalogue, and dropped by the same tag when it changes. */
export const getShipping = cache(async function getShipping(): Promise<ShippingSettings> {
  return unstable_cache(loadShipping, ["shipping-settings"], {
    revalidate: 60,
    tags: [CATALOGUE_TAG],
  })();
});
