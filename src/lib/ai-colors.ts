import OpenAI from "openai";

import type { ProductColor } from "@/lib/types";

/**
 * Colour names to shades, server-side.
 *
 * A spreadsheet says "wine" or "coffee" or "ash"; the catalogue needs a hex.
 * Guessing by hand is where colour data goes wrong — every burgundy ends up
 * slightly different. One request handles a whole import's worth of names.
 */

const SYSTEM = `You convert fashion colour names into hex codes for a Nigerian women's fashion catalogue.

Rules:
- Return ONLY a JSON array, no prose: [{"name":"Burgundy","hex":"#6d1f34"}]
- One object per colour name given, in the same order, keeping the name the
  admin typed (tidied to title case, obvious typos fixed).
- "hex" is a 6-digit lowercase hex code starting with #.
- Judge the shade the way a fabric buyer would: "nude" is a warm beige, "wine"
  is a deep desaturated red, "emerald" is a rich blue-green, "ash" is a grey.
  Nigerian trade names count — "wine", "chocolate", "coffee", "peach", "lemon".
- Never return more than 60 objects.`;

export async function matchColorNames(
  names: string[],
): Promise<ProductColor[]> {
  if (names.length === 0) return [];
  if (!process.env.OPENAI_API_KEY) return [];

  const client = new OpenAI();
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    max_completion_tokens: 1500,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Colours: ${names.slice(0, 60).join(", ")}` },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";

  // Models like to wrap JSON in a code fence; take the array either way.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item): ProductColor[] => {
    if (typeof item !== "object" || item === null) return [];
    const entry = item as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const hex = typeof entry.hex === "string" ? entry.hex.trim().toLowerCase() : "";
    if (!name || !/^#[0-9a-f]{6}$/.test(hex)) return [];
    return [{ name, hex }];
  });
}
