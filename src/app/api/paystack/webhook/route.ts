import { NextResponse } from "next/server";

import {
  isPaystackConfigured,
  verifyWebhookSignature,
  type PaystackTransaction,
} from "@/lib/paystack";
import { recordTransaction } from "@/lib/record-payment";
import { getSupabase } from "@/lib/supabase";

/**
 * Paystack webhook.
 *
 * Point Paystack at https://<your-domain>/api/paystack/webhook
 * (Dashboard → Settings → API Keys & Webhooks → Live/Test webhook URL).
 *
 * The signature is HMAC SHA-512 of the *raw* body, so the body is read as text
 * before parsing. Replays are safe: payments upsert on their reference.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isPaystackConfigured()) {
    return NextResponse.json(
      { error: "Paystack is not configured." },
      { status: 501 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Tell Paystack to retry once storage is available.
    return NextResponse.json(
      { error: "Storage unavailable." },
      { status: 503 },
    );
  }

  let event: { event?: string; data?: PaystackTransaction };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const handled = new Set([
    "charge.success",
    "charge.failed",
    "refund.processed",
    "transfer.success",
  ]);

  if (!event.event || !handled.has(event.event) || !event.data?.reference) {
    // Acknowledge anything we don't act on so Paystack stops retrying it.
    return NextResponse.json({ received: true });
  }

  try {
    await recordTransaction(supabase, event.data);
  } catch {
    // A 5xx makes Paystack retry, which is what we want for a transient fault.
    return NextResponse.json({ error: "Could not record." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
