"use client";

// Profile-page card that shows the user's Medical ID + current
// verification status, and — if they're unverified or rejected —
// lets them upload a government-issued photo ID.
//
// Keep the Medical ID *unmasked* here because this is the account
// owner's own profile. Masked forms (maskMedicalId) are used on
// surfaces where a third party sees the ID (e.g. a doctor viewing a
// patient summary).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IdentityBadge from "./IdentityBadge";
import {
  docTypesForCountry,
  INTERNATIONAL_DOC_TYPES,
} from "@/lib/identity-doc-types";

interface IdentityState {
  medicalId: string;
  status: "unverified" | "pending" | "verified" | "rejected";
  docType?: string;
  docFilename?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
  /** ISO 3166-1 alpha-2 country code from the user's profile.
   *  Drives the document-type dropdown so an Indian user sees
   *  Aadhaar/PAN, a US user sees Driver's License/State ID, etc. */
  country?: string;
}

// Best-effort country detection for users whose profile country is
// missing — falls back to navigator.language ("en-IN" → IN) and then
// the IANA timezone. Unknown → undefined → INTERNATIONAL list.
function detectClientCountry(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const lang =
    (typeof navigator !== "undefined" && navigator.language) || "";
  if (lang.includes("-")) {
    const region = lang.split("-").pop();
    if (region && region.length === 2) return region.toUpperCase();
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzMap: Record<string, string> = {
      "Asia/Kolkata": "IN",
      "Asia/Calcutta": "IN",
      "Asia/Karachi": "PK",
      "Asia/Dhaka": "BD",
      "Asia/Dubai": "AE",
      "Asia/Riyadh": "SA",
      "Asia/Singapore": "SG",
      "Asia/Hong_Kong": "HK",
      "Asia/Tokyo": "JP",
      "Asia/Seoul": "KR",
      "Asia/Shanghai": "CN",
      "Europe/London": "GB",
      "Europe/Paris": "FR",
      "Europe/Berlin": "DE",
      "America/New_York": "US",
      "America/Los_Angeles": "US",
      "America/Chicago": "US",
      "America/Toronto": "CA",
      "Australia/Sydney": "AU",
    };
    if (tz && tzMap[tz]) return tzMap[tz];
  } catch {
    // Intl can throw on legacy mobile browsers — fall through.
  }
  return undefined;
}

export default function IdentityVerificationCard() {
  const [identity, setIdentity] = useState<IdentityState | null>(null);
  const [loading, setLoading] = useState(true);
  // Document-type list adapts to the user's country once identity loads.
  // Until then we render the international fallback so the form is never
  // blank. Effect below swaps in the country-specific list and pre-selects
  // the most common ID once the user record is known.
  const [docType, setDocType] = useState<string>(INTERNATIONAL_DOC_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/identity/me", { cache: "no-store" });
      if (!res.ok) {
        setIdentity(null);
        return;
      }
      const data = (await res.json()) as IdentityState;
      setIdentity(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Country-aware document type list. Server-provided country wins; if
  // the user's profile doesn't have one yet, fall back to the browser's
  // best guess so the form still adapts ("en-IN" → Aadhaar, "en-US" →
  // Driver's License, "ar-AE" → Emirates ID, etc.).
  const docTypeOptions = useMemo(() => {
    const iso = identity?.country || detectClientCountry();
    return docTypesForCountry(iso);
  }, [identity?.country]);

  // Pre-select the first option when the country list changes — but
  // only if the current selection isn't valid for the new list. This
  // avoids clobbering a deliberate choice the user already made.
  useEffect(() => {
    if (!docTypeOptions.includes(docType)) {
      setDocType(docTypeOptions[0]);
    }
  }, [docTypeOptions, docType]);

  const copyId = async () => {
    if (!identity?.medicalId) return;
    try {
      await navigator.clipboard.writeText(identity.medicalId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore — some browsers block without user gesture context */
    }
  };

  const upload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("docType", docType);
      const res = await fetch("/api/identity/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || data?.error || "Upload failed");
        return;
      }
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading identity…</p>
      </div>
    );
  }
  if (!identity) return null;

  const canSubmit =
    identity.status === "unverified" || identity.status === "rejected";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Identity & Medical ID</h2>
          <p className="mt-1 text-sm text-gray-500">
            Your OduDoc Medical ID is permanent and links every consultation,
            prescription, and record on your account.
          </p>
        </div>
        <IdentityBadge status={identity.status} />
      </div>

      <div className="mt-5 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Your Medical ID
        </p>
        <div className="mt-1 flex items-center gap-3">
          <p className="font-mono text-lg font-semibold tracking-wider text-gray-900">
            {identity.medicalId || "Not assigned"}
          </p>
          {identity.medicalId && (
            <button
              onClick={copyId}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>

      {identity.status === "verified" && identity.reviewedAt && (
        <p className="mt-4 text-sm text-green-700">
          Verified on {new Date(identity.reviewedAt).toLocaleDateString()} — thank you.
        </p>
      )}

      {identity.status === "pending" && identity.submittedAt && (
        <p className="mt-4 text-sm text-amber-700">
          Submitted on {new Date(identity.submittedAt).toLocaleDateString()} —
          our team is reviewing your document. Usually completes within a
          business day.
        </p>
      )}

      {identity.status === "rejected" && identity.reviewNote && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-semibold">Previous submission was rejected</p>
          <p className="mt-1">{identity.reviewNote}</p>
          <p className="mt-2 text-xs text-red-700">
            You can re-upload a new document below.
          </p>
        </div>
      )}

      {canSubmit && (
        <div className="mt-6 space-y-3 border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-gray-900">
            Upload a government-issued photo ID
          </p>
          <p className="text-xs text-gray-500">
            Accepted: PDF, PNG, JPEG, or WebP · max 4&nbsp;MB. Your name on the
            document should match your OduDoc account name.
          </p>

          <div>
            <label className="text-xs font-medium text-gray-700">Document type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {docTypeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700">File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={upload}
            disabled={uploading || !file}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Submit for verification"}
          </button>
        </div>
      )}
    </div>
  );
}
