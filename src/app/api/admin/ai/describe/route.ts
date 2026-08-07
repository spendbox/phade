import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getSession } from "@/lib/auth";

/**
 * Writing assistant, powered by OpenAI.
 *
 * Three jobs behind one endpoint: product descriptions, tag suggestions drawn
 * from a description, and category descriptions grown from the short line an
 * admin already wrote. The model is configurable through OPENAI_MODEL so it can
 * change without a code edit.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MODEL = "gpt-4o-mini";

const PRODUCT_MODES = {
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

type ProductMode = keyof typeof PRODUCT_MODES;

const BRAND = `phadewoman is a Nigerian women's fashion brand selling online. Prices are in naira (₦).`;

const PRODUCT_SYSTEM = `You write product descriptions for phadewoman. ${BRAND}

House style:
- Warm, confident, and specific. Speak to the customer as "you".
- 40-90 words unless asked otherwise. Two short paragraphs at most.
- Plain sentences. No emoji, no hashtags, no headings, no markdown bold.
- Only mention a price if one is given to you.
- Never invent fabric, measurements, care instructions, or origin. If a detail
  wasn't provided, write around it rather than guessing.

Return only the description text — no preamble, no quotes, no commentary.`;

const TAGS_SYSTEM = `You suggest search and merchandising tags for phadewoman products. ${BRAND}

Rules:
- Return 4 to 8 tags, comma separated, on a single line.
- Lowercase, one to three words each, hyphenate multi-word tags (e.g. new-in).
- Draw only on what the name and description actually say — occasion, style,
  silhouette, fabric if stated, colour if stated. Never invent a material.
- No duplicates, no punctuation beyond the separating commas, no hashtags.

Return only the comma-separated list.`;

const CATEGORY_SYSTEM = `You write category descriptions for a phadewoman storefront. ${BRAND}

House style:
- One or two sentences, 15-35 words. It sits under a category heading.
- Say what a shopper will find in the category and who it suits.
- Warm and plain. No emoji, no headings, no markdown.
- Build on the short description given rather than replacing its meaning.
- Never invent stock, prices, delivery promises, or specific products.

Return only the description text.`;

const COLOR_SYSTEM = `You convert fashion colour names into hex codes for a Nigerian women's fashion catalogue.

Rules:
- Return ONLY a JSON array, no prose: [{"name":"Burgundy","hex":"#6d1f34"}]
- One object per colour named in the input, in the order given.
- "name" is the colour title-cased and tidied up (fix obvious typos).
- "hex" is a 6-digit hex code starting with #, lowercase.
- Judge the shade the way a fabric buyer would: "nude" is a warm beige, "wine"
  is a deep desaturated red, "emerald" is a rich blue-green, "ash" is a grey.
  Nigerian trade names count — "wine", "chocolate", "coffee", "peach", "lemon".
- If a line names two colours ("black and gold"), return both.
- Never return more than 12 objects.`;

type Payload = {
  kind?: "product" | "tags" | "category" | "color";
  mode?: string;
  name?: string;
  category?: string;
  price?: string;
  keywords?: string;
  current?: string;
};

function buildRequest(body: Payload):
  | { system: string; user: string }
  | { error: string; status: number } {
  const name = (body.name ?? "").trim();
  const current = (body.current ?? "").trim();
  const kind = body.kind ?? "product";

  if (kind === "tags") {
    if (!name) {
      return { error: "Add a product name first.", status: 400 };
    }
    if (!current) {
      return {
        error: "Write or generate a description first — tags come from it.",
        status: 400,
      };
    }
    return {
      system: TAGS_SYSTEM,
      user: [
        `Product name: ${name}`,
        body.category ? `Category: ${body.category}` : null,
        `Description:\n${current}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (kind === "color") {
    if (!current) return { error: "Type a colour name first.", status: 400 };
    return {
      system: COLOR_SYSTEM,
      user: `Colours: ${current}`,
    };
  }

  if (kind === "category") {
    if (!name) return { error: "Name the category first.", status: 400 };
    return {
      system: CATEGORY_SYSTEM,
      user: [
        `Category name: ${name}`,
        current
          ? `Short description to build on:\n${current}`
          : "There is no description yet — write one from the category name.",
      ].join("\n"),
    };
  }

  const mode = (body.mode ?? "generate") as ProductMode;
  if (!(mode in PRODUCT_MODES)) {
    return { error: "Unknown mode.", status: 400 };
  }
  if (!name) {
    return {
      error: "Add a product name first — the assistant writes from it.",
      status: 400,
    };
  }
  if (mode !== "generate" && !current) {
    return { error: "There's no description to work from yet.", status: 400 };
  }

  return {
    system: PRODUCT_SYSTEM,
    user: `${PRODUCT_MODES[mode]}\n\n${[
      `Product name: ${name}`,
      body.category ? `Category: ${body.category}` : null,
      body.price ? `Price: ${body.price}` : null,
      body.keywords ? `Keywords to work in: ${body.keywords}` : null,
      current ? `Existing description:\n${current}` : null,
    ]
      .filter(Boolean)
      .join("\n")}`,
  };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "The AI assistant isn't set up. Add OPENAI_API_KEY in Vercel and redeploy.",
      },
      { status: 501 },
    );
  }

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const built = buildRequest(body);
  if ("error" in built) {
    return NextResponse.json({ error: built.error }, { status: built.status });
  }

  try {
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      max_completion_tokens: 600,
      messages: [
        { role: "system", content: built.system },
        { role: "user", content: built.user },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return NextResponse.json(
        { error: "The assistant came back empty. Try again." },
        { status: 502 },
      );
    }

    // `description` is kept alongside `text` so older clients keep working.
    return NextResponse.json({ text, description: text });
  } catch (error) {
    const message =
      error instanceof OpenAI.APIError
        ? `AI request failed (${error.status}): ${error.message}`
        : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
