"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

import {
  syncPaystack,
  type SyncState,
} from "@/app/admin/(dashboard)/payments/actions";
import { Button } from "@/components/ui/button";

const initialState: SyncState = { ok: null };

/** Pulls the latest Paystack transactions on demand. */
export function SyncButton({ enabled }: { enabled: boolean }) {
  const [state, formAction, pending] = useActionState(
    syncPaystack,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <form action={formAction}>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending || !enabled}
          title={
            enabled ? undefined : "Add PAYSTACK_SECRET_KEY to enable syncing"
          }
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {pending ? "Syncing…" : "Sync from Paystack"}
        </Button>
      </form>

      {state.ok === true && (
        <p className="text-xs text-good-text">{state.message}</p>
      )}
      {state.ok === false && (
        <p className="max-w-xs text-right text-xs text-critical">
          {state.error}
        </p>
      )}
    </div>
  );
}
