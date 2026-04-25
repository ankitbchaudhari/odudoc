"use client";

// Absolute-last-resort error boundary.
//
// Next.js renders this when even the root layout itself fails — at that
// point Tailwind, fonts and the rest of the design system aren't
// reachable. So this file is intentionally self-contained: a single
// <html><body> block styled inline, no external imports beyond the
// Sentry helper. Keep it that way.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    import("@/lib/sentry")
      .then((s) => s.captureException(error, { digest: error.digest, level: "fatal" }))
      .catch(() => {
        /* sentry import failed — already logged via console fallback */
      });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background:
            "linear-gradient(135deg, #fff1f2 0%, #fff7ed 50%, #fffbeb 100%)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 80,
              margin: "0 auto 24px",
              borderRadius: 16,
              background: "linear-gradient(135deg, #f43f5e, #f97316, #f59e0b)",
              boxShadow: "0 12px 30px rgba(244,63,94,0.3)",
              color: "white",
              fontSize: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
            OduDoc hit a snag
          </h1>
          <p style={{ color: "#475569", margin: "0 0 28px", lineHeight: 1.6 }}>
            Something unexpected happened on our side. Our team has been
            notified — please try again, or come back in a moment.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={reset}
              style={{
                background:
                  "linear-gradient(90deg, #0d9488, #0891b2, #2563eb)",
                color: "white",
                padding: "12px 24px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                boxShadow: "0 8px 18px rgba(13,148,136,0.3)",
              }}
            >
              ↻ Try again
            </button>
            <a
              href="/"
              style={{
                background: "white",
                color: "#0f172a",
                padding: "12px 24px",
                borderRadius: 12,
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
                border: "2px solid #e2e8f0",
              }}
            >
              Go to home
            </a>
          </div>
          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 12, color: "#94a3b8" }}>
              Ref: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{error.digest}</span>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
