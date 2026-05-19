// Public share-token landing page.
//
// No login. Token resolves to scoped record slices; expired or
// revoked tokens show a friendly "access ended" card. Every visit
// is logged in the patient's audit page.

import { dereferenceShareToken } from "@/lib/share-token-store";
import { fingerprintIp } from "@/lib/pharma/scan-log-store";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared medical record",
  description: "Time-limited view of a medical record shared on OduDoc.",
  robots: { index: false, follow: false },
};

const SCOPE_LABEL: Record<string, { label: string; emoji: string }> = {
  consultations: { label: "Consultation notes", emoji: "🩺" },
  prescriptions: { label: "Prescriptions", emoji: "💊" },
  lab_reports:   { label: "Lab reports", emoji: "🧪" },
  radiology:     { label: "Radiology images", emoji: "🩻" },
  vitals:        { label: "Vitals + wearables", emoji: "❤️" },
  vaccinations:  { label: "Vaccinations", emoji: "💉" },
};

export default async function SharePage({ params }: { params: { token: string } }) {
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const ua = h.get("user-agent") || undefined;
  const token = dereferenceShareToken(params.token, fingerprintIp(ip), ua);
  if (!token) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 dark:border-rose-700 dark:bg-rose-950/40">
          <p className="text-3xl">🔒</p>
          <h1 className="mt-3 text-xl font-bold text-rose-900 dark:text-rose-200">Access ended</h1>
          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
            This shared record has expired or been revoked by the patient.
            Ask them to send a fresh link.
          </p>
        </div>
      </main>
    );
  }
  // Show shell only — actual record loading is out of scope for the MVP
  // and would require resolving the patient's records server-side scope-by-
  // scope (consultations-store, prescriptions-store, etc) and rendering them
  // here. We surface the metadata + the scopes the patient unlocked.
  const issuedAgoMs = Date.now() - new Date(token.createdAt).getTime();
  const expiresInMs = new Date(token.expiresAt).getTime() - Date.now();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-700 dark:bg-emerald-950/30">
        <p className="text-3xl">📄</p>
        <h1 className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
          Shared medical record
        </h1>
        <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
          Patient: <strong>{token.patientEmail}</strong>
          {token.consumerLabel && <> · Shared with: <strong>{token.consumerLabel}</strong></>}
        </p>
        <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
          Issued {humanise(issuedAgoMs)} ago · Expires in {humanise(expiresInMs)}.
          This visit has been logged on the patient&apos;s audit page.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
          Granted scopes
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {token.scopes.map((s) => (
            <div key={s} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-2xl">{SCOPE_LABEL[s]?.emoji}</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">{SCOPE_LABEL[s]?.label || s}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {token.consultationIds && s === "consultations" && token.consultationIds.length
                  ? `${token.consultationIds.length} specific item(s) unlocked`
                  : token.prescriptionIds && s === "prescriptions" && token.prescriptionIds.length
                    ? `${token.prescriptionIds.length} specific item(s) unlocked`
                    : "All records in this category"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        <strong>For the recipient:</strong> If you need a PDF copy or want to discuss the record with
        the patient&apos;s treating physician, ask the patient to share contact details directly.
        OduDoc does not facilitate doctor-to-doctor communication through anonymous share links —
        time-bound viewing only.
      </p>

      <p className="mt-3 text-center text-[11px] text-slate-400">
        Share access logged at {new Date().toLocaleString()}.
      </p>
    </main>
  );
}

function humanise(ms: number): string {
  const abs = Math.abs(ms);
  const hours = Math.round(abs / 3600_000);
  if (hours < 1) return "less than an hour";
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}
