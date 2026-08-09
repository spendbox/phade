import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { adminCredentialsState, getSession } from "@/lib/auth";
import { LOGO_TYPE } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Sign in · phadewoman admin",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/admin");

  const { next } = await searchParams;
  const credentials = adminCredentialsState();

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-plane px-4 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_TYPE} alt="phadewoman" className="h-6 w-auto" />
          <p className="mt-2.5 text-sm text-ink-secondary">
            Sign in to the admin dashboard
          </p>
        </div>

        {credentials.configured ? (
          <LoginForm next={next} />
        ) : (
          <div className="card p-5">
            <p className="text-sm font-medium text-ink">
              Admin login isn&apos;t configured yet
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
              {credentials.reason}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Add them in Vercel → Settings → Environment Variables, then
              redeploy. Generate the session secret with{" "}
              <code className="rounded bg-plane px-1 py-0.5 font-mono text-[12px] text-ink">
                openssl rand -base64 48
              </code>
              .
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
