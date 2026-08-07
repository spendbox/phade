"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import {
  saveSettings,
  type SettingsFormState,
} from "@/app/admin/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Field, NumberInput } from "@/components/ui/field";

const initialState: SettingsFormState = { ok: null };

export function SettingsForm({ lowStockThreshold }: { lowStockThreshold: number }) {
  const [state, formAction, pending] = useActionState(
    saveSettings,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Default low stock alert"
        htmlFor="low_stock_threshold"
        hint="New products start at this reorder point. Existing products keep their own."
      >
        <NumberInput
          id="low_stock_threshold"
          name="low_stock_threshold"
          min={0}
          step={1}
          defaultValue={lowStockThreshold}
          className="max-w-[10rem]"
        />
      </Field>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs" role="status">
          {state.ok === true && (
            <span className="text-good-text">{state.message}</span>
          )}
          {state.ok === false && (
            <span className="text-critical">{state.error}</span>
          )}
        </p>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
}
