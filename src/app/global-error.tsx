"use client";

import { LOGO_MARK } from "@/lib/brand";

/**
 * The last net under everything, including the root layout itself.
 *
 * Without one of these a crash in the browser leaves React with nothing to
 * render, and the page a shopper is looking at goes white — no message, no way
 * back, and nothing anyone can report beyond "it didn't open". That is the
 * worst possible failure for a shop, because it is indistinguishable from the
 * site being down.
 *
 * It replaces the root layout when it fires, so it has to bring its own
 * `<html>` and `<body>`, and it cannot rely on anything the layout sets up —
 * no fonts, no CSS variables. Everything here is inline for that reason.
 *
 * The digest is shown deliberately. It is the one string that ties what a
 * shopper saw to a line in the server logs, and asking someone to read six
 * characters off a screen beats guessing.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          textAlign: "center",
          background: "#ffffff",
          color: "#1a1718",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_MARK} alt="phadewoman" style={{ height: "3.5rem" }} />

        <h1
          style={{
            marginTop: "2.5rem",
            fontSize: "1.5rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Something went wrong at our end
        </h1>

        <p
          style={{
            marginTop: "0.75rem",
            maxWidth: "26rem",
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            color: "#6b6462",
          }}
        >
          The shop is still here — this page just failed to load. Try again, and
          if it keeps happening please tell us what your phone says below.
        </p>

        <div
          style={{
            marginTop: "2rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={reset}
            style={{
              height: "2.75rem",
              padding: "0 1.5rem",
              borderRadius: "999px",
              border: "none",
              background: "#A63655",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Try again
          </button>
          {/* A real navigation, not a client-side one: the router is part of
              what just failed, so the way out has to be a fresh document. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: "2.75rem",
              padding: "0 1.5rem",
              borderRadius: "999px",
              border: "1px solid rgba(11,11,12,0.15)",
              color: "#6b6462",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Back to the shop
          </a>
        </div>

        {error.digest && (
          <p
            style={{
              marginTop: "2rem",
              fontSize: "0.75rem",
              color: "#8a8380",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            Reference {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
