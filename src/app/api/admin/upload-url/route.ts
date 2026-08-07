import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import {
  ACCEPTED_MEDIA_TYPES,
  MAX_UPLOAD_BYTES,
  extensionFor,
} from "@/lib/media";
import {
  PRODUCT_IMAGE_BUCKET,
  getSupabase,
  publicImageUrl,
} from "@/lib/supabase";

/**
 * Mints a one-shot signed upload URL for Supabase Storage.
 *
 * The browser then PUTs the file straight to Supabase, so uploads never pass
 * through a serverless function and aren't capped by its request body limit —
 * which is what makes product videos possible.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase isn't configured, so media can't be stored yet." },
      { status: 501 },
    );
  }

  let body: { filename?: string; contentType?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const contentType = body.contentType ?? "";
  if (!ACCEPTED_MEDIA_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, AVIF, MP4, WebM or MOV file." },
      { status: 415 },
    );
  }

  if (typeof body.size === "number" && body.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than 50MB." },
      { status: 413 },
    );
  }

  const extension = extensionFor(contentType, body.filename ?? "");
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;

  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not start the upload." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    publicUrl: publicImageUrl(path),
  });
}
