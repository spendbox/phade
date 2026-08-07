/**
 * Money is stored everywhere as an integer number of kobo (1 naira = 100 kobo)
 * so we never accumulate floating point error. These helpers are the only place
 * that converts between kobo and the naira figures a person reads or types.
 */

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nairaWholeFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** ₦12,500.00 — use in tables and anywhere exact amounts matter. */
export function formatNaira(kobo: number | null | undefined): string {
  return nairaFormatter.format((kobo ?? 0) / 100);
}

/** ₦12,500 — drops the kobo when it is zero, for headline figures. */
export function formatNairaShort(kobo: number | null | undefined): string {
  const value = kobo ?? 0;
  return value % 100 === 0
    ? nairaWholeFormatter.format(value / 100)
    : nairaFormatter.format(value / 100);
}

/** ₦2.2m / ₦864.6k / ₦940 — for stat tiles where space is tight. */
export function formatNairaCompact(kobo: number | null | undefined): string {
  const naira = (kobo ?? 0) / 100;
  const abs = Math.abs(naira);
  if (abs >= 1_000_000_000) return `₦${trim(naira / 1_000_000_000)}b`;
  if (abs >= 1_000_000) return `₦${trim(naira / 1_000_000)}m`;
  if (abs >= 10_000) return `₦${trim(naira / 1_000)}k`;
  return nairaWholeFormatter.format(naira);
}

function trim(value: number): string {
  return value
    .toFixed(value < 10 ? 2 : 1)
    .replace(/\.0+$/, "")
    .replace(/(\.\d)0$/, "$1");
}

/** Parses what a person typed ("12,500.50", "₦12500") into kobo. */
export function nairaToKobo(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  const cleaned =
    typeof input === "number" ? String(input) : input.replace(/[^\d.-]/g, "");
  const naira = Number.parseFloat(cleaned);
  if (!Number.isFinite(naira)) return 0;
  return Math.round(naira * 100);
}

/** Kobo -> the plain number a price input should show ("12500.5"). */
export function koboToNairaInput(kobo: number | null | undefined): string {
  if (kobo === null || kobo === undefined) return "";
  return String(kobo / 100);
}

const numberFormatter = new Intl.NumberFormat("en-NG");

export function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(value ?? 0);
}

export function formatPercent(
  value: number | null | undefined,
  digits = 1,
): string {
  return `${(value ?? 0).toFixed(digits)}%`;
}

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const longDateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

export function formatLongDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return longDateFormatter.format(date);
}

/** "3 days ago", "just now" — for activity lists. */
export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(date);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** ISO timestamp -> the "YYYY-MM-DDTHH:mm" a datetime-local input expects. */
export function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
