import { BagButton } from "@/components/shop/bag-button";
import { BagDrawer } from "@/components/shop/bag-drawer";
import { ProductModal } from "@/components/shop/product-modal";
import { ShopProvider } from "@/components/shop/shop-provider";
import { SiteFooter } from "@/components/shop/site-footer";
import { SiteHeader } from "@/components/shop/site-header";
import { TabBar } from "@/components/shop/tab-bar";
import { Toaster } from "@/components/shop/toaster";
import { getShipping } from "@/lib/shipping";
import { getCatalogue } from "@/lib/shop-queries";
import { getStorefront } from "@/lib/storefront";

/**
 * Rendered once and re-used for up to a minute. Nothing on this route depends
 * on who is asking — the bag and the saved list live in the browser — so a
 * shopper should not wait for it to be built again. Any dashboard change drops
 * the cache immediately through `revalidate` in `@/lib/admin-revalidate`, so
 * the minute is a ceiling for edits made straight in the database, not a delay
 * on the shop's own work.
 */
export const revalidate = 60;

/**
 * The shell every shop page sits inside: the announcement, the header, the
 * thumb-height tab bar, and the three overlays that can appear over any page —
 * the bag, the product pop-up, and the line that confirms what just happened.
 *
 * The categories and the announcement are read here rather than in each page.
 * `getCatalogue` is memoised per request, so the page underneath asking for the
 * same catalogue costs nothing extra.
 */
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [content, catalogue, shipping] = await Promise.all([
    getStorefront(),
    getCatalogue(),
    getShipping(),
  ]);

  return (
    <ShopProvider>
      <div className="flex min-h-dvh flex-col bg-canvas">
        {content.announcementEnabled && content.announcement && (
          <p className="bg-noir px-4 py-2 text-center text-[12px] font-medium tracking-wide text-white sm:text-[13px]">
            {content.announcement}
          </p>
        )}

        <SiteHeader menu={content.menu} support={content.support} />

        <main className="flex-1">{children}</main>

        <SiteFooter
          categories={catalogue.categories}
          content={content}
          shipping={shipping}
        />
      </div>

      <TabBar />
      <BagButton />
      <BagDrawer shipping={shipping} />
      <ProductModal />
      <Toaster />
    </ShopProvider>
  );
}
