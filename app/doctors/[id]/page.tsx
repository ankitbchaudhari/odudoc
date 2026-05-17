"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doctorReviews, type Doctor } from "@/lib/data";
import BookingModal from "@/components/BookingModal";
import DoctorPresenceBadge, { PresenceDot } from "@/components/DoctorPresenceBadge";
import { pickDoctorPhoto } from "@/lib/doctor-photos";
import Breadcrumbs from "@/components/Breadcrumbs";
import ConsultGateModal from "@/components/ConsultGateModal";
import DoctorAiAssistant from "@/components/DoctorAiAssistant";
import ClinicLocations from "@/components/ClinicLocations";
import { councilLabelFor } from "@/lib/medical-councils";

export default function DoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [consultGateOpen, setConsultGateOpen] = useState(false);
  // When a patient clicks "Book online" on a clinic card, ClinicLocations
  // fires the callback below, which opens BookingModal with this clinic
  // tagged. The booking POST then lands as an in-person clinic visit.
  const [bookClinicId, setBookClinicId] = useState<string | null>(null);
  const [bookClinicName, setBookClinicName] = useState<string | null>(null);
  // Clinic summary for the header CTA. Drives:
  //   - whether the "Visit Clinic" button renders at all (only if the
  //     doctor has at least one active clinic),
  //   - the destination URL (single clinic → straight to /book-clinic,
  //     multiple → /clinics picker),
  //   - the price chip ("Clinic visit $X") shown alongside the telemed
  //     price when the override differs from the doctor's default fee.
  const [clinicSummary, setClinicSummary] = useState<{
    count: number;
    firstId: string | null;
    minFee: number | null;
    maxFee: number | null;
  } | null>(null);

  // Refresh from the admin-managed API so edits show up live.
  useEffect(() => {
    if (!params.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/doctors/${params.id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.doctor) setDoctor(d.doctor);
        else setDoctor(null);
      })
      .catch(() => setDoctor(null))
      .finally(() => setLoading(false));

    // Fetch active clinics in parallel so the header CTA can render
    // immediately on first paint, not after a second async ping.
    fetch(`/api/clinics/by-doctor/${params.id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { clinics: [] }))
      .then((d) => {
        const list: Array<{ id: string; feeOverride?: number }> = d.clinics || [];
        if (list.length === 0) {
          setClinicSummary({ count: 0, firstId: null, minFee: null, maxFee: null });
          return;
        }
        const fees = list
          .map((c) => c.feeOverride)
          .filter((f): f is number => typeof f === "number");
        setClinicSummary({
          count: list.length,
          firstId: list[0].id,
          minFee: fees.length ? Math.min(...fees) : null,
          maxFee: fees.length ? Math.max(...fees) : null,
        });
      })
      .catch(() => setClinicSummary({ count: 0, firstId: null, minFee: null, maxFee: null }));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 dark:border-slate-800 border-t-primary-600" />
          <p className="text-sm">Loading doctor profile…</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-br from-sky-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-teal-100 dark:from-sky-950/40 dark:to-teal-950/40 text-5xl shadow-inner">😔</div>
          <h1 className="mt-4 text-2xl font-extrabold text-gray-900 dark:text-slate-100">Doctor Not Found</h1>
          <p className="mt-2 text-gray-500 dark:text-slate-400">The doctor you are looking for does not exist.</p>
          <Link href="/doctors" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition">
            Browse Doctors
          </Link>
        </div>
      </div>
    );
  }

  const reviews = doctorReviews[doctor.id] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Doctors", href: "/doctors" },
              { name: doctor.name, href: `/doctors/${doctor.id}` },
            ]}
          />
        </div>

        {/* Profile Card */}
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm hover:shadow-md transition p-6">
          {/* Decorative gradient backdrop */}
          <div aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-sky-300/40 via-cyan-300/30 to-teal-300/20 dark:from-sky-700/20 dark:via-cyan-700/15 dark:to-teal-700/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-20 top-10 h-56 w-56 rounded-full bg-gradient-to-br from-violet-300/30 to-indigo-300/20 dark:from-violet-700/15 dark:to-indigo-700/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row">
            <div className="relative self-center sm:self-start">
              {/* Hero gradient backdrop behind photo */}
              <div aria-hidden className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-sky-400 via-cyan-400 to-teal-400 dark:from-sky-600 dark:via-cyan-600 dark:to-teal-600 opacity-30 blur-lg" />
              <div
                className={`relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-2xl text-4xl font-bold text-white shadow-xl ring-4 ring-white dark:ring-slate-900 ${doctor.imageColor}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pickDoctorPhoto({ id: doctor.id, gender: doctor.gender, explicit: doctor.photoUrl })}
                  alt={doctor.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
                  {doctor.initials}
                </div>
              </div>
              <PresenceDot doctorId={doctor.id} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-start">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">{doctor.name}</h1>
                {doctor.verified && (
                  <span
                    title="Credentials verified by OduDoc"
                    aria-label="Verified doctor"
                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-2 py-0.5 text-xs font-semibold text-white shadow ring-1 ring-white"
                  >
                    <span aria-hidden="true">✓</span> Verified
                  </span>
                )}
                <DoctorPresenceBadge doctorId={doctor.id} size="md" />
              </div>
              <p className="text-base font-semibold text-sky-700 dark:text-sky-400">{doctor.specialty}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">{doctor.qualifications}</p>
              {doctor.verified && doctor.licenseNumber && (() => {
                const council = councilLabelFor(doctor.licenseCountry);
                return (
                  <p
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                    title={`${council.full} — verified by OduDoc`}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                    {council.label} Reg. {doctor.licenseNumber}
                  </p>
                );
              })()}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 ring-1 ring-amber-200 dark:ring-amber-900 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <svg className="h-3.5 w-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  {doctor.rating} · {doctor.reviewCount} reviews
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 ring-1 ring-violet-200 dark:ring-violet-900 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                  🎓 {doctor.experience} yrs
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 ring-1 ring-teal-200 dark:ring-teal-900 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                  📍 {doctor.city}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-400 dark:text-slate-500">{doctor.location}</p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              {/* Price summary — when the clinic charges a different
                  amount than telemed, show both side by side so the
                  patient picks knowing the difference. */}
              {clinicSummary && clinicSummary.count > 0 && clinicSummary.minFee !== null && clinicSummary.minFee !== doctor.fee ? (
                <div className="flex flex-col items-end">
                  <div className="flex items-baseline gap-3">
                    <span className="flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500/70 dark:text-indigo-300/70">📹 Video</span>
                      <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-sky-600 to-teal-600 dark:from-sky-400 dark:to-teal-400 bg-clip-text text-transparent">${doctor.fee}</span>
                    </span>
                    <span className="text-gray-300 dark:text-slate-700">·</span>
                    <span className="flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/80 dark:text-emerald-300/70">🏥 Clinic</span>
                      <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                        {clinicSummary.minFee === clinicSummary.maxFee
                          ? `$${clinicSummary.minFee}`
                          : `$${clinicSummary.minFee}–$${clinicSummary.maxFee}`}
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-sky-600 to-teal-600 dark:from-sky-400 dark:to-teal-400 bg-clip-text text-transparent">${doctor.fee}</p>
              )}

              <button onClick={() => setModalOpen(true)} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition whitespace-nowrap">
                Book Appointment
              </button>

              {clinicSummary && clinicSummary.count > 0 && (
                <Link
                  href={
                    clinicSummary.count === 1 && clinicSummary.firstId
                      ? `/doctors/${doctor.id}/book-clinic/${clinicSummary.firstId}`
                      : `/doctors/${doctor.id}/clinics`
                  }
                  className="rounded-xl border-2 border-emerald-500/60 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 px-6 py-2.5 text-center text-sm font-bold text-emerald-700 dark:text-emerald-300 hover:from-emerald-500/20 hover:to-teal-500/20 transition whitespace-nowrap"
                >
                  🏥 Visit Clinic
                </Link>
              )}

              <button
                onClick={() => setConsultGateOpen(true)}
                disabled={videoLoading}
                className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary-600 hover:underline disabled:opacity-50"
              >
                {videoLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Starting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Video Consult - ${doctor.fee}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm hover:shadow-md transition p-6">
              <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-slate-100">About</h2>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">{doctor.about}</p>
            </div>

            {/* Services */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm hover:shadow-md transition p-6">
              <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-slate-100">Services Offered</h2>
              <div className="flex flex-wrap gap-2">
                {doctor.services.map((s, i) => {
                  const palettes = [
                    "from-sky-50 to-cyan-50 dark:from-sky-950/40 dark:to-cyan-950/40 ring-sky-200 dark:ring-sky-900 text-sky-700 dark:text-sky-300",
                    "from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 ring-violet-200 dark:ring-violet-900 text-violet-700 dark:text-violet-300",
                    "from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 ring-rose-200 dark:ring-rose-900 text-rose-700 dark:text-rose-300",
                    "from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 ring-teal-200 dark:ring-teal-900 text-teal-700 dark:text-teal-300",
                    "from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 ring-amber-200 dark:ring-amber-900 text-amber-700 dark:text-amber-300",
                  ];
                  return (
                    <span
                      key={s}
                      className={`rounded-full bg-gradient-to-r ring-1 px-3 py-1.5 text-xs font-semibold ${palettes[i % palettes.length]}`}
                    >
                      {s}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Reviews */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm hover:shadow-md transition p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-slate-100">
                Patient Reviews ({reviews.length})
              </h2>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((r, i) => (
                    <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-slate-100">{r.name}</span>
                          {r.verifiedVisit && (
                            <span
                              title="This review is from a patient whose booking we confirmed"
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300"
                            >
                              <span aria-hidden="true">✓</span> Verified visit
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-slate-500">{r.date}</span>
                      </div>
                      <div className="mt-1 flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <svg
                            key={j}
                            className={`h-3.5 w-3.5 ${j < r.rating ? "text-yellow-400" : "text-gray-200"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{r.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">No reviews yet.</p>
              )}
            </div>
          </div>

          {/* Sidebar - Time Slots */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm hover:shadow-md transition p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-slate-100">Available Today</h2>
              <div className="grid grid-cols-2 gap-2">
                {doctor.timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setModalOpen(true)}
                    className="rounded-xl ring-1 ring-slate-200 dark:ring-slate-800 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 transition-all hover:ring-sky-400 dark:hover:ring-sky-600 hover:bg-gradient-to-br hover:from-sky-50 hover:to-teal-50 dark:hover:from-sky-950/40 dark:hover:to-teal-950/40 hover:text-sky-700 dark:hover:text-sky-300"
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition"
              >
                Book Appointment
              </button>
            </div>

            <DoctorAiAssistant doctorId={doctor.id} />

            <ClinicLocations
              doctorId={doctor.id}
              onBookOnline={(cid, cname) => {
                setBookClinicId(cid);
                setBookClinicName(cname);
                setModalOpen(true);
              }}
            />

            <div className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm hover:shadow-md transition p-6">
              <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-slate-100">Clinic Location</h2>
              <p className="text-sm text-gray-600 dark:text-slate-300">{doctor.location}</p>
              <p className="text-sm text-gray-400 dark:text-slate-500">{doctor.city}</p>
              <div className="mt-4 h-48 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800">
                <iframe
                  title={`${doctor.location} on map`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(`${doctor.location}, ${doctor.city}`)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  className="h-full w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a
                href={`https://maps.google.com/maps?q=${encodeURIComponent(`${doctor.location}, ${doctor.city}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-primary-600 hover:underline"
              >
                Open in Google Maps →
              </a>
            </div>
          </div>
        </div>
      </div>

      <BookingModal
        doctor={doctor}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          // Clear clinic tag so a subsequent "Book Appointment" click
          // (without a clinic) doesn't accidentally inherit the prior
          // clinic context.
          setBookClinicId(null);
          setBookClinicName(null);
        }}
        clinicId={bookClinicId || undefined}
        clinicName={bookClinicName || undefined}
      />

      <ConsultGateModal
        open={consultGateOpen}
        onClose={() => setConsultGateOpen(false)}
        doctor={{
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          fee: doctor.fee,
        }}
        onVerified={async ({ consultToken }) => {
          setVideoLoading(true);
          try {
            const res = await fetch("/api/rooms", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                doctorId: doctor.id,
                doctorName: doctor.name,
                specialty: doctor.specialty,
                fee: doctor.fee,
                consultToken,
              }),
            });
            const data = await res.json();
            if (data.roomId) {
              router.push(`/consultation/${data.roomId}`);
            }
          } catch (err) {
            console.error("Failed to start video consult:", err);
          } finally {
            setVideoLoading(false);
            setConsultGateOpen(false);
          }
        }}
      />
    </div>
  );
}
