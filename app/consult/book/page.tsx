"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type Doctor } from "@/lib/data";

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

interface MedicalHistoryForm {
  chiefComplaint: string;
  symptoms: string;
  duration: string;
  severity: "mild" | "moderate" | "severe" | "";
  allergies: string;
  currentMedications: string;
  pastConditions: string;
  surgeries: string;
  familyHistory: string;
  smoker: "yes" | "no" | "former" | "";
  alcohol: "never" | "occasional" | "regular" | "";
  pregnant: "yes" | "no" | "na" | "";
  additional: string;
}

const emptyHistory: MedicalHistoryForm = {
  chiefComplaint: "",
  symptoms: "",
  duration: "",
  severity: "",
  allergies: "",
  currentMedications: "",
  pastConditions: "",
  surgeries: "",
  familyHistory: "",
  smoker: "",
  alcohol: "",
  pregnant: "na",
  additional: "",
};

export default function BookConsultationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [history, setHistory] = useState<MedicalHistoryForm>(emptyHistory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentsOff, setPaymentsOff] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    fetch("/api/payments-config")
      .then((r) => r.json())
      .then((d) => setPaymentsOff(!!d.disabled))
      .catch(() => {});
    fetch("/api/doctors", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.doctors)) setDoctors(d.doctors);
      })
      .catch(() => {});
  }, []);

  const filteredDoctors = selectedSpecialty
    ? doctors.filter((d) => d.specialty === selectedSpecialty)
    : doctors;

  const selectedDoctorData = doctors.find((d) => d.id === selectedDoctor);
  const selectedSpecialtyData = specialtyList.find((s) => s.name === selectedSpecialty);
  const fee = selectedSpecialtyData?.price || selectedDoctorData?.fee || 25;

  const setH = <K extends keyof MedicalHistoryForm>(k: K, v: MedicalHistoryForm[K]) =>
    setHistory((h) => ({ ...h, [k]: v }));

  const canProceedHistory =
    history.chiefComplaint.trim().length > 2 &&
    history.symptoms.trim().length > 2 &&
    history.duration.trim().length > 0 &&
    history.severity !== "";

  const handleBookAndPay = async () => {
    if (!selectedDoctorData) return;
    setError("");
    setLoading(true);
    try {
      const scheduledFor = new Date().toISOString(); // demo: same day
      const dateLabel = new Date().toDateString();
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientEmail,
          patientName,
          patientPhone,
          doctorId: selectedDoctorData.id,
          doctorName: selectedDoctorData.name,
          specialty: selectedSpecialty,
          scheduledFor,
          dateLabel,
          timeSlot: selectedSlot,
          mode: "video",
          fee,
          currency: "USD",
          paymentProvider: "stripe",
          paymentIntentId: `demo_pi_${Date.now()}`,
          paymentStatus: "paid",
          medicalHistory: history,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create consultation");
        return;
      }
      setStep(6);
      // redirect to patient consultations dashboard after 3 seconds
      setTimeout(() => {
        router.push(`/dashboard/consultations/${data.consultation.id}`);
      }, 2500);
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const StepDot = ({ num, label }: { num: number; label: string }) => (
    <div className="flex items-center">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
          step >= num ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500"
        }`}
      >
        {step > num ? "✓" : num}
      </div>
      <span className={`ml-2 hidden text-xs sm:inline ${step >= num ? "font-medium text-gray-900" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-primary-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/consult" className="hover:text-primary-600">Consult</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">Book</span>
        </nav>

        <h1 className="mb-2 text-3xl font-bold text-gray-900">Book a Video Consultation</h1>
        <p className="mb-4 text-gray-500">Share your concern, pick a doctor, pay, and you&apos;re set.</p>
        {paymentsOff && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <span className="text-xl">🎉</span>
            <div>
              <p className="font-semibold">Free consultations today</p>
              <p className="text-xs opacity-90">Payment is disabled for the next 24 hours — book as many video consultations as you need, completely free.</p>
            </div>
          </div>
        )}

        <div className="mb-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <StepDot num={1} label="Specialty" />
          <div className="h-0.5 w-6 bg-gray-200 sm:w-10" />
          <StepDot num={2} label="Doctor" />
          <div className="h-0.5 w-6 bg-gray-200 sm:w-10" />
          <StepDot num={3} label="Time" />
          <div className="h-0.5 w-6 bg-gray-200 sm:w-10" />
          <StepDot num={4} label="Medical" />
          <div className="h-0.5 w-6 bg-gray-200 sm:w-10" />
          <StepDot num={5} label="Pay" />
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-6 text-lg font-bold text-gray-900">Choose a Specialty</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {specialtyList.map((s) => (
                <button
                  key={s.name}
                  onClick={() => { setSelectedSpecialty(s.name); setStep(2); }}
                  className={`flex flex-col items-center rounded-xl border-2 p-6 text-center transition-all hover:shadow-md ${
                    selectedSpecialty === s.name ? "border-primary-500 bg-primary-50" : "border-gray-100 hover:border-primary-200"
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

        {/* Step 2 */}
        {step === 2 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Choose a {selectedSpecialty}</h2>
              <button onClick={() => setStep(1)} className="text-sm text-primary-600 hover:underline">Change</button>
            </div>
            {filteredDoctors.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">No doctors available.</p>
                <button onClick={() => setStep(1)} className="mt-4 text-primary-600 hover:underline">Choose another specialty</button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDoctors.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => { setSelectedDoctor(doc.id); setStep(3); }}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                      selectedDoctor === doc.id ? "border-primary-500 bg-primary-50" : "border-gray-100 hover:border-primary-200"
                    }`}
                  >
                    <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${doc.imageColor}`}>
                      {doc.initials}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-500">{doc.qualifications}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        <span>⭐ {doc.rating}</span>
                        <span>{doc.experience} yrs</span>
                        <span>{doc.city}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">${doc.fee}</p>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Available</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && selectedDoctorData && (
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Choose a Time</h2>
              <button onClick={() => setStep(2)} className="text-sm text-primary-600 hover:underline">Change Doctor</button>
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

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Your Full Name</label>
                <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Phone</label>
                <input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
                <p className="mt-1 text-xs text-gray-400">We&apos;ll send booking confirmation and prescription here.</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-3 text-sm font-medium text-gray-700">Available Slots for Today</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {timeSlots.map((slot) => (
                  <button key={slot} onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      selectedSlot === slot ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-primary-50"
                    }`}>{slot}</button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(4)}
              disabled={!selectedSlot || !patientName || !patientEmail || !patientPhone}
              className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
              Continue to Medical History →
            </button>
          </div>
        )}

        {/* Step 4: Medical History */}
        {step === 4 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Medical History</h2>
              <button onClick={() => setStep(3)} className="text-sm text-primary-600 hover:underline">Back</button>
            </div>
            <p className="mb-6 text-sm text-gray-500">
              The more your doctor knows before the call, the better. This information is shared only with your selected doctor.
            </p>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Main concern (chief complaint) *</label>
                <input type="text" value={history.chiefComplaint} onChange={(e) => setH("chiefComplaint", e.target.value)}
                  placeholder="e.g. Persistent cough and mild fever"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Describe your symptoms *</label>
                <textarea rows={3} value={history.symptoms} onChange={(e) => setH("symptoms", e.target.value)}
                  placeholder="What are you experiencing? When did it start?"
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Duration *</label>
                  <input type="text" value={history.duration} onChange={(e) => setH("duration", e.target.value)}
                    placeholder="e.g. 3 days, 2 weeks"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Severity *</label>
                  <select value={history.severity} onChange={(e) => setH("severity", e.target.value as MedicalHistoryForm["severity"])}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500">
                    <option value="">Select...</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Known allergies</label>
                  <input type="text" value={history.allergies} onChange={(e) => setH("allergies", e.target.value)}
                    placeholder="Penicillin, peanuts, etc. (or 'None')"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Current medications</label>
                  <input type="text" value={history.currentMedications} onChange={(e) => setH("currentMedications", e.target.value)}
                    placeholder="Anything you take regularly"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Past medical conditions</label>
                  <input type="text" value={history.pastConditions} onChange={(e) => setH("pastConditions", e.target.value)}
                    placeholder="Diabetes, asthma, hypertension..."
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Past surgeries</label>
                  <input type="text" value={history.surgeries} onChange={(e) => setH("surgeries", e.target.value)}
                    placeholder="Appendectomy 2019, etc."
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Family history</label>
                  <input type="text" value={history.familyHistory} onChange={(e) => setH("familyHistory", e.target.value)}
                    placeholder="Heart disease in father, etc."
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Smoker?</label>
                  <select value={history.smoker} onChange={(e) => setH("smoker", e.target.value as MedicalHistoryForm["smoker"])}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500">
                    <option value="">Select...</option>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                    <option value="former">Former smoker</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Alcohol</label>
                  <select value={history.alcohol} onChange={(e) => setH("alcohol", e.target.value as MedicalHistoryForm["alcohol"])}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500">
                    <option value="">Select...</option>
                    <option value="never">Never</option>
                    <option value="occasional">Occasional</option>
                    <option value="regular">Regular</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Pregnant?</label>
                  <select value={history.pregnant} onChange={(e) => setH("pregnant", e.target.value as MedicalHistoryForm["pregnant"])}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500">
                    <option value="na">N/A</option>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Anything else you want the doctor to know?</label>
                <textarea rows={3} value={history.additional} onChange={(e) => setH("additional", e.target.value)}
                  placeholder="Lifestyle, recent travel, stress level, etc."
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500" />
              </div>
            </div>

            <button onClick={() => setStep(5)} disabled={!canProceedHistory}
              className="mt-6 w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
              Continue to Payment →
            </button>
          </div>
        )}

        {/* Step 5: Pay & Confirm */}
        {step === 5 && selectedDoctorData && (
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{paymentsOff ? "Review & Confirm" : "Review & Pay"}</h2>
              <button onClick={() => setStep(4)} className="text-sm text-primary-600 hover:underline">Back</button>
            </div>

            <div className="space-y-3 rounded-xl bg-gray-50 p-5">
              <Row label="Doctor" value={selectedDoctorData.name} />
              <Row label="Specialty" value={selectedSpecialty} />
              <Row label="Time" value={selectedSlot} />
              <Row label="Patient" value={patientName} />
              <Row label="Email" value={patientEmail} />
              <Row label="Main concern" value={history.chiefComplaint} />
              <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                <span className="font-semibold text-gray-900">Total</span>
                {paymentsOff ? (
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 line-through">${fee}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">FREE today</span>
                  </span>
                ) : (
                  <span className="text-xl font-bold text-primary-600">${fee}</span>
                )}
              </div>
            </div>

            {!paymentsOff && (
              <div className="mt-6 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-800">
                <p className="font-medium">Your payment is fully refundable</p>
                <p className="mt-1 text-xs">If the doctor cannot take your appointment or you cancel before the scheduled time, you&apos;ll receive a full refund automatically.</p>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <button onClick={handleBookAndPay} disabled={loading}
              className="mt-6 w-full rounded-xl bg-primary-600 py-4 text-sm font-semibold text-white transition-all hover:bg-primary-700 disabled:opacity-50">
              {loading
                ? (paymentsOff ? "Confirming..." : "Processing payment...")
                : (paymentsOff ? "Confirm Booking (Free)" : `Pay $${fee} & Confirm Booking`)}
            </button>
            <p className="mt-3 text-center text-xs text-gray-400">
              {paymentsOff ? "No card required · Payments are disabled today" : "Secure payment · Your card is not charged in demo mode"}
            </p>
          </div>
        )}

        {/* Step 6: Success */}
        {step === 6 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Consultation booked!</h2>
            <p className="mb-6 text-gray-500">We&apos;ve notified the doctor. You&apos;ll get a confirmation email shortly.</p>
            <p className="text-sm text-gray-400">Redirecting to your dashboard…</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
