export type DescribeMode =
  | "generate"
  | "improve"
  | "shorten"
  | "expand"
  | "bullets"
  | "seo";

type Payload = {
  kind?: "product" | "tags" | "category" | "color";
  mode?: DescribeMode;
  name: string;
  category?: string;
  price?: string;
  keywords?: string;
  current?: string;
};

async function ask(payload: Payload): Promise<string> {
  const response = await fetch("/api/admin/ai/describe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as { text?: string; error?: string };
  if (!response.ok || !result.text) {
    throw new Error(result.error ?? "The assistant couldn't respond.");
  }
  return result.text;
}

/** Writes or rewrites a product description. */
export function describeProduct(
  mode: DescribeMode,
  context: Omit<Payload, "kind" | "mode">,
): Promise<string> {
  return ask({ kind: "product", mode, ...context });
}

/** Suggests tags from a product's description. Returns a comma-separated list. */
export function suggestTags(
  context: Omit<Payload, "kind" | "mode">,
): Promise<string> {
  return ask({ kind: "tags", ...context });
}

/** Grows a category description out of the short one already written. */
export function describeCategory(
  context: Omit<Payload, "kind" | "mode">,
): Promise<string> {
  return ask({ kind: "category", ...context });
}

/**
 * Turns colour names an admin typed ("wine, nude, forest") into named swatches.
 *
 * Guessing hex codes by hand is where colour data goes wrong — "wine" ends up
 * as pure red and every burgundy in the catalogue looks different. The model
 * judges the shade; anything it returns that isn't a real hex is dropped.
 */
export async function matchColors(
  input: string,
): Promise<{ name: string; hex: string }[]> {
  const text = await ask({ kind: "color", name: input, current: input });

  // Models like to wrap JSON in a code fence; take the array either way.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Couldn't read the colours.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("Couldn't read the colours.");
  }
  if (!Array.isArray(parsed)) throw new Error("Couldn't read the colours.");

  const colors = parsed.flatMap((item): { name: string; hex: string }[] => {
    if (typeof item !== "object" || item === null) return [];
    const entry = item as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const hex = typeof entry.hex === "string" ? entry.hex.trim() : "";
    if (!name || !/^#[0-9a-fA-F]{6}$/.test(hex)) return [];
    return [{ name, hex }];
  });

  if (colors.length === 0) throw new Error("No colours came back.");
  return colors;
}

/** Merges suggested tags into existing ones without introducing duplicates. */
export function mergeTags(existing: string, suggested: string): string {
  const seen = new Set<string>();
  const keep: string[] = [];

  for (const tag of `${existing},${suggested}`.split(",")) {
    const clean = tag.trim().toLowerCase();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    keep.push(clean);
  }
  return keep.join(", ");
}
