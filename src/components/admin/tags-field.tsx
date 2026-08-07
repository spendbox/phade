"use client";

import { useRef, useState } from "react";
import { Loader2, Tag } from "lucide-react";

import { Field, Input } from "@/components/ui/field";
import { mergeTags, suggestTags } from "@/lib/ai-client";

/**
 * Tags input with a suggestion button that reads the description out of the
 * surrounding form — tags are only as good as what the description says, so
 * they're generated from it rather than from the name alone.
 */
export function TagsField({
  name = "tags",
  defaultValue = "",
  enabled,
}: {
  name?: string;
  defaultValue?: string;
  enabled: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function suggest() {
    const form = inputRef.current?.form;
    if (!form) return;

    const data = new FormData(form);
    const categorySelect = form.elements.namedItem(
      "category_id",
    ) as HTMLSelectElement | null;

    setPending(true);
    setError(null);

    try {
      const suggested = await suggestTags({
        name: String(data.get("name") ?? ""),
        category:
          categorySelect?.selectedIndex && categorySelect.selectedIndex > 0
            ? categorySelect.options[categorySelect.selectedIndex].text
            : "",
        current: String(data.get("description") ?? ""),
      });
      // Merge rather than replace, so hand-written tags survive.
      setValue((current) => mergeTags(current, suggested));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The assistant couldn't respond.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Field
      label="Tags"
      htmlFor={name}
      hint="Comma separated — ankara, party, new-in"
      action={
        enabled ? (
          <button
            type="button"
            onClick={() => void suggest()}
            disabled={pending}
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-brand-soft px-2 text-xs font-medium text-brand transition hover:bg-brand/10 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Tag className="size-3" />
            )}
            Suggest from description
          </button>
        ) : undefined
      }
    >
      <Input
        ref={inputRef}
        id={name}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      {error && (
        <p role="alert" className="mt-1 text-sm text-critical">
          {error}
        </p>
      )}
    </Field>
  );
}
