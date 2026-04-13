"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doctors } from "@/lib/data";

const specialtyList = [
  { name: "General Physician", icon: "🩺", price: 25 },
  { name: "Dermatologist", icon: "✨", price: 35 },
  { name: "Gynecologist", icon: "👩‍⚕️", price: 40 },
  { name: "Pediatrician", icon: "👶", price: 30 },
  { name: "Psychiatrist", icon: "🧠", price: 45 },
  { name: "Cardiologist", icon: "❤️", price: 50 },
  { name: "Orthopedist", icon: "🦴", price: 40 },
  { name: "ENT Specialist", icon: "👂", price: 35 },
];

const timeSlots = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM", "07:00 PM", "07:30 PM",
];

export default function BookConsultationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredDoctors = selectedSpecialty
    ? doctors.filter((d) => d.specialty === selectedSpecialty)
    : doctors;

  const selectedDoctorData = doctors.find((d) => d.id === selectedDoctor);
  const selectedSpecialtyData = specialtyList.find((s) => s.name === selectedSpecialty);

  const handleInstantConsult = async () => {
    if (!selectedDoctor || !patientName) return;
    setLoading(true);
    try {
      const doc = doctors.find((d) => d.id === selectedDoctor);
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctor,
          doctorName: doc?.name || "Doctor",
          patientName,
          specialty: selectedSpecialty,
          fee: selectedSpecialtyData?.price || doc?.fee || 25,
        }),
      });
      const data = await res.json();
      if (data.roomId) {
        router.push(`/consultation/${data.roomId}`);
      }
    } catch (err) {
      console.error("Failed to create room:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleConsult = async () => {
    if (!selectedDoctor || !patientName || !selectedSlot) return;
    setLoading(true);
    try {
      const doc = doctors.find((d) => d.id === selectedDoctor);
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctor,
          doctorName: doc?.name || "Doctor",
          patientName,
          specialty: selectedSpecialty,
          fee: selectedSpecialtyData?.price || doc?.fee || 25,
        }),
      });
      const data = await res.json();
      if (data.roomId) {
        router.push(`/consultation/${data.roomId}`);
      }
    } catch (err) {
      console.error("Failed to create room:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-primary-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/consult" className="hover:text-primary-600">Consult</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">Book</span>
        </nav>

        <h1 className="mb-2 text-3xl font-bold text-gray-900">Book a Video Consultation</h1>
        <p className="mb-8 text-gray-500">Connect with a doctor in minutes via secure video call</p>

        {/* Progress Steps */}
        <div className="mb-10 flex items-center justify-center">
          {[
            { num: 1, label: "Specialty" },
            { num: 2, label: "Doctor" },
            { num: 3, label: "Schedule" },
            { num: 4, label: "Confirm" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  step >= s.num
                    ? "bg-primary-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > s.num ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.num
                )}
              </div>
              <span className={`ml-2 hidden text-sm sm:inline ${step >= s.num ? "font-medium text-gray-900" : "text-gray-400"}`}>
                {s.label}
              </span>
              {i < 3 && (
                <div className={`mx-4 h-0.5 w-12 sm:w-20 ${step > s.num ? "bg-primary-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Specialty */}
        {step === 1 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-6 text-lg font-bold text-gray-900">Choose a Specialty</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {specialtyList.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    setSelectedSpecialty(s.name);
                    setStep(2);
                  }}
                  className={`flex flex-col items-center rounded-xl border-2 p-6 text-center transition-all hover:shadow-md ${
                    selectedSpecialty === s.name
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-100 hover:border-primary-200"
                  }`}
                >
                  <span className="text-3xl">{s.icon}</span>
                  <span className="mt-2 text-sm font-medium text-gray-900">{s.name}</span>
                  <span className="mt-1 text-sm font-bold text-primary-600">${s.price}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Choose Doctor */}
        {step === 2 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Choose a {selectedSpecialty}
              </h2>
              <button onClick={() => setStep(1)} className="text-sm text-primary-600 hover:underline">
                Change Specialty
              </button>
            </div>

            {filteredDoctors.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">No doctors available for this specialty.</p>
                <button onClick={() => setStep(1)} className="mt-4 text-primary-600 hover:underline">
                  Choose another specialty
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDoctors.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoctor(doc.id);
                      setStep(3);
                    }}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                      selectedDoctor === doc.id
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-100 hover:border-primary-200"
                    }`}
                  >
                    <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${doc.imageColor}`}>
                      {doc.initials}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-500">{doc.qualifications}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {doc.rating}
                        </span>
                        <span>{doc.experience} yrs exp</span>
                        <span>{doc.city}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">${doc.fee}</p>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Available
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && selectedDoctorData && (
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Choose a Time</h2>
              <button onClick={() => setStep(2)} className="text-sm text-primary-600 hover:underline">
                Change Doctor
              </button>
            </div>

            <div className="mb-6 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ${selectedDoctorData.imageColor}`}>
                {selectedDoctorData.initials}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selectedDoctorData.name}</p>
                <p className="text-sm text-gray-500">{selectedDoctorData.specialty}</p>
              </div>
            </div>

            {/* Patient Name */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Your Name</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500"
              />
            </div>

            {/* Time Slots */}
            <div className="mb-6">
              <p className="mb-3 text-sm font-medium text-gray-700">Available Slots for Today</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      selectedSlot === slot
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => {
                  if (patientName) setStep(4);
                }}
                disabled={!selectedSlot || !patientName}
                className="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Schedule for {selectedSlot || "..."}
              </button>
              <button
                onClick={handleInstantConsult}
                disabled={!patientName || loading}
                className="flex-1 rounded-xl border-2 border-primary-600 py-3 text-sm font-semibold text-primary-600 transition-all hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating Room..." : "Consult Now"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && selectedDoctorData && (
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-6 text-lg font-bold text-gray-900">Confirm Your Booking</h2>

            <div className="space-y-4 rounded-xl bg-gray-50 p-6">
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-sm text-gray-500">Doctor</span>
                <span className="text-sm font-medium text-gray-900">{selectedDoctorData.name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-sm text-gray-500">Specialty</span>
                <span className="text-sm font-medium text-gray-900">{selectedSpecialty}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-sm text-gray-500">Patient Name</span>
                <span className="text-sm font-medium text-gray-900">{patientName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-sm text-gray-500">Time</span>
                <span className="text-sm font-medium text-gray-900">{selectedSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Consultation Fee</span>
                <span className="text-lg font-bold text-primary-600">
                  ${selectedSpecialtyData?.price || selectedDoctorData.fee}
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                You will receive a video consultation link. Join the call at your scheduled time.
                The room will be ready 5 minutes before your appointment.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                onClick={handleScheduleConsult}
                disabled={loading}
                className="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Creating Room..." : "Confirm & Get Room Link"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
