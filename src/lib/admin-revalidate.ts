import { revalidatePath, updateTag } from "next/cache";

import { CATALOGUE_TAG } from "@/lib/shop-queries";

/**
 * What a dashboard action calls after it changes something.
 *
 * It is `revalidatePath` plus one thing: dropping the storefront's cached
 * catalogue. The shop keeps a copy for up to a minute so that a busy evening
 * isn't five database queries per visitor, and the shop owner should never be
 * the one waiting out that minute — they change a price, they reload the shop,
 * it is the new price.
 *
 * Actions call this instead of `revalidatePath` so the two can't drift: there
 * is no way to add a mutation that refreshes the dashboard and forgets the
 * shop, short of deliberately importing around it.
 *
 * `updateTag` rather than `revalidateTag` because this only ever runs inside a
 * server action, and it is the one that expires immediately — the admin who
 * just saved a price is the person most likely to go and look.
 */
export function revalidate(path: string, type: "page" | "layout" = "page"): void {
  revalidatePath(path, type);
  updateTag(CATALOGUE_TAG);
}
