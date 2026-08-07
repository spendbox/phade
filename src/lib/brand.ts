/**
 * Brand assets, hosted in the public `Website_Assets` Supabase bucket.
 *
 * Kept in one place so swapping a logo is a one-line change. They're referenced
 * by URL rather than bundled, so updating the file in Supabase updates the site
 * without a redeploy.
 */

/** The mark on its own — used where space is tight, and on the holding page. */
export const LOGO_MARK =
  "https://drowtqlrkzxutgjylbvy.supabase.co/storage/v1/object/public/Website_Assets/PW%20Logo%20alone.svg";

/** The wordmark — used in the dashboard sidebar and on the sign-in screen. */
export const LOGO_TYPE =
  "https://drowtqlrkzxutgjylbvy.supabase.co/storage/v1/object/public/Website_Assets/PW%20logotype.svg";

/** Full lock-up, used as the browser tab icon. */
export const LOGO_FAVICON =
  "https://drowtqlrkzxutgjylbvy.supabase.co/storage/v1/object/public/Website_Assets/PhadeWoman%20Logos.svg";

/** Primary brand colour. Mirrored as `--color-brand` in globals.css. */
export const BRAND_COLOR = "#A63655";
