import { AlertTriangle } from "lucide-react";

/**
 * Shown in place of data when Supabase env vars are missing, so a fresh Vercel
 * deployment renders a useful next step instead of an error page.
 */
export function SetupNotice({
  title = "Connect your Supabase project",
  description = "Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, run supabase/schema.sql in the Supabase SQL editor, then redeploy.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="card flex items-start gap-3 border-l-4 border-l-warning p-4 sm:p-5">
      <AlertTriangle
        className="mt-0.5 size-5 shrink-0 text-warning"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
          {description}
        </p>
      </div>
    </div>
  );
}

/** Inline error surface for a failed query, so one bad table doesn't 500 a page. */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="card flex items-start gap-3 border-l-4 border-l-critical p-4 sm:p-5">
      <AlertTriangle
        className="mt-0.5 size-5 shrink-0 text-critical"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">Couldn&apos;t load this data</p>
        <p className="mt-1 break-words text-sm text-ink-secondary">{message}</p>
      </div>
    </div>
  );
}
