"use client";

// V9 §2 photo upload — drop-in component.
//
// Usage:
//   <PhotoUpload
//     subject="self"
//     subjectId={userId}
//     initialUrl={currentPhotoUrl}
//     onUploaded={(url) => savePhoto(url)}
//     shape="circle"   // "circle" for face shots, "square" for logos
//   />
//
// Handles client-side: preview, type/size pre-validation, calling
// /api/upload/photo with FormData, surfacing the returned URL.
//
// Client-side compression is a TODO — V9 §2.2.2 says compress on
// device when over 5 MB. For now we reject anything over 5 MB and
// let the user resize manually. Real auto-compression needs
// browser-image-compression or a Canvas-based downscale step.

import { useCallback, useRef, useState } from "react";

export interface PhotoUploadProps {
  /** What kind of photo this is — V9 §2.4 storage folder + auth gate. */
  subject: "self" | "patient" | "doctor" | "entity-logo" | "entity-hero" | "wound";
  /** Stable id the photo is associated with (user id, patient id,
   *  entity slug). Stored in the URL path. */
  subjectId: string;
  /** Existing URL to render before any upload. */
  initialUrl?: string;
  /** Called with the new URL after a successful upload. Persist it
   *  on the parent record yourself — this component only does the
   *  upload, not the linking. */
  onUploaded?: (url: string, pathname: string) => void;
  /** Visual shape. */
  shape?: "circle" | "square";
  /** Pixel size of the preview box. Defaults to 96. */
  size?: number;
  /** Label shown under the box. */
  label?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export default function PhotoUpload({
  subject,
  subjectId,
  initialUrl,
  onUploaded,
  shape = "circle",
  size = 96,
  label,
}: PhotoUploadProps) {
  const [url, setUrl] = useState<string | undefined>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setErr(null);
      if (!ALLOWED.includes(file.type)) {
        setErr("JPEG, PNG, or WebP only.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setErr(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
        return;
      }
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("subject", subject);
        fd.append("subjectId", subjectId);
        const r = await fetch("/api/upload/photo", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setErr(
            j.error === "too_large" ? "File too large. Max 5 MB."
            : j.error === "unsupported_type" ? "Type not supported. JPEG, PNG, or WebP only."
            : j.error === "forbidden_subject" ? "You don't have permission to upload that photo type."
            : j.error === "unauthenticated" ? "Please sign in again."
            : "Upload failed. Try again.",
          );
          return;
        }
        setUrl(j.url);
        onUploaded?.(j.url, j.pathname);
      } catch {
        setErr("Network error while uploading.");
      } finally {
        setBusy(false);
      }
    },
    [subject, subjectId, onUploaded],
  );

  const radius = shape === "circle" ? "rounded-full" : "rounded-2xl";

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={`group relative overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-[#0F6E56] hover:bg-[#0F6E56]/5 disabled:cursor-not-allowed disabled:opacity-60 ${radius}`}
        style={{ width: size, height: size }}
        aria-label={`Upload ${subject} photo`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className={`h-full w-full object-cover ${radius}`} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-7 w-7 text-gray-400 group-hover:text-[#0F6E56]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 7a2 2 0 012-2h2l2-2h4l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" />
            </svg>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {label && <p className="text-xs font-medium text-gray-600">{label}</p>}
      {err && <p className="max-w-[180px] text-center text-[11px] text-rose-600">{err}</p>}
    </div>
  );
}
