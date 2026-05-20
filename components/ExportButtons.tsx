"use client";

// V4 §2.1 bullet 1: "Every table / data grid in every panel has an
// Export button (PDF and Excel) in the top-right corner."
//
// Drop-in component for any admin or staff grid:
//
//   <ExportButtons
//     type="consultations"
//     filters={{ status, from, to }}
//   />
//
// Wires to GET /api/exports/[type]?format=pdf|excel&...filters and
// triggers a browser download. The audit log + role gate + 5000-row
// guard live server-side in the API route — this component is just
// the trigger.

import { useState } from "react";

export interface ExportButtonsProps {
  /** Resource type matching the lib/exports/handlers.ts registry. */
  type: string;
  /** Active filter state — WYSIWYG, what you filter is what gets
   *  exported. Pass primitive serialisable values only. */
  filters?: Record<string, string | number | boolean | undefined | null>;
  /** Optional tone — defaults to brand-teal pills. */
  className?: string;
}

export default function ExportButtons({ type, filters, className = "" }: ExportButtonsProps) {
  const [busy, setBusy] = useState<"pdf" | "excel" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const buildQs = (format: "pdf" | "excel"): string => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v === undefined || v === null || v === "") continue;
        params.set(k, String(v));
      }
    }
    return params.toString();
  };

  const download = async (format: "pdf" | "excel") => {
    setBusy(format);
    setErr(null);
    try {
      const r = await fetch(`/api/exports/${type}?${buildQs(format)}`, {
        credentials: "include",
      });
      if (!r.ok) {
        let msg = `Export failed (${r.status})`;
        try {
          const j = await r.json();
          if (j.error === "too_large") {
            msg = `Too many rows (${j.rowCount}). Apply a tighter filter or wait for the background-job pipeline.`;
          } else if (j.error === "forbidden") {
            msg = "You don't have permission to export this resource.";
          } else if (j.error === "unauthenticated") {
            msg = "Please sign in again.";
          } else if (j.error) {
            msg = String(j.error);
          }
        } catch {/* ignore */}
        setErr(msg);
        return;
      }
      const blob = await r.blob();
      // Pull the filename from Content-Disposition if present, so the
      // saved file matches the report title rather than the URL path.
      const cd = r.headers.get("Content-Disposition") || "";
      const m = /filename="?([^"]+)"?/.exec(cd);
      const filename = m ? m[1] : `${type}.${format === "excel" ? "xlsx" : "pdf"}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErr("Network error while exporting.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`inline-flex flex-col items-end gap-1 ${className}`}>
      <div className="inline-flex gap-2">
        <button
          type="button"
          onClick={() => download("pdf")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#0F6E56]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F6E56] shadow-sm transition-colors hover:bg-[#0F6E56]/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "pdf" ? (
            <Spinner />
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          PDF
        </button>
        <button
          type="button"
          onClick={() => download("excel")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#1D9E75]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#1D9E75] shadow-sm transition-colors hover:bg-[#1D9E75]/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "excel" ? (
            <Spinner />
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 17v-6h3l3 6V11h3M3 5h18v14H3z" />
            </svg>
          )}
          Excel
        </button>
      </div>
      {err && (
        <p className="max-w-xs text-right text-[11px] text-rose-600">{err}</p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
