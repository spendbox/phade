"use server";

import { redirect } from "next/navigation";

import { createSession, verifyCredentials } from "@/lib/auth";

export type LoginState = { error: string | null };

/** Only allow same-origin paths back into the dashboard. */
function safeRedirect(next: FormDataEntryValue | null): string {
  if (typeof next !== "string") return "/admin";
  if (!next.startsWith("/admin") || next.startsWith("//")) return "/admin";
  return next;
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  if (!verifyCredentials(email, password)) {
    // Deliberately vague: don't reveal which half was wrong.
    return { error: "That email and password combination didn't work." };
  }

  await createSession(email.trim().toLowerCase());
  redirect(safeRedirect(formData.get("next")));
}
