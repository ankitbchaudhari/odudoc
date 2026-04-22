"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    import("@/lib/sentry").then((s) => s.captureException(error, { digest: error.digest, level: "fatal" })).catch(() => {});
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 520, textAlign: "center" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>OduDoc hit a snag</h1>
            <p style={{ color: "#64748b", marginBottom: 24 }}>An unexpected error occurred. Please try again.</p>
            <button onClick={reset} style={{ background: "#2563eb", color: "white", padding: "10px 20px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600 }}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
