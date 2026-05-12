"use client";

// Universal medical file viewer.
//
// Picks the right renderer based on MIME type / extension:
//   .pdf                       → <iframe> (browser native PDF)
//   .jpg/.jpeg/.png/.webp/.gif → <img>
//   .heic                      → "Convert and re-upload" hint (iPhone scans)
//   .dcm / DICOM               → placeholder + "Open in DICOM viewer" CTA
//                                (Cornerstone integration ships separately)
//   .json (FHIR / HL7)         → pretty-printed JSON
//   .txt / .md / .csv          → plain-text render
//   anything else              → download link + size + type
//
// One drop-in component. Reads at most 1 MB of text content for the
// inline preview to keep the request light.

import { useEffect, useState } from "react";

interface MedicalFileViewerProps {
  url: string;
  /** Original filename — used to pick a renderer when MIME is missing. */
  filename?: string;
  /** Reported MIME type from the upload, if known. */
  contentType?: string;
  /** Bytes — drives the size badge. */
  size?: number;
  /** Optional caption rendered below the viewer. */
  caption?: string;
  className?: string;
}

type Kind =
  | "pdf"
  | "image"
  | "heic"
  | "dicom"
  | "json"
  | "text"
  | "video"
  | "audio"
  | "other";

function classify(filename?: string, ct?: string): Kind {
  const name = (filename || "").toLowerCase();
  const t = (ct || "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() || "" : "";

  if (t === "application/pdf" || ext === "pdf") return "pdf";
  if (t.startsWith("image/")) {
    if (ext === "heic" || ext === "heif" || t.includes("heic") || t.includes("heif")) return "heic";
    return "image";
  }
  if (["jpg", "jpeg", "png", "webp", "gif", "tif", "tiff", "bmp"].includes(ext)) return "image";
  if (ext === "heic" || ext === "heif") return "heic";
  if (ext === "dcm" || t === "application/dicom") return "dicom";
  if (t.includes("json") || ext === "json") return "json";
  if (t.startsWith("text/") || ["txt", "md", "csv", "tsv", "log", "hl7", "fhir"].includes(ext)) return "text";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  return "other";
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function MedicalFileViewer({
  url,
  filename,
  contentType,
  size,
  caption,
  className = "",
}: MedicalFileViewerProps) {
  const kind = classify(filename, contentType);
  const [textPreview, setTextPreview] = useState<string | null>(null);

  // Lazy-load text content for text/json types (capped at 1 MB).
  useEffect(() => {
    if (kind !== "text" && kind !== "json") return;
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((txt) => {
        if (cancelled) return;
        setTextPreview(txt.slice(0, 1024 * 1024));
      })
      .catch(() => setTextPreview(null));
    return () => { cancelled = true; };
  }, [url, kind]);

  return (
    <figure className={`overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span aria-hidden="true">{KIND_EMOJI[kind]}</span>
          <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{filename || "file"}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          {size ? <span>{formatSize(size)}</span> : null}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-0.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Download
          </a>
        </div>
      </header>

      {kind === "pdf" && (
        <iframe
          src={url}
          title={filename || "PDF preview"}
          className="h-[70vh] w-full bg-slate-100 dark:bg-slate-800"
        />
      )}

      {kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={filename || "image"}
          className="max-h-[70vh] w-full bg-slate-900 object-contain"
        />
      )}

      {kind === "video" && (
        <video src={url} controls className="max-h-[70vh] w-full bg-black" />
      )}

      {kind === "audio" && (
        <div className="p-6">
          <audio src={url} controls className="w-full" />
        </div>
      )}

      {kind === "heic" && (
        <Hint
          glyph="📸"
          title="HEIC photo"
          body="Apple's HEIC format isn't natively viewable in most browsers. Convert to JPEG/PNG before re-uploading, or download the file to view in your phone's gallery."
        />
      )}

      {kind === "dicom" && (
        <Hint
          glyph="🩻"
          title="DICOM imaging study"
          body="Open in our universal DICOM viewer for window/level, multi-frame scroll, measurements, and annotations."
          cta={{ label: "Open in viewer", href: `/dashboard/radiology/viewer?src=${encodeURIComponent(url)}` }}
        />
      )}

      {(kind === "text" || kind === "json") && (
        <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-4 text-[11px] text-emerald-200">
          {textPreview ?? "Loading…"}
        </pre>
      )}

      {kind === "other" && (
        <Hint
          glyph="📎"
          title={contentType || "Unknown file type"}
          body="No inline preview available — download the file to view it in its native application."
        />
      )}

      {caption && (
        <figcaption className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

const KIND_EMOJI: Record<Kind, string> = {
  pdf: "📄",
  image: "🖼️",
  heic: "📸",
  dicom: "🩻",
  json: "{}",
  text: "📝",
  video: "🎞️",
  audio: "🎧",
  other: "📎",
};

function Hint({
  glyph,
  title,
  body,
  cta,
}: {
  glyph: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center">
      <span className="text-5xl">{glyph}</span>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">{body}</p>
      {cta && (
        <a
          href={cta.href}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:-translate-y-0.5"
        >
          {cta.label}
        </a>
      )}
    </div>
  );
}
