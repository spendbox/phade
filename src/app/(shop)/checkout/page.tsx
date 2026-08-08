import type { Metadata } from "next";

import { CheckoutForm } from "@/components/shop/checkout-form";
import { getStorefront } from "@/lib/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order.",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const content = await getStorefront();

  return (
    <>
      <h1 className="px-4 pt-6 text-2xl font-semibold tracking-tight text-ink sm:px-6 sm:text-3xl lg:px-8">
        Checkout
      </h1>
      <CheckoutForm content={content} />
    </>
  );
}
