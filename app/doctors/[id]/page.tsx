"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doctors, doctorReviews } from "@/lib/data";
import BookingModal from "@/components/BookingModal";

export default function DoctorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const doctor = doctors.find((d) => d.id === params.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  if (!doctor) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-5xl">😔</p>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Doctor Not Found</h1>
          <p className="mt-2 text-gray-500">The doctor you are looking for does not exist.</p>
          <Link href="/doctors" className="btn-primary mt-6 inline-block">
            Browse Doctors
          </Link>
        </div>
      </div>
    );
  }

  const reviews = doctorReviews[doctor.id] || [];

  return (
    <div className="bg-gray-50 py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-primary-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/doctors" className="hover:text-primary-600">Doctors</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{doctor.name}</span>
        </nav>

        {/* Profile Card */}
        <div className="card mb-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div
              className={`flex h-28 w-28 flex-shrink-0 items-center justify-center self-center rounded-full text-3xl font-bold text-white sm:self-start ${doctor.imageColor}`}
            >
              {doctor.initials}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{doctor.name}</h1>
              <p className="text-primary-600">{doctor.specialty}</p>
              <p className="text-sm text-gray-500">{doctor.qualifications}</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 sm:justify-start">
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  {doctor.rating} ({doctor.reviewCount} reviews)
                </span>
                <span>{doctor.experience} years experience</span>
                <span>{doctor.city}</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">{doctor.location}</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="text-2xl font-bold text-gray-900">${doctor.fee}</p>
              <button onClick={() => setModalOpen(true)} className="btn-primary whitespace-nowrap">
                Book Appointment
              </button>
              <button
                onClick={async () => {
                  setVideoLoading(true);
                  try {
                    const res = await fetch("/api/rooms", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        doctorId: doctor.id,
                        doctorName: doctor.name,
                        patientName: "Patient",
                        specialty: doctor.specialty,
                        fee: doctor.fee,
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
                  }
                }}
                disabled={videoLoading}
                className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline disabled:opacity-50"
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
            <div className="card">
              <h2 className="mb-3 text-lg font-bold text-gray-900">About</h2>
              <p className="text-sm leading-relaxed text-gray-600">{doctor.about}</p>
            </div>

            {/* Services */}
            <div className="card">
              <h2 className="mb-3 text-lg font-bold text-gray-900">Services Offered</h2>
              <div className="flex flex-wrap gap-2">
                {doctor.services.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="card">
              <h2 className="mb-4 text-lg font-bold text-gray-900">
                Patient Reviews ({reviews.length})
              </h2>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((r, i) => (
                    <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{r.name}</span>
                        <span className="text-xs text-gray-400">{r.date}</span>
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
                      <p className="mt-2 text-sm text-gray-600">{r.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No reviews yet.</p>
              )}
            </div>
          </div>

          {/* Sidebar - Time Slots */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="mb-4 text-lg font-bold text-gray-900">Available Today</h2>
              <div className="grid grid-cols-2 gap-2">
                {doctor.timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setModalOpen(true)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700"
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="btn-primary mt-4 w-full"
              >
                Book Appointment
              </button>
            </div>

            <div className="card">
              <h2 className="mb-3 text-lg font-bold text-gray-900">Clinic Location</h2>
              <p className="text-sm text-gray-600">{doctor.location}</p>
              <p className="text-sm text-gray-400">{doctor.city}</p>
              <div className="mt-4 h-40 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                Map Placeholder
              </div>
            </div>
          </div>
        </div>
      </div>

      <BookingModal doctor={doctor} open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
