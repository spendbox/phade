import type { Metadata } from "next";

import { LOGO_MARK } from "@/lib/brand";

export const metadata: Metadata = {
  title: "phadewoman",
  description: "Building something amazing.",
};

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_MARK}
        alt="phadewoman"
        className="h-20 w-auto sm:h-24"
        fetchPriority="high"
      />

      <h1 className="mt-10 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
        Building something amazing
      </h1>
    </main>
  );
}
