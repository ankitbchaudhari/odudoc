"use client";

// Patient-driven doctor referral form. Patients suggest their own GP /
// specialist to OduDoc; we send a soft warm-intro to the doctor and
// notify the admin so they can do warm follow-up.

import { useState } from "react";
import Link from "next/link";

const SPECIALTIES = [
  "General Physician",
  "Paediatrician",
  "Gynaecologist",
  "Dermatologist",
  "Cardiologist",
  "Psychiatrist",
  "ENT",
  "Orthopaedic",
  "Ophthalmologist",
  "Dentist",
  "Other",
];

export default function ReferDoctorPage() {
  const [doctorName, setDoctorName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!doctorName.trim()) {
      setError("Doctor's name is required.");
      return;
    }
    if (!doctorEmail.trim() && !doctorPhone.trim()) {
      setError("Add at least an email or phone for the doctor.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/refer-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorName,
          doctorEmail: doctorEmail.trim() || undefined,
          doctorPhone: doctorPhone.trim() || undefined,
          doctorSpecialty: doctorSpecialty || undefined,
          clinicName: clinicName.trim() || undefined,
          city: city.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDone(true);
    } catch (e2) {
      setError((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDoctorName("");
    setDoctorEmail("");
    setDoctorPhone("");
    setDoctorSpecialty("");
    setClinicName("");
    setCity("");
    setNote("");
    setDone(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-2 text-xs">
        <Link href="/dashboard" className="text-primary-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-slate-900">Refer your doctor</h1>
      <p className="mt-2 text-sm text-slate-600">
        Suggest your GP or specialist to OduDoc. We&rsquo;ll send them a short note saying you recommended us — no spam, no follow-up loops.
      </p>

      {done ? (
        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="text-4xl">🙌</div>
          <h2 className="mt-3 text-xl font-bold text-emerald-900">Thanks for the referral</h2>
          <p className="mt-2 text-sm text-emerald-800">
            We&rsquo;ll reach out to <strong>{doctorName}</strong> within a day. If they join the pilot, you&rsquo;ll see a thank-you in your dashboard.
          </p>
          <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Refer another doctor
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-700"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <Field label="Doctor's full name" required>
            <input
              required
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr Anita Sharma"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email (preferred)">
              <input
                type="email"
                value={doctorEmail}
                onChange={(e) => setDoctorEmail(e.target.value)}
                placeholder="dr.sharma@clinic.in"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </Field>
            <Field label="Phone (with country code)">
              <input
                value={doctorPhone}
                onChange={(e) => setDoctorPhone(e.target.value)}
                placeholder="+15551234567 (with country code)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </Field>
          </div>

          <p className="-mt-2 text-xs text-slate-500">
            We need at least one. If you provide email, we&rsquo;ll send a soft warm-intro saying you recommended us. Phone is for our team to call directly — we never share your number.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Specialty">
              <select
                value={doctorSpecialty}
                onChange={(e) => setDoctorSpecialty(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">— Select —</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="City">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </Field>
          </div>

          <Field label="Clinic / hospital name">
            <input
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Sharma Family Clinic"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </Field>

          <Field label="Anything you'd like us to mention?">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Dr Sharma sees a lot of paediatric cases and complains about typing notes — would love your AI scribe."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </Field>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:scale-[1.01] disabled:opacity-60"
          >
            {busy ? "Sending…" : "Submit referral"}
          </button>

          <p className="text-center text-[11px] text-slate-400">
            Soft outreach only — your doctor can reply &ldquo;not interested&rdquo; and we stop. Your name is never shared with anyone except them.
          </p>
        </form>
      )}
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
