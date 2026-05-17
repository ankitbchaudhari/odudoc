"use client";

// /consult-now — instant-consult landing.
// Patient picks a specialty, sees doctors who are online RIGHT NOW,
// taps one, and lands straight on that doctor's profile with the
// booking modal pre-opened. Refreshes every 8s so a doctor toggling
// online surfaces near-realtime.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface InstantDoctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  fee: number;
  city?: string;
  imageUrl?: string;
  instantAvailableUntil: string;
}

const SPECIALTIES = [
  { id: "", label: "Any specialty", emoji: "🩺" },
  { id: "general physician", label: "General Physician", emoji: "👨‍⚕️" },
  { id: "pediatrician", label: "Pediatrician", emoji: "👶" },
  { id: "dermatologist", label: "Dermatologist", emoji: "✨" },
  { id: "gynecologist", label: "Gynecologist", emoji: "🌷" },
  { id: "psychiatrist", label: "Psychiatrist", emoji: "🧠" },
  { id: "cardiologist", label: "Cardiologist", emoji: "❤️" },
  { id: "endocrinologist", label: "Endocrinologist", emoji: "🩸" },
  { id: "orthopedist", label: "Orthopedist", emoji: "🦴" },
];

export default function ConsultNowPage() {
  const [specialty, setSpecialty] = useState("");
  const [doctors, setDoctors] = useState<InstantDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const url = specialty
      ? `/api/doctors/instant-available?specialty=${encodeURIComponent(specialty)}`
      : `/api/doctors/instant-available`;
    const r = await fetch(url, { cache: "no-store" });
    const d = await r.json().catch(() => ({ available: [] }));
    setDoctors(d.available || []);
    setLoading(false);
  }, [specialty]);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const top = doctors[0];

  return (
    <main className="relative mx-auto max-w-4xl px-4 py-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-400/30 via-teal-400/30 to-sky-300/30 blur-3xl dark:from-emerald-600/30 dark:via-teal-600/30 dark:to-sky-500/20" />
      </div>

      <header className="mb-6 overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-emerald-500/5">
        <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-600 px-6 py-6 text-white">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white ring-1 ring-white/25">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/80" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              Live now
            </div>
            <h1 className="mt-2 text-3xl font-bold leading-tight">Consult a doctor in 2 minutes</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/85">
              Pick a specialty. We&apos;ll show you doctors who are online right now and ready to take your call.
            </p>
          </div>
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full border-2 border-white/10" />
        </div>
      </header>

      {/* Specialty chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {SPECIALTIES.map((s) => {
          const active = s.id === specialty;
          return (
            <button
              key={s.id || "any"}
              onClick={() => setSpecialty(s.id)}
              className={
                active
                  ? "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/30"
                  : "inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 hover:border-emerald-300 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition"
              }
            >
              <span>{s.emoji}</span> {s.label}
            </button>
          );
        })}
      </div>

      {/* Hero "first available" card */}
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Looking for available doctors…</p>
      ) : top ? (
        <>
          <FirstAvailableCard doctor={top} now={now} />
          {doctors.length > 1 && (
            <div className="mt-6">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                {doctors.length - 1} more online
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {doctors.slice(1).map((d) => (
                  <SmallDoctorCard key={d.id} doctor={d} />
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <EmptyState specialty={specialty} />
      )}
    </main>
  );
}

function minutesLeft(untilIso: string, now: number): number {
  const diff = new Date(untilIso).getTime() - now;
  return Math.max(0, Math.round(diff / 60_000));
}

function FirstAvailableCard({ doctor, now }: { doctor: InstantDoctor; now: number }) {
  const mins = minutesLeft(doctor.instantAvailableUntil, now);
  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 dark:from-slate-900 dark:via-emerald-950/20 dark:to-teal-950/20 p-6 shadow-xl shadow-emerald-500/10">
      <div className="flex flex-wrap items-start gap-5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 ring-4 ring-white dark:ring-slate-900">
          {doctor.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doctor.imageUrl} alt={doctor.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
              {doctor.name.charAt(0)}
            </span>
          )}
          <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Online · ~{mins || "<1"} min left
          </div>
          <h2 className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-slate-100">{doctor.name}</h2>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{doctor.specialty}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
            {doctor.city && <span>📍 {doctor.city}</span>}
            <span>·</span>
            <span>⭐ {doctor.rating}</span>
            <span>·</span>
            <span>💰 ${doctor.fee}</span>
          </div>
        </div>
        <Link
          href={`/doctors/${doctor.id}#consult-now`}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 hover:shadow-xl transition"
        >
          <span className="relative z-10">Connect now →</span>
          <span className="absolute inset-0 bg-gradient-to-r from-teal-600 via-sky-600 to-emerald-600 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </div>
    </div>
  );
}

function SmallDoctorCard({ doctor }: { doctor: InstantDoctor }) {
  return (
    <li className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md hover:border-emerald-300 transition">
      <Link href={`/doctors/${doctor.id}#consult-now`} className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
          {doctor.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doctor.imageUrl} alt={doctor.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
              {doctor.name.charAt(0)}
            </span>
          )}
          <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{doctor.name}</p>
          <p className="truncate text-xs text-gray-500 dark:text-slate-400">{doctor.specialty} · ⭐ {doctor.rating}</p>
        </div>
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">${doctor.fee} →</span>
      </Link>
    </li>
  );
}

function EmptyState({ specialty }: { specialty: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/40 p-8 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-400 to-gray-500 text-2xl text-white">⏳</span>
      <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-slate-300">
        No {specialty ? specialty : "doctors"} online right now.
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
        Page refreshes every 8 seconds. Or pick a different specialty above.
      </p>
      <Link
        href="/doctors"
        className="mt-4 inline-block rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/30"
      >
        Browse all doctors instead
      </Link>
    </div>
  );
}
