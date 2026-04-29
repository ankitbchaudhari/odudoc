"use client";

// Dashboard gate — wraps the doctor dashboard and only allows the
// underlying content to render when the doctor is verified.
//
// Three states the gate can show:
//   1. "not_started" — new doctor, no docs uploaded yet. Shows the
//                      submission form.
//   2. "pending_review" — docs submitted, admin hasn't approved yet.
//                         Shows a "we're checking" interstitial.
//   3. "rejected" — admin returned the submission with a reason.
//                   Shows the reason + lets the doctor resubmit.
//
// Verified doctors get the gate stripped out — children render
// directly.

import { useEffect, useRef, useState } from "react";

interface VerificationStatus {
  verified: boolean;
  verifiedAt?: string;
  verificationSubmittedAt?: string;
  verificationDocs?: {
    idFrontUrl?: string;
    idBackUrl?: string;
    selfieUrl?: string;
    licenseUrl?: string;
  };
  verificationRejectionReason?: string;
  licenseCountry?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
}

export default function DoctorVerificationGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/doctors/me/verification", {
        cache: "no-store",
      });
      if (!res.ok) {
        // 401/403/404 — render children. The dashboard's own auth
        // check will surface the right error.
        setStatus(null);
        return;
      }
      const data = (await res.json()) as VerificationStatus;
      setStatus(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Loading: render nothing visible to avoid flashing the dashboard
  // before the gate can decide whether to show.
  if (loading || !status) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg
          className="h-8 w-8 animate-spin text-primary-600"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  // Verified: pass through to the real dashboard.
  if (status.verified) {
    return <>{children}</>;
  }

  const submitted = !!status.verificationSubmittedAt;
  const rejected = !submitted && !!status.verificationRejectionReason;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData(formRef.current!);
      // Drop empty file fields so the server-side rollup doesn't
      // try to upload zero-byte placeholders.
      const cleaned = new FormData();
      fd.forEach((v, k) => {
        if (v instanceof File && v.size === 0) return;
        cleaned.append(k, v);
      });
      const res = await fetch("/api/doctors/me/verification", {
        method: "POST",
        body: cleaned,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSuccess(true);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/30 py-10">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-amber-200/40 via-rose-200/40 to-fuchsia-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4">
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-7 shadow-xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-amber-500/30">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <div>
                <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-100">
                  Verification required
                </p>
                <h1 className="mt-2 bg-gradient-to-r from-slate-900 via-amber-900 to-rose-900 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
                  {submitted
                    ? "We're reviewing your documents"
                    : rejected
                      ? "Verification needs another look"
                      : "Get verified to activate your dashboard"}
                </h1>
                <p className="mt-2 max-w-xl text-sm text-slate-600">
                  {submitted
                    ? "Our team typically responds within 24–48 hours. You'll get an email once the review is complete and your dashboard activates."
                    : rejected
                      ? "An admin reviewed your submission and asked for a clearer copy. The reason is below — please resubmit."
                      : "OduDoc requires every practising doctor to upload a government ID, a selfie, and a medical-license document. Your dashboard activates the moment our team approves the submission."}
                </p>
              </div>
            </div>
          </div>

          {rejected && status.verificationRejectionReason && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <b>Reason:</b> {status.verificationRejectionReason}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Submission received — refreshing status…
            </div>
          )}
          {error && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Status label="ID front" value={!!status.verificationDocs?.idFrontUrl} />
              <Status label="ID back" value={!!status.verificationDocs?.idBackUrl} />
              <Status label="Selfie" value={!!status.verificationDocs?.selfieUrl} />
              <Status label="License" value={!!status.verificationDocs?.licenseUrl} />
            </div>
          ) : (
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FileField
                  label="Government photo ID — front"
                  name="idFront"
                  hint="Passport, driver's licence or national ID"
                  required={!status.verificationDocs?.idFrontUrl}
                  uploaded={!!status.verificationDocs?.idFrontUrl}
                />
                <FileField
                  label="Government photo ID — back"
                  name="idBack"
                  hint="Skip if your ID is single-sided (e.g. passport)"
                  uploaded={!!status.verificationDocs?.idBackUrl}
                />
                <FileField
                  label="Selfie holding the ID"
                  name="selfie"
                  hint="Make sure both your face and the ID are clearly visible"
                  required={!status.verificationDocs?.selfieUrl}
                  uploaded={!!status.verificationDocs?.selfieUrl}
                />
                <FileField
                  label="Medical license document"
                  name="license"
                  hint="PDF or photo of your council registration"
                  required={!status.verificationDocs?.licenseUrl}
                  uploaded={!!status.verificationDocs?.licenseUrl}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  License details
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input
                    label="Country (ISO)"
                    name="licenseCountry"
                    placeholder="IN"
                    defaultValue={status.licenseCountry}
                  />
                  <Input
                    label="License number"
                    name="licenseNumber"
                    placeholder="MCI / NPI / GMC"
                    defaultValue={status.licenseNumber}
                  />
                  <Input
                    label="Expiry"
                    name="licenseExpiry"
                    type="date"
                    defaultValue={status.licenseExpiry}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Files are stored privately on OduDoc's verification server and
                are only viewable by our admin team. By submitting you confirm
                the documents are genuine and current.
              </p>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:shadow-xl disabled:opacity-50"
                >
                  {submitting ? "Uploading…" : "Submit for review"}
                  {!submitting && <span>→</span>}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-600 shadow-sm">
          <b>While verification is pending,</b> all dashboard features
          (consultations, EMR, prescriptions, payouts, AI tools) are paused.
          Verified doctors can still book consultations through your public
          profile, but they'll only resolve once your account is activated.
        </div>
      </div>
    </div>
  );
}

function Status({ label, value }: { label: string; value: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          value ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
        }`}
      >
        {value ? "✓" : "—"}
      </span>
      <span className="font-semibold">{label}</span>
    </div>
  );
}

function FileField({
  label,
  name,
  hint,
  required,
  uploaded,
}: {
  label: string;
  name: string;
  hint?: string;
  required?: boolean;
  uploaded?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
        <span>
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
        {uploaded && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
            On file — re-upload to replace
          </span>
        )}
      </span>
      <input
        type="file"
        name={name}
        accept="image/*,application/pdf"
        className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-amber-700 hover:file:bg-amber-200"
      />
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

function Input({
  label,
  name,
  placeholder,
  defaultValue,
  type,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">
        {label}
      </span>
      <input
        type={type || "text"}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue || ""}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
      />
    </label>
  );
}
