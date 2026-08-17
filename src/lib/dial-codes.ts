/**
 * Dialling codes, for a phone number that can be rung.
 *
 * Nigeria first because that is where this shop delivers, and because a
 * shopper in Lagos should never have to hunt for their own country in a list
 * of two hundred. The rest are the places phadewoman's customers actually
 * call from — the diaspora, the neighbours, the airports in between — rather
 * than every country on earth, which would make the list slower to use for
 * everyone in order to serve almost nobody.
 */

export type DialCode = {
  /** ISO country code, used as the option's key. */
  iso: string;
  name: string;
  dial: string;
  flag: string;
};

export const DIAL_CODES: DialCode[] = [
  { iso: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { iso: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭" },
  { iso: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
  { iso: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { iso: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬" },
  { iso: "CM", name: "Cameroon", dial: "+237", flag: "🇨🇲" },
  { iso: "CI", name: "Côte d'Ivoire", dial: "+225", flag: "🇨🇮" },
  { iso: "SN", name: "Senegal", dial: "+221", flag: "🇸🇳" },
  { iso: "BJ", name: "Benin", dial: "+229", flag: "🇧🇯" },
  { iso: "TG", name: "Togo", dial: "+228", flag: "🇹🇬" },
  { iso: "NE", name: "Niger", dial: "+227", flag: "🇳🇪" },
  { iso: "TD", name: "Chad", dial: "+235", flag: "🇹🇩" },
  { iso: "TZ", name: "Tanzania", dial: "+255", flag: "🇹🇿" },
  { iso: "UG", name: "Uganda", dial: "+256", flag: "🇺🇬" },
  { iso: "RW", name: "Rwanda", dial: "+250", flag: "🇷🇼" },
  { iso: "ET", name: "Ethiopia", dial: "+251", flag: "🇪🇹" },
  { iso: "MA", name: "Morocco", dial: "+212", flag: "🇲🇦" },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { iso: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { iso: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { iso: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { iso: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { iso: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { iso: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { iso: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { iso: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
  { iso: "NO", name: "Norway", dial: "+47", flag: "🇳🇴" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { iso: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦" },
  { iso: "TR", name: "Türkiye", dial: "+90", flag: "🇹🇷" },
  { iso: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
];

export const DEFAULT_DIAL = "+234";

/** Splits a stored number back into the code that was chosen and the rest. */
export function splitDial(value: string): { dial: string; number: string } {
  const trimmed = value.trim();
  if (!trimmed.startsWith("+")) {
    return { dial: DEFAULT_DIAL, number: trimmed };
  }

  // Longest first, so +234 wins over +23 and +1 doesn't swallow +1 809.
  const codes = [...new Set(DIAL_CODES.map((entry) => entry.dial))].sort(
    (a, b) => b.length - a.length,
  );

  const match = codes.find((code) => trimmed.startsWith(code));
  return match
    ? { dial: match, number: trimmed.slice(match.length).trim() }
    : { dial: DEFAULT_DIAL, number: trimmed.replace(/^\+/, "") };
}

/** How many digits a number has, ignoring spaces, dashes and brackets. */
export function digitCount(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}
