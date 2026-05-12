"use client";

// Public medical certificate verification page.
//
// HR / employer / school types in the verification code (or scans
// the QR off the printed certificate) and lands here. We show a
// strong "verified" or "not verified" answer with the supporting
// metadata (issuing doctor, dates, diagnosis) so the verifier can
// match it to the printed certificate they're holding.

import { use, useCallback, useEffect, useState } from "react";

interface VerifyResponse {
  verified: boolean;
  reason?: "not_found" | "voided";
  message?: string;
  certificate?: {
    number: string;
    type: string;
    issueDate: string;
    fromDate?: string;
    toDate?: string;
    daysOfRest?: number;
    diagnosis: string;
    restrictions?: string;
    doctorName: string;
    doctorQualification?: string;
    doctorRegistration?: string;
    clinicName?: string;
    status: string;
  };
  patientName?: string | null;
}

const CERT_TYPE_LABEL: Record<string, string> = {
  "sick-leave": "Sick leave certificate",
  "fitness-to-work": "Fitness to work certificate",
  "fitness-to-travel": "Fitness to travel certificate",
  "fitness-for-activity": "Fitness for activity certificate",
  vaccination: "Vaccination certificate",
  general: "Medical certificate",
};

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/certificates/${token}`);
      const body: VerifyResponse = await res.json();
      setData(body);
    } catch {
      setData({
        verified: false,
        reason: "not_found",
        message: "Could not reach the verification service. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-pulse text-slate-400">Verifying…</div>
      </div>
    );
  }

  const verified = data?.verified === true;
  const cert = data?.certificate;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 py-10">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div
          className={`absolute -top-40 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full blur-3xl ${
            verified
              ? "bg-gradient-to-br from-emerald-200/40 via-cyan-200/40 to-indigo-200/40"
              : "bg-gradient-to-br from-rose-200/40 via-amber-200/40 to-orange-200/40"
          }`}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4">
        <div className="mb-5 text-center">
          <p
            className={`text-[11px] font-bold uppercase tracking-wider ${
              verified ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            OduDoc · Certificate verification
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/85 shadow-xl backdrop-blur-xl">
          {verified ? (
            <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-bold text-emerald-900">
                    Verified — issued by an OduDoc-registered doctor
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-700">
                    Certificate {cert?.number} · {cert?.status}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 to-amber-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-bold text-rose-900">
                    {data?.reason === "voided"
                      ? "Certificate voided"
                      : "Certificate not found"}
                  </p>
                  <p className="mt-0.5 text-xs text-rose-700">
                    {data?.message ||
                      "No certificate matches this verification code."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {verified && cert && (
            <div className="px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {CERT_TYPE_LABEL[cert.type] || "Medical certificate"}
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                {data?.patientName || "Patient"}
              </h1>

              <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Certificate number" value={cert.number} mono />
                <Field label="Issued on" value={cert.issueDate} />
                {cert.fromDate && (
                  <Field label="Valid from" value={cert.fromDate} />
                )}
                {cert.toDate && (
                  <Field
                    label="Valid until"
                    value={
                      cert.toDate +
                      (cert.daysOfRest ? ` (${cert.daysOfRest} days)` : "")
                    }
                  />
                )}
                <Field label="Diagnosis" value={cert.diagnosis} wide />
                {cert.restrictions && (
                  <Field label="Restrictions" value={cert.restrictions} wide />
                )}
              </dl>

              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 dark:bg-slate-900 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Issuing doctor
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {cert.doctorName}
                  {cert.doctorQualification ? `, ${cert.doctorQualification}` : ""}
                </p>
                {cert.doctorRegistration && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Reg. no: <span className="font-mono">{cert.doctorRegistration}</span>
                  </p>
                )}
                {cert.clinicName && (
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{cert.clinicName}</p>
                )}
              </div>

              <p className="mt-5 text-center text-[11px] text-slate-500 dark:text-slate-400">
                Verification audited at <span className="tabular-nums">{new Date().toISOString().slice(0, 19).replace("T", " ")} UTC</span>.
                If the printed certificate doesn&apos;t match these details, it
                may be forged — contact the issuing clinic.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  wide,
  mono,
}: {
  label: string;
  value: string;
  wide?: boolean;
  mono?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm text-slate-800 dark:text-slate-200 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
