import { PRODUCT_SIZES, type ProductColor } from "@/lib/types";

/**
 * The shop's own palette and size runs.
 *
 * Products can still carry anything, but these are what the pickers offer and
 * what a spreadsheet import matches typed colour names against — so "wine"
 * lands on the same burgundy every time instead of a fresh guess per upload.
 *
 * Nothing here touches the database, so the admin's pickers can hold the
 * shipped defaults and the size bounds without dragging the service-role
 * client into the browser bundle. Reading what a shop has actually saved is
 * `@/lib/catalogue-settings`, which is server-side.
 */

/**
 * One named run of sizes.
 *
 * A shop that sells dresses and shoes has two size runs and no way to say so
 * with one list: a 38 is a shoe and a 12 is a dress, and offering both on
 * every product is how a size gets ticked by accident. So the runs are named,
 * and a product picks the one it belongs to.
 */
export type SizeRun = {
  id: string;
  name: string;
  sizes: number[];
};

export type CatalogueDefaults = {
  colors: ProductColor[];
  /** Every run this shop uses, in the order they are offered. */
  runs: SizeRun[];
};

export const CATALOGUE_KEY = "catalogue_defaults";

/** Shoes as they are actually sold here: European, women's through men's. */
const SHOE_SIZES = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];

export const DEFAULT_CATALOGUE: CatalogueDefaults = {
  colors: [
    { name: "Black", hex: "#111111" },
    { name: "White", hex: "#f5f5f3" },
    { name: "Cream", hex: "#efe4d2" },
    { name: "Nude", hex: "#d8ac91" },
    { name: "Chocolate", hex: "#5b3a29" },
    { name: "Coffee", hex: "#4b3621" },
    { name: "Wine", hex: "#722f37" },
    { name: "Ash", hex: "#8f8f8a" },
    { name: "Peach", hex: "#f0b090" },
    { name: "Emerald", hex: "#0f6b4f" },
    { name: "Olive", hex: "#6b6b3a" },
    { name: "Burgundy", hex: "#6d1f34" },
    { name: "Rose", hex: "#c98a9b" },
    { name: "Coral", hex: "#e2725b" },
    { name: "Mustard", hex: "#d4a017" },
    { name: "Navy", hex: "#1d2b4c" },
    { name: "Sky", hex: "#8fb8de" },
    { name: "Lilac", hex: "#b39ddb" },
    { name: "Silver", hex: "#c0c0c0" },
    { name: "Gold", hex: "#c9a227" },
  ],
  runs: [
    { id: "clothing", name: "Clothing", sizes: [...PRODUCT_SIZES] },
    { id: "shoes", name: "Shoes", sizes: [...SHOE_SIZES] },
  ],
};

export function parseColorList(raw: unknown): ProductColor[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  return raw.flatMap((item): ProductColor[] => {
    if (typeof item !== "object" || item === null) return [];
    const entry = item as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const hex = typeof entry.hex === "string" ? entry.hex.trim().toLowerCase() : "";
    if (!name || !/^#[0-9a-f]{6}$/.test(hex)) return [];

    const key = name.toLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ name, hex }];
  });
}

/**
 * What counts as a size: a whole number from 1 to 100.
 *
 * Deliberately wide. A UK 6 dress, a US 1 child's shoe, a 46 European boot and
 * whatever a shop decides to number its wrappers by all have to fit, and the
 * shop knows its own stock better than this file does. The only job of the
 * bounds is to keep a typo out of the size row.
 */
export const MIN_SIZE = 1;
export const MAX_SIZE = 100;

export function parseSizeList(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];

  const chosen = new Set<number>();
  for (const item of raw) {
    const size = Number(item);
    if (Number.isInteger(size) && size >= MIN_SIZE && size <= MAX_SIZE) {
      chosen.add(size);
    }
  }
  return [...chosen].sort((a, b) => a - b);
}

export function parseCatalogue(raw: unknown): CatalogueDefaults {
  if (typeof raw !== "object" || raw === null) return DEFAULT_CATALOGUE;
  const value = raw as Record<string, unknown>;

  const colors = parseColorList(value.colors);
  const runs = parseRuns(value.runs, value.sizes);

  return {
    colors: colors.length > 0 ? colors : DEFAULT_CATALOGUE.colors,
    runs: runs.length > 0 ? runs : DEFAULT_CATALOGUE.runs,
  };
}

/**
 * The named runs, with one eye on the single flat list this used to be.
 *
 * A shop that saved its sizes before runs existed keeps every one of them, as
 * a run called Clothing, rather than waking up to the defaults. It also gets
 * the shoe run seeded alongside: one flat list could never have held shoe
 * sizes without them landing on dresses too, so a shop coming from that has
 * demonstrably never had any. Deleting a run it doesn't need is one tap.
 */
export function parseRuns(raw: unknown, legacy?: unknown): SizeRun[] {
  if (Array.isArray(raw)) {
    const runs = raw.flatMap((item): SizeRun[] => {
      if (typeof item !== "object" || item === null) return [];
      const value = item as Record<string, unknown>;
      const name = typeof value.name === "string" ? value.name.trim() : "";
      const sizes = parseSizeList(value.sizes);
      if (!name || sizes.length === 0) return [];

      return [
        {
          id:
            typeof value.id === "string" && value.id
              ? value.id
              : name.toLowerCase().replace(/\s+/g, "-"),
          name,
          sizes,
        },
      ];
    });
    if (runs.length > 0) return runs;
  }

  const kept = parseSizeList(legacy);
  return kept.length > 0
    ? [
        { id: "clothing", name: "Clothing", sizes: kept },
        { id: "shoes", name: "Shoes", sizes: [...SHOE_SIZES] },
      ]
    : [];
}

/** Every size the shop uses, whichever run it came from. */
export function allSizes(defaults: CatalogueDefaults): number[] {
  const seen = new Set<number>();
  for (const run of defaults.runs) for (const size of run.sizes) seen.add(size);
  return [...seen].sort((a, b) => a - b);
}

