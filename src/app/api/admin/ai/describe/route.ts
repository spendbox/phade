import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

/**
 * Product description assistant.
 *
 * Thinking is on by default on this model and shares the max_tokens budget with
 * the response, so the cap is generous even though the copy itself is short.
 * Effort is low because writing a product blurb is not a reasoning-heavy task.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const MODES = {
  generate: "Write a fresh product description from the details provided.",
  improve:
    "Rewrite the existing description so it reads better — clearer, warmer, easier to skim — without inventing product facts that aren't given.",
  shorten:
    "Cut the existing description to roughly half its length, keeping the strongest selling points.",
  expand:
    "Add one more short paragraph of useful detail (fit, feel, styling) to the existing description. Don't invent materials or measurements that aren't given.",
  bullets:
    "Rewrite the existing description as a short intro line followed by 4-5 single-line bullet points starting with '- '.",
  seo: "Rewrite the existing description to naturally include the given keywords, keeping it readable for a person first.",
} as const;

type Mode = keyof typeof MODES;

const SYSTEM = `You write product descriptions for phadewoman, a Nigerian women's fashion brand selling online.

House style:
- Warm, confident, and specific. Speak to the customer as "you".
- 40-90 words unless asked otherwise. Two short paragraphs at most.
- Plain sentences. No emoji, no hashtags, no headings, no markdown bold.
- Prices are in naira (₦) — only mention a price if one is given to you.
- Never invent fabric, measurements, care instructions, or origin. If a detail
  wasn't provided, write around it rather than guessing.

Return only the description text — no preamble, no quotes, no commentary.`;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "The AI assistant isn't set up. Add ANTHROPIC_API_KEY in Vercel and redeploy.",
      },
      { status: 501 },
    );
  }

  let body: {
    mode?: string;
    name?: string;
    category?: string;
    price?: string;
    keywords?: string;
    current?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const mode = (body.mode ?? "generate") as Mode;
  if (!(mode in MODES)) {
    return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Add a product name first — the assistant writes from it." },
      { status: 400 },
    );
  }

  const current = (body.current ?? "").trim();
  if (mode !== "generate" && !current) {
    return NextResponse.json(
      { error: "There's no description to work from yet." },
      { status: 400 },
    );
  }

  const details = [
    `Product name: ${name}`,
    body.category ? `Category: ${body.category}` : null,
    body.price ? `Price: ${body.price}` : null,
    body.keywords ? `Keywords to work in: ${body.keywords}` : null,
    current ? `Existing description:\n${current}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: `${MODES[mode]}\n\n${details}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The assistant declined this request. Try rewording it." },
        { status: 422 },
      );
    }

    const description = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!description) {
      return NextResponse.json(
        { error: "The assistant came back empty. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ description });
  } catch (error) {
    const message =
      error instanceof Anthropic.APIError
        ? `AI request failed (${error.status}).`
        : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
