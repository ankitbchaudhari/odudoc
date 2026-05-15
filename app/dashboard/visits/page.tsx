"use client";

// Patient-facing "My past clinic visits" page.
//
// Surfaces EMR entries + clinic bookings that have been claimed for
// this user (claim hooks run during signup verification — see
// /api/auth/verify + /api/auth/mobile-verify + mobile-google). The
// page is read-only; the doctor / reception side owns writes.

import { useEffect, useState } from "react";
import Link from "next/link";

interface Vitals {
  bpSystolic?: number;
  bpDiastolic?: number;
  pulseBpm?: number;
  temperatureC?: number;
  spo2?: number;
  weightKg?: number;
  heightCm?: number;
}

interface EmrRow {
  id: string;
  bookingId: string;
  clinicId: string;
  clinicName?: string;
  clinicCity?: string;
  clinicCountry?: string;
  visitDate: string;
  chiefComplaint?: string;
  diagnosis?: string;
  prescriptionText?: string;
  notes?: string;
  vitals?: Vitals;
  createdAt: string;
}

interface BookingRow {
  id: string;
  doctorName: string;
  date?: string;
  timeSlot: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicCity?: string;
  arrivedAt?: string;
  paymentStatus: string;
  fee: number;
}

interface Resp {
  emr: EmrRow[];
  bookings: BookingRow[];
}

export default function PatientVisitsPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/patient/clinic-visits", { cache: "no-store" })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) setErr(d?.error || "Failed to load");
        else setData(d);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <Link href="/dashboard" className="text-xs text-gray-500 dark:text-slate-400 hover:underline">← Dashboard</Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">My past clinic visits</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          In-person visits + EMR records from any OduDoc clinic, including
          visits made before you created your account (matched on your phone).
        </p>
      </header>

      {loading && <p className="text-sm text-gray-500 dark:text-slate-400">Loading…</p>}
      {err && <p className="rounded-lg bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{err}</p>}

      {data && data.emr.length === 0 && data.bookings.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-gray-700 dark:text-slate-300">No clinic visits yet.</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Past clinic visits made with this phone number will show up here.
          </p>
          <Link href="/doctors" className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Find a doctor
          </Link>
        </div>
      )}

      {data && (data.emr.length > 0 || data.bookings.length > 0) && (
        <div className="space-y-4">
          {/* EMR-backed visits first — they have the most info. */}
          {data.emr.map((e) => (
            <article key={e.id} className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <header className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                <div>
                  <p className="text-xs font-mono text-gray-400 dark:text-slate-500">{e.bookingId}</p>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">{e.clinicName || "Clinic visit"}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {[e.clinicCity, e.clinicCountry].filter(Boolean).join(", ")}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {new Date(e.visitDate).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </header>

              <dl className="mt-3 space-y-2 text-sm">
                {e.chiefComplaint && <KV label="Complaint" value={e.chiefComplaint} />}
                {e.diagnosis && <KV label="Diagnosis" value={e.diagnosis} />}
                {e.prescriptionText && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Prescription</dt>
                    <dd className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-slate-800/50 px-3 py-2 font-mono text-xs text-gray-800 dark:text-slate-200">
                      {e.prescriptionText}
                    </dd>
                  </div>
                )}
                {e.notes && <KV label="Notes" value={e.notes} />}
                {e.vitals && hasVitals(e.vitals) && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Vitals</dt>
                    <dd className="mt-1 grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3">
                      {e.vitals.bpSystolic && e.vitals.bpDiastolic && <Pill label="BP" value={`${e.vitals.bpSystolic}/${e.vitals.bpDiastolic}`} />}
                      {e.vitals.pulseBpm && <Pill label="Pulse" value={`${e.vitals.pulseBpm} bpm`} />}
                      {e.vitals.temperatureC && <Pill label="Temp" value={`${e.vitals.temperatureC}°C`} />}
                      {e.vitals.spo2 && <Pill label="SpO₂" value={`${e.vitals.spo2}%`} />}
                      {e.vitals.weightKg && <Pill label="Weight" value={`${e.vitals.weightKg} kg`} />}
                      {e.vitals.heightCm && <Pill label="Height" value={`${e.vitals.heightCm} cm`} />}
                    </dd>
                  </div>
                )}
              </dl>
            </article>
          ))}

          {/* Bookings without EMR — the patient booked but reception
              didn't (yet) save EMR notes. Less detail but still useful
              to surface so the patient sees a complete history. */}
          {data.bookings
            .filter((b) => !data.emr.find((e) => e.bookingId === b.id))
            .map((b) => (
              <article key={b.id} className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <header className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                  <div>
                    <p className="text-xs font-mono text-gray-400 dark:text-slate-500">{b.id}</p>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">{b.doctorName}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {b.clinicName} {b.clinicCity ? `· ${b.clinicCity}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-100 dark:bg-sky-900/40 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                    {b.date || "—"} · {b.timeSlot}
                  </span>
                </header>
                <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                  {b.arrivedAt ? "✓ Visit completed" : "Booking record (no EMR entry yet)"} ·
                  {" "}Payment: {b.paymentStatus}
                </p>
              </article>
            ))}
        </div>
      )}
    </main>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">{label}</dt>
      <dd className="text-gray-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center justify-between gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1">
      <span className="font-semibold text-gray-600 dark:text-slate-400">{label}</span>
      <span className="text-gray-800 dark:text-slate-200">{value}</span>
    </span>
  );
}

function hasVitals(v: Vitals): boolean {
  return Boolean(
    v.bpSystolic || v.bpDiastolic || v.pulseBpm || v.temperatureC ||
    v.spo2 || v.weightKg || v.heightCm,
  );
}
