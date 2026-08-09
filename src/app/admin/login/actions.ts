"use server";

import { redirect } from "next/navigation";

import { authenticate, createSession } from "@/lib/auth";
import { homeFor } from "@/lib/session";

export type LoginState = { error: string | null };

/** Only allow same-origin paths back into the dashboard. */
function safeRedirect(next: FormDataEntryValue | null, fallback: string): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/admin") || next.startsWith("//")) return fallback;
  return next;
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const login = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!login || !password) {
    return { error: "Enter your username and password." };
  }

  const who = await authenticate(login, password);
  if (!who) {
    // Deliberately vague: don't reveal which half was wrong.
    return { error: "That username and password combination didn't work." };
  }

  await createSession(who.email, who.role, who.name);

  // Somewhere they can actually go: a sales manager sent to the dashboard's
  // front page would be bounced straight back out of it.
  const home = homeFor(who.role);
  const wanted = safeRedirect(formData.get("next"), home);
  redirect(who.role === "owner" ? wanted : home);
}
