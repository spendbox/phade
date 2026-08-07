export type DescribeMode =
  | "generate"
  | "improve"
  | "shorten"
  | "expand"
  | "bullets"
  | "seo";

type Payload = {
  kind?: "product" | "tags" | "category";
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
