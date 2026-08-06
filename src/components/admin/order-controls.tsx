"use client";

import { useActionState, useRef } from "react";
import { Loader2 } from "lucide-react";

import {
  saveOrderNote,
  updateOrderStatus,
  type OrderFormState,
} from "@/app/admin/(dashboard)/orders/actions";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

/** Status picker that submits as soon as a new status is chosen. */
export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={updateOrderStatus} ref={formRef}>
      <input type="hidden" name="id" value={orderId} />
      <Select
        name="status"
        defaultValue={status}
        aria-label="Order status"
        onChange={() => formRef.current?.requestSubmit()}
        className="h-9 w-auto min-w-[9.5rem] capitalize"
      >
        {ORDER_STATUSES.map((value) => (
          <option key={value} value={value} className="capitalize">
            {value[0].toUpperCase() + value.slice(1)}
          </option>
        ))}
      </Select>
    </form>
  );
}

const initialState: OrderFormState = { ok: null };

export function OrderNote({
  orderId,
  note,
}: {
  orderId: string;
  note: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveOrderNote,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <Textarea
        name="note"
        rows={4}
        defaultValue={note ?? ""}
        placeholder="Anything the team should know about this order…"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs" role="status">
          {state.ok === true && (
            <span className="text-good-text">{state.message}</span>
          )}
          {state.ok === false && (
            <span className="text-critical">{state.error}</span>
          )}
        </p>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Save note
        </Button>
      </div>
    </form>
  );
}
