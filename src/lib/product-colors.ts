import type { ProductColor } from "@/lib/types";

/**
 * Colourways as they arrive from a form.
 *
 * The picker sends them as JSON in a hidden input, and more than one place now
 * receives that — the product form, the bulk uploader, and the inventory
 * dialog, where editing the counts is the whole point. Parsing it in each of
 * them is how they quietly stop agreeing about what a valid colour is.
 *
 * A count is optional on purpose: plenty of shops keep one number for a piece
 * and always will. Where every colour carries one, the product's stock is
 * their sum — see `countedStock`.
 */
export function parseColors(raw: unknown): ProductColor[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof raw === "string" ? raw || "[]" : "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item): ProductColor[] => {
    if (typeof item !== "object" || item === null) return [];
    const entry = item as Record<string, unknown>;

    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const hex = typeof entry.hex === "string" ? entry.hex : "";
    if (!name || !/^#[0-9a-fA-F]{3,8}$/.test(hex)) return [];

    const count = Number(entry.stock);
    const stock =
      entry.stock === undefined || !Number.isFinite(count)
        ? undefined
        : Math.max(Math.trunc(count), 0);

    return [{ name, hex, ...(stock === undefined ? {} : { stock }) }];
  });
}

/**
 * The stock these colourways add up to, or null when they don't add up to
 * anything — a list where only some carry a number is not a count.
 */
export function countedStock(colors: ProductColor[]): number | null {
  if (colors.length === 0) return null;
  if (!colors.every((color) => color.stock !== undefined)) return null;
  return colors.reduce((total, color) => total + (color.stock ?? 0), 0);
}
