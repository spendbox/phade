"use client";

import { useActionState, useState } from "react";
import { KeyRound, Loader2, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import {
  addTeamMember,
  removeTeamMember,
  saveRoleName,
  setTeamAccess,
  setTeamPassword,
  type TeamFormState,
} from "@/app/admin/(dashboard)/settings/team/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/stat-tile";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { AdminUser } from "@/lib/team";

const initial: TeamFormState = { ok: null };

/**
 * The shop's logins.
 *
 * Two kinds of person, and the shop names the second one: a sales manager, a
 * shop assistant, whoever works the order book on a Saturday. They get the
 * orders and nothing else — not the prices, not the payouts, not the ability
 * to empty the catalogue — which is what makes handing out a login something
 * an owner can do without thinking twice about it.
 *
 * Nobody's password is ever shown back, because it isn't kept: what is stored
 * is a hash, and the only thing an owner can do to a forgotten password is set
 * a new one.
 */
export function TeamForm({
  users,
  staffRoleName,
  ownerEmail,
  notReady,
}: {
  users: AdminUser[];
  staffRoleName: string;
  /** The environment owner, shown so the list is the whole truth. */
  ownerEmail: string | null;
  notReady: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<AdminUser | null>(null);

  return (
    <div className="space-y-5">
      {notReady && (
        <p className="rounded-lg bg-warning-soft px-3 py-3 text-sm text-ink">
          The team table isn&apos;t in the database yet. Run{" "}
          <span className="font-medium">supabase/schema.sql</span> in the
          Supabase SQL editor — it is safe to re-run — and this page will fill
          in.
        </p>
      )}

      <Panel
        title="Who can sign in"
        action={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark"
          >
            <Plus className="size-3.5" />
            Add someone
          </button>
        }
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-line">
          {ownerEmail && (
            <li className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-noir text-white">
                <ShieldCheck className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {ownerEmail}
                </p>
                <p className="text-xs text-ink-muted">
                  Owner · signs in with the environment password, and can&apos;t
                  be removed from here
                </p>
              </div>
            </li>
          )}

          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5"
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  user.enabled
                    ? "bg-brand-soft text-brand"
                    : "bg-plane text-ink-muted",
                )}
              >
                {(user.name || user.username).slice(0, 1).toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {user.name || user.username}
                  {!user.enabled && (
                    <span className="ml-2 rounded-full bg-plane px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                      Switched off
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {user.username} ·{" "}
                  {user.role === "owner" ? "Owner" : staffRoleName} ·{" "}
                  {user.lastSeenAt
                    ? `last in ${formatDateTime(user.lastSeenAt)}`
                    : "never signed in"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setResetting(user)}
                  title="Set a new password"
                  aria-label={`Set a new password for ${user.username}`}
                  className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-plane hover:text-ink"
                >
                  <KeyRound className="size-4" />
                </button>

                <form action={setTeamAccess}>
                  <input type="hidden" name="id" value={user.id} />
                  <input
                    type="hidden"
                    name="role"
                    value={user.role === "owner" ? "staff" : "owner"}
                  />
                  <button
                    type="submit"
                    title={
                      user.role === "owner"
                        ? `Make them a ${staffRoleName.toLowerCase()}`
                        : "Make them an owner"
                    }
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-secondary transition hover:bg-plane hover:text-ink"
                  >
                    {user.role === "owner" ? "Limit" : "Make owner"}
                  </button>
                </form>

                <form action={setTeamAccess}>
                  <input type="hidden" name="id" value={user.id} />
                  <input
                    type="hidden"
                    name="enabled"
                    value={user.enabled ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-secondary transition hover:bg-plane hover:text-ink"
                  >
                    {user.enabled ? "Switch off" : "Switch on"}
                  </button>
                </form>

                <form action={removeTeamMember}>
                  <input type="hidden" name="id" value={user.id} />
                  <button
                    type="submit"
                    title="Remove"
                    aria-label={`Remove ${user.username}`}
                    className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-critical-soft hover:text-critical"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
            </li>
          ))}

          {users.length === 0 && !notReady && (
            <li className="px-4 py-6 text-center text-sm text-ink-muted sm:px-5">
              Nobody else yet. Add whoever works your orders and they&apos;ll
              see the order book and nothing else.
            </li>
          )}
        </ul>
      </Panel>

      <RoleNamePanel current={staffRoleName} />

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add someone to the team"
      >
        <AddForm
          staffRoleName={staffRoleName}
          onDone={() => setAdding(false)}
        />
      </Modal>

      <Modal
        open={Boolean(resetting)}
        onClose={() => setResetting(null)}
        title={`New password for ${resetting?.username ?? ""}`}
      >
        {resetting && (
          <ResetForm user={resetting} onDone={() => setResetting(null)} />
        )}
      </Modal>
    </div>
  );
}

function AddForm({
  staffRoleName,
  onDone,
}: {
  staffRoleName: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(addTeamMember, initial);
  const [role, setRole] = useState<"staff" | "owner">("staff");

  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.ok) onDone();
  }

  return (
    <form action={formAction} className="space-y-4 p-5">
      <Field label="Their name" htmlFor="name">
        <Input id="name" name="name" placeholder="Ada Obi" autoFocus />
      </Field>

      <Field
        label="Username"
        htmlFor="username"
        required
        hint="What they type to sign in. Lower case, no spaces."
      >
        <Input id="username" name="username" required placeholder="ada" />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        required
        hint="At least 10 characters. Tell them what it is — we can't show it again."
      >
        <Input
          id="password"
          name="password"
          type="text"
          required
          autoComplete="new-password"
          placeholder="a phrase they'll remember"
        />
      </Field>

      <input type="hidden" name="role" value={role} />
      <Field label="What they can do">
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice
            checked={role === "staff"}
            onChange={() => setRole("staff")}
            title={staffRoleName}
            note="The order book only. Moves orders along, sees nothing else."
          />
          <Choice
            checked={role === "owner"}
            onChange={() => setRole("owner")}
            title="Owner"
            note="Everything: prices, products, payouts, the team."
          />
        </div>
      </Field>

      {state.ok === false && (
        <p role="alert" className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          Add them
        </Button>
      </div>
    </form>
  );
}

function ResetForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(setTeamPassword, initial);

  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.ok) onDone();
  }

  return (
    <form action={formAction} className="space-y-4 p-5">
      <input type="hidden" name="id" value={user.id} />

      <p className="text-sm text-ink-secondary">
        Passwords aren&apos;t stored in a form anyone can read back, so a
        forgotten one is replaced rather than recovered.
      </p>

      <Field label="New password" htmlFor="new-password" required>
        <Input
          id="new-password"
          name="password"
          type="text"
          required
          autoFocus
          autoComplete="new-password"
          placeholder="at least 10 characters"
        />
      </Field>

      {state.ok === false && (
        <p role="alert" className="rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Set it
        </Button>
      </div>
    </form>
  );
}

function RoleNamePanel({ current }: { current: string }) {
  const [state, formAction, pending] = useActionState(saveRoleName, initial);

  return (
    <Panel title="What the limited role is called">
      <form action={formAction} className="space-y-4">
        <Field
          label="Role name"
          htmlFor="staff_role_name"
          hint="Shown wherever this role appears in the dashboard."
        >
          <Input
            id="staff_role_name"
            name="staff_role_name"
            defaultValue={current}
            placeholder="Sales manager"
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
    </Panel>
  );
}

function Choice({
  checked,
  onChange,
  title,
  note,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  note: string;
}) {
  return (
    <label
      className={cn(
        "cursor-pointer rounded-lg p-3 text-left transition",
        checked
          ? "bg-surface ring-2 ring-brand"
          : "bg-plane ring-1 ring-inset ring-line hover:ring-line-strong",
      )}
    >
      <input
        type="radio"
        name="role_choice"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="block text-sm font-medium text-ink">{title}</span>
      <span className="mt-0.5 block text-xs text-ink-secondary">{note}</span>
    </label>
  );
}
