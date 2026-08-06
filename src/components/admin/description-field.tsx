"use client";

import { useRef, useState } from "react";
import {
  List,
  Loader2,
  Maximize2,
  Minimize2,
  Sparkles,
  Undo2,
  Wand2,
} from "lucide-react";

import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type Mode = "generate" | "improve" | "shorten" | "expand" | "bullets";

const ACTIONS: {
  mode: Mode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { mode: "improve", label: "Improve", icon: Wand2 },
  { mode: "shorten", label: "Shorten", icon: Minimize2 },
  { mode: "expand", label: "Expand", icon: Maximize2 },
  { mode: "bullets", label: "Bullets", icon: List },
];

/**
 * Description textarea with the AI assistant attached.
 *
 * Reads the product name/category/price straight off the surrounding form, so
 * the assistant always writes from whatever is on screen right now. Every
 * rewrite is undoable in one click — the previous text is kept until the next
 * run.
 */
export function DescriptionField({
  name = "description",
  defaultValue = "",
  enabled,
}: {
  name?: string;
  defaultValue?: string;
  enabled: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [previous, setPrevious] = useState<string | null>(null);
  const [pending, setPending] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function run(mode: Mode) {
    const form = textareaRef.current?.form;
    if (!form) return;

    const data = new FormData(form);
    const categorySelect = form.elements.namedItem(
      "category_id",
    ) as HTMLSelectElement | null;

    setPending(mode);
    setError(null);

    try {
      const response = await fetch("/api/admin/ai/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          name: String(data.get("name") ?? ""),
          category:
            categorySelect?.selectedIndex && categorySelect.selectedIndex > 0
              ? categorySelect.options[categorySelect.selectedIndex].text
              : "",
          price: String(data.get("price") ?? ""),
          current: value,
        }),
      });

      const result = (await response.json()) as {
        description?: string;
        error?: string;
      };

      if (!response.ok || !result.description) {
        throw new Error(result.error ?? "The assistant couldn't respond.");
      }

      setPrevious(value);
      setValue(result.description);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The assistant couldn't respond.",
      );
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;
  const hasText = value.trim().length > 0;

  return (
    <div className="space-y-2">
      <Textarea
        ref={textareaRef}
        id={name}
        name={name}
        rows={7}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Describe the fit, the fabric, and where she'd wear it…"
        disabled={busy}
      />

      {enabled && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => void run("generate")}
            disabled={busy}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-soft px-2.5 text-[13px] font-medium text-brand transition-colors hover:bg-brand/10 disabled:opacity-50",
            )}
          >
            {pending === "generate" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {hasText ? "Rewrite with AI" : "Write with AI"}
          </button>

          {hasText &&
            ACTIONS.map((action) => (
              <button
                key={action.mode}
                type="button"
                onClick={() => void run(action.mode)}
                disabled={busy}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-plane hover:text-ink disabled:opacity-50"
              >
                {pending === action.mode ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <action.icon className="size-3.5" />
                )}
                {action.label}
              </button>
            ))}

          {previous !== null && !busy && (
            <button
              type="button"
              onClick={() => {
                setValue(previous);
                setPrevious(null);
              }}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-plane hover:text-ink"
            >
              <Undo2 className="size-3.5" />
              Undo
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
