// Report watermark overlay — Ecosystem Spec §13.
//
// Renders a repeating diagonal watermark across the viewport showing
// patient ID + viewer IP + access timestamp. Pure CSS, fixed-position,
// pointer-events: none. Persists during print via @media print rules.
//
// Pair with the `watermark` payload returned by /api/documents and
// /api/invoices/render — same data, audit log and visible overlay tell
// the same story.

"use client";

import { useEffect } from "react";

export interface WatermarkData {
  patientUserId: string;
  ip: string;
  viewedAt: string; // ISO
}

interface ReportWatermarkProps {
  data: WatermarkData;
  /** If true, also blocks right-click "Save image as" + Ctrl+S. */
  preventDownload?: boolean;
}

export function ReportWatermark({ data, preventDownload = true }: ReportWatermarkProps) {
  useEffect(() => {
    if (!preventDownload) return;
    const onKey = (e: KeyboardEvent) => {
      // Block common save/print-to-file combos. Print remains allowed
      // (watermark prints with the document).
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
      }
    };
    const onCtx = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "IMG" || t.tagName === "CANVAS" || t.tagName === "VIDEO")) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("contextmenu", onCtx);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("contextmenu", onCtx);
    };
  }, [preventDownload]);

  const stamp = new Date(data.viewedAt).toISOString().replace("T", " ").slice(0, 19);
  const tile = `OduDoc · Patient ${data.patientUserId} · ${data.ip} · ${stamp} UTC`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] select-none overflow-hidden print:fixed print:inset-0 print:z-[9999]"
      style={{ mixBlendMode: "multiply" }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: "rotate(-30deg) scale(1.6)",
          transformOrigin: "center",
        }}
      >
        {Array.from({ length: 18 }).map((_, row) => (
          <div
            key={row}
            className="whitespace-nowrap font-mono text-[13px] font-semibold tracking-wider"
            style={{
              color: "rgba(15, 23, 42, 0.08)",
              padding: "0.6em 0",
              letterSpacing: "0.08em",
            }}
          >
            {Array.from({ length: 6 }).map((_, col) => (
              <span key={col} style={{ marginRight: "2rem" }}>
                {tile}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
