"use client";

import { useState } from "react";

interface UploadedRx {
  filename: string;
  previewUrl?: string | null;
  originalName: string;
}

interface Props {
  productId: string;
  productName: string;
  value?: UploadedRx | null;
  onChange: (productId: string, rx: UploadedRx | null) => void;
}

// Small inline Rx uploader for use on the cart page when an item is flagged
// prescriptionRequired. Shows three states:
//   - empty:    file input + "Upload Rx"
//   - uploading: disabled with spinner label
//   - uploaded: filename + remove button + optional preview link
export default function PrescriptionUploader({ productId, productName, value, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const res = await fetch("/api/prescriptions/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Upload failed");
        return;
      }
      onChange(productId, {
        filename: data.filename,
        previewUrl: data.previewUrl,
        originalName: file.name,
      });
    } catch {
      setErr("Upload failed");
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs">
        <span className="font-semibold text-green-800">Rx attached:</span>
        <span className="truncate text-green-900" title={value.originalName}>
          {value.originalName}
        </span>
        {value.previewUrl && (
          <a href={value.previewUrl} target="_blank" rel="noopener"
            className="text-primary-700 underline">
            preview
          </a>
        )}
        <button
          type="button"
          onClick={() => onChange(productId, null)}
          className="ml-auto text-rose-600 hover:text-rose-700"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.9 5 5 0 119.9 1.17A3.5 3.5 0 0118 16M9 13l3-3m0 0l3 3m-3-3v8" />
        </svg>
        {busy ? "Uploading…" : "Upload Rx for " + productName}
        <input
          type="file"
          className="sr-only"
          accept=".pdf,image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {err && <p className="mt-1 text-xs text-rose-600">{err}</p>}
    </div>
  );
}
