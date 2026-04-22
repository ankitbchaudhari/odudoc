"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Forward to Sentry (dynamic import — only loads if SENTRY_DSN set).
    import("@/lib/sentry").then((s) => s.captureException(error, { digest: error.digest })).catch(() => {});
  }, [error]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Something went wrong</h1>
        <p style={{ color: "#64748b", marginBottom: 24 }}>We&apos;ve logged the error and our team will look into it. You can try again, or head back home.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={reset} style={{ background: "#2563eb", color: "white", padding: "10px 20px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600 }}>
            Try again
          </button>
          <a href="/" style={{ background: "#f1f5f9", color: "#0f172a", padding: "10px 20px", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}>
            Go home
          </a>
        </div>
        {error.digest && <p style={{ marginTop: 16, fontSize: 12, color: "#94a3b8" }}>Ref: {error.digest}</p>}
      </div>
    </div>
  );
}
