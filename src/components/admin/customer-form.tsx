"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import {
  saveCustomer,
  type CustomerFormState,
} from "@/app/admin/(dashboard)/customers/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { Customer } from "@/lib/types";

const initialState: CustomerFormState = { ok: null };

export function CustomerForm({ customer }: { customer: Customer }) {
  const [state, formAction, pending] = useActionState(
    saveCustomer,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={customer.id} />

      <Field label="Full name" htmlFor="full_name">
        <Input
          id="full_name"
          name="full_name"
          defaultValue={customer.full_name ?? ""}
          placeholder="Amaka Obi"
        />
      </Field>

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={customer.email}
        />
      </Field>

      <Field label="Phone" htmlFor="phone">
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={customer.phone ?? ""}
          placeholder="+234 800 000 0000"
        />
      </Field>

      <Field label="Notes" htmlFor="notes" hint="Only visible to you">
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={customer.notes ?? ""}
          placeholder="Sizing, preferences, delivery quirks…"
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
