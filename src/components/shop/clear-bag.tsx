"use client";

import { useEffect, useRef } from "react";

import { useShop } from "@/components/shop/shop-provider";

/**
 * Empties the bag once an order has actually been paid for.
 *
 * Not at checkout, and not on the way to Paystack: a payment can be abandoned,
 * and someone who backs out and tries again should find their bag exactly as
 * they left it. The money arriving is the only event that means the bag is
 * spent.
 */
export function ClearBag() {
  const { clearBag } = useShop();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    clearBag();
  }, [clearBag]);

  return null;
}
