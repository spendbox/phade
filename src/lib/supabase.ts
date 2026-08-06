import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service role key.
 *
 * Every table has RLS enabled with no policies, so the service role is the only
 * way in — which means this client must never be imported into a client
 * component. All data access happens in server components, server actions, and
 * route handlers behind the admin session check.
 */

export const PRODUCT_IMAGE_BUCKET = "product-images";

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * Returns the client, or null when Supabase env vars are not set yet.
 * Pages use this to render a "connect Supabase" state instead of crashing on a
 * fresh deployment.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;

  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cached;
}

/** Use inside server actions, where an unconfigured project is a hard error. */
export function requireSupabase(): SupabaseClient {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return client;
}

/** Public URL for an object already uploaded to the product image bucket. */
export function publicImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path}`;
}
