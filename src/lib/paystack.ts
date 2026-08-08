import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Thin Paystack client. Paystack denominates NGN in kobo, which is exactly how
 * we store money, so amounts pass through untouched.
 */

const API = "https://api.paystack.co";

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export type PaystackTransaction = {
  id: number;
  reference: string;
  amount: number; // kobo
  fees: number | null; // kobo
  currency: string;
  channel: string | null;
  status: "success" | "failed" | "abandoned" | "reversed" | string;
  paid_at: string | null;
  created_at: string;
  customer?: {
    email?: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  };
  metadata?: Record<string, unknown> | null;
};

type PaystackResponse<T> = { status: boolean; message: string; data: T };

async function call<T>(
  path: string,
  init?: RequestInit,
): Promise<PaystackResponse<T>> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set.");

  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | PaystackResponse<T>
    | null;

  if (!response.ok || !body?.status) {
    throw new Error(
      body?.message ?? `Paystack request failed (${response.status})`,
    );
  }
  return body;
}

/** Most recent transactions, newest first. `perPage` maxes out at 100. */
export async function listTransactions(options?: {
  perPage?: number;
  page?: number;
  status?: "success" | "failed" | "abandoned";
  from?: string;
  to?: string;
}): Promise<PaystackTransaction[]> {
  const params = new URLSearchParams({
    perPage: String(Math.min(options?.perPage ?? 100, 100)),
    page: String(options?.page ?? 1),
  });
  if (options?.status) params.set("status", options.status);
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);

  const { data } = await call<PaystackTransaction[]>(
    `/transaction?${params.toString()}`,
  );
  return data ?? [];
}

/**
 * Opens a payment for an order that already exists in our tables.
 *
 * The reference is ours, not Paystack's, which is what lets the webhook find
 * the order again when the money lands — `recordTransaction` matches on it.
 */
export async function initializeTransaction(options: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<{ authorizationUrl: string; reference: string }> {
  const { data } = await call<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: options.email,
      amount: options.amountKobo,
      reference: options.reference,
      currency: "NGN",
      callback_url: options.callbackUrl,
      metadata: options.metadata,
    }),
  });

  return {
    authorizationUrl: data.authorization_url,
    reference: data.reference,
  };
}

export async function verifyTransaction(
  reference: string,
): Promise<PaystackTransaction> {
  const { data } = await call<PaystackTransaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  return data;
}

/**
 * Verifies the `x-paystack-signature` header on a webhook delivery.
 * Paystack signs the raw request body with HMAC SHA-512 using the secret key.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;

  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Maps a Paystack status onto the `payments.status` values we store. */
export function mapPaystackStatus(
  status: string,
): "success" | "failed" | "abandoned" | "refunded" | "pending" {
  switch (status) {
    case "success":
      return "success";
    case "failed":
      return "failed";
    case "abandoned":
      return "abandoned";
    case "reversed":
      return "refunded";
    default:
      return "pending";
  }
}
