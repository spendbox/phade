import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "phadewoman",
  description: "Building something amazing.",
};

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#0c0f16] px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]"
      />

      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-[0.4em] text-white/45">
          phadewoman
        </p>

        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          Building something amazing
        </h1>

        <p className="mx-auto mt-5 max-w-md text-pretty text-base leading-relaxed text-white/55">
          Our store is on the way. Check back soon.
        </p>
      </div>
    </main>
  );
}
