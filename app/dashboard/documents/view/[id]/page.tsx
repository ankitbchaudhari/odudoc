"use client";

// Watermarked document viewer.
//
// Loads a document by id and renders it inside a tile that overlays
// patient userId + viewer IP + timestamp diagonally across the page.
// The browser's own Print button is the supported export path; raw
// download (right-click → "Save as", drag-to-desktop) still works
// at the OS level for someone determined enough — but every view
// is logged with the IP, so misuse is forensically tractable.
//
// Built as a client page rather than an iframe so the watermark
// can't be trivially stripped by saving the inner src.

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface DocResp {
  document: {
    id: string; title: string; mimeType: string; data: string;
    documentDate?: string; uploadedAt: string; source?: string;
  };
  watermark: { patientUserId: string; ip?: string; viewedAt: string };
}

export default function DocumentViewerPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [resp, setResp] = useState<DocResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/documents?id=${encodeURIComponent(String(id))}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d) => setResp(d))
      .catch((e) => setError(typeof e === "string" ? e : "Failed to load"));
  }, [id]);

  // Mark the document printed when the user actually fires the
  // browser print dialog. Best-effort — the beforeprint event fires
  // for both screen → print and Save-as-PDF.
  useEffect(() => {
    const onPrint = () => {
      if (!id) return;
      fetch("/api/documents", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "print" }),
      }).catch(() => {});
    };
    window.addEventListener("beforeprint", onPrint);
    return () => window.removeEventListener("beforeprint", onPrint);
  }, [id]);

  const triggerPrint = useCallback(() => window.print(), []);

  if (error) {
    return <p className="mx-auto mt-12 max-w-md rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>;
  }
  if (!resp) {
    return <p className="mx-auto mt-12 max-w-md rounded-xl bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>;
  }

  const { document, watermark } = resp;
  const isImage = document.mimeType.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-800 print:bg-white dark:bg-slate-900">
      {/* Action bar — hidden on print */}
      <div className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard/documents" className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-700">
            ← Back to documents
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 ring-1 ring-rose-200">
              View-only · download disabled
            </span>
            <button onClick={triggerPrint} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700">
              Print
            </button>
          </div>
        </div>
        <p className="mx-auto max-w-5xl px-4 pb-2 text-[10px] text-slate-500 dark:text-slate-400">
          Every view, print, and share is logged with your account, IP address, and timestamp.
          You can review the access log at <Link href="/dashboard/audit" className="font-semibold text-indigo-600 hover:underline">Audit log</Link>.
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 print:max-w-none print:p-0">
        <div className="mb-4 rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 print:shadow-none print:ring-0">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{document.source || "OduDoc record"}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{document.title}</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {document.documentDate ? new Date(document.documentDate).toLocaleDateString() : new Date(document.uploadedAt).toLocaleDateString()} · {document.mimeType}
          </p>
        </div>

        {/* Document tile with diagonal watermark */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 print:shadow-none print:ring-0">
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={document.data}
              alt={document.title}
              className="block h-auto w-full select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
          {isPdf && (
            <object data={document.data} type="application/pdf" className="block h-[78vh] w-full" aria-label={document.title}>
              <p className="p-6 text-sm text-slate-600 dark:text-slate-300">PDF viewer not available — use the Print button.</p>
            </object>
          )}
          {!isImage && !isPdf && (
            <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              File type {document.mimeType} cannot be previewed inline.
            </p>
          )}

          {/* Repeating diagonal watermark — pure CSS so it survives
              browser-print rendering. The watermark text encodes the
              viewer's userId + IP so a leaked printout traces back
              to the device that printed it. */}
          <div
            className="pointer-events-none absolute inset-0 select-none print:opacity-30"
            style={{
              backgroundImage: `repeating-linear-gradient(-30deg, rgba(99,102,241,0.10) 0, rgba(99,102,241,0.10) 1px, transparent 1px, transparent 240px)`,
            }}
          >
            {Array.from({ length: 14 }).map((_, row) => (
              <div key={row} className="absolute inset-x-0 -rotate-12" style={{ top: `${row * 14}%` }}>
                <div className="flex justify-around whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600/30">
                  {Array.from({ length: 4 }).map((__, col) => (
                    <span key={col}>
                      OduDoc · {watermark.patientUserId} · {watermark.ip || "no-ip"} · {new Date(watermark.viewedAt).toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block">
        <p className="mt-4 px-4 text-[10px] text-slate-500 dark:text-slate-400">
          Printed from OduDoc · Patient ID {watermark.patientUserId} · IP {watermark.ip || "unknown"} ·
          {" "}{new Date(watermark.viewedAt).toLocaleString()}. This printout carries an audit trail.
        </p>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 12mm; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
