"use client";

import { useState } from "react";

import { HelpSheet } from "@/components/shop/help-sheet";
import { cn } from "@/lib/cn";
import type { SupportDetails } from "@/lib/storefront";

/**
 * "Message us", in the middle of a sentence.
 *
 * Wherever the shop's own copy offers to be written to, this is what makes
 * that offer real: the same pop-up the footer and the menu open, in place,
 * without leaving the page someone is stuck on. Sending a shopper who cannot
 * find their order reference off to `/shop` — which is what this used to do —
 * is answering a question with a shrug.
 */
export function ContactLink({
  support,
  children,
  className,
}: {
  support: SupportDetails;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "underline underline-offset-2 transition-colors hover:text-ink",
          className,
        )}
      >
        {children}
      </button>

      <HelpSheet
        open={open}
        onClose={() => setOpen(false)}
        support={support}
      />
    </>
  );
}
