import { persistentStore } from "@/lib/browser-store";

/**
 * The details a shopper typed last time, kept so the next checkout is a glance
 * rather than a form.
 *
 * They stay in this browser. There are no shopper accounts to attach them to,
 * and sending a name and address to a server that has no way to authenticate
 * who is asking for them back would be worse than useless. The shop already
 * has these details on the orders that were actually placed; this copy exists
 * only to fill the form in.
 *
 * Nothing sensitive is here on purpose — card details never touch this app at
 * all, they are typed on Paystack's own page.
 */

export type ShopperDetails = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  fulfilment: "shipping" | "pickup";
};

export const NO_DETAILS: ShopperDetails = {
  name: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  fulfilment: "shipping",
};

function text(value: unknown): string {
  // A cap, because this is read straight back into a form: a stored value that
  // grew a novel is a stored value that has been tampered with.
  return typeof value === "string" ? value.slice(0, 200) : "";
}

function isDetails(raw: unknown): raw is ShopperDetails {
  return typeof raw === "object" && raw !== null;
}

export const detailsStore = persistentStore<ShopperDetails>(
  "phade.details.v1",
  NO_DETAILS,
  isDetails,
);

/** Everything the checkout form asked for, cleaned up on the way in. */
export function detailsFrom(form: FormData): ShopperDetails {
  return {
    name: text(form.get("name")).trim(),
    email: text(form.get("email")).trim(),
    phone: text(form.get("phone")).trim(),
    line1: text(form.get("line1")).trim(),
    line2: text(form.get("line2")).trim(),
    city: text(form.get("city")).trim(),
    state: text(form.get("state")).trim(),
    fulfilment: form.get("fulfilment") === "pickup" ? "pickup" : "shipping",
  };
}

/** Reading back: anything missing or the wrong shape becomes an empty field. */
export function safeDetails(raw: ShopperDetails): ShopperDetails {
  return {
    name: text(raw.name),
    email: text(raw.email),
    phone: text(raw.phone),
    line1: text(raw.line1),
    line2: text(raw.line2),
    city: text(raw.city),
    state: text(raw.state),
    fulfilment: raw.fulfilment === "pickup" ? "pickup" : "shipping",
  };
}

export function hasDetails(details: ShopperDetails): boolean {
  return Boolean(details.name || details.email || details.phone);
}
