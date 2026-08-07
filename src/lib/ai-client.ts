export type DescribeMode =
  | "generate"
  | "improve"
  | "shorten"
  | "expand"
  | "bullets"
  | "seo";

export type DescribeContext = {
  name: string;
  category?: string;
  price?: string;
  keywords?: string;
  current?: string;
};

/**
 * Calls the description assistant. Shared by the single-product form and the
 * bulk uploader so both send the same shape and surface the same errors.
 */
export async function describeProduct(
  mode: DescribeMode,
  context: DescribeContext,
): Promise<string> {
  const response = await fetch("/api/admin/ai/describe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, ...context }),
  });

  const result = (await response.json()) as {
    description?: string;
    error?: string;
  };

  if (!response.ok || !result.description) {
    throw new Error(result.error ?? "The assistant couldn't respond.");
  }
  return result.description;
}
