import Link from "next/link";
import FAQAccordion from "@/components/FAQAccordion";
import { faqs, healthConcerns } from "@/lib/data";
import type { Metadata } from "next";
import InstantConsultButton from "@/components/InstantConsultButton";

export const metadata: Metadata = {
  title: "Video Consultation",
  description: "Consult with top doctors from the comfort of your home via video or audio call.",
};

const specialtyPrices = [
  { name: "General Physician", icon: "🩺", price: 25 },
  { name: "Dermatologist", icon: "✨", price: 35 },
  { name: "Gynecologist", icon: "👩‍⚕️", price: 40 },
  { name: "Pediatrician", icon: "👶", price: 30 },
  { name: "Psychiatrist", icon: "🧠", price: 45 },
  { name: "Cardiologist", icon: "❤️", price: 50 },
  { name: "Orthopedist", icon: "🦴", price: 40 },
  { name: "ENT Specialist", icon: "👂", price: 35 },
];

const steps = [
  { num: "1", title: "Select Specialty", desc: "Choose from 20+ specialties or describe your health concern", icon: "🔍" },
  { num: "2", title: "Video / Audio Call", desc: "Connect instantly with a verified doctor via secure video or audio call", icon: "📹" },
  { num: "3", title: "Get Prescription", desc: "Receive a digital prescription and follow-up support", icon: "📋" },
];

const benefits = [
  { title: "24/7 Available", desc: "Consult doctors anytime, day or night", icon: "🕐" },
  { title: "Verified Doctors", desc: "All doctors are verified and experienced", icon: "✅" },
  { title: "Digital Prescription", desc: "Get prescriptions sent to your phone", icon: "📱" },
  { title: "Free Follow-up", desc: "Get a free follow-up within 7 days", icon: "🔄" },
];

const upcomingConsultations = [
  { id: "1", doctor: "Dr. Sarah Johnson", specialty: "General Physician", time: "Today, 3:00 PM", status: "upcoming" as const },
  { id: "2", doctor: "Dr. Michael Chen", specialty: "Dermatologist", time: "Tomorrow, 10:00 AM", status: "scheduled" as const },
  { id: "3", doctor: "Dr. Amara Obi", specialty: "Pediatrician", time: "Apr 16, 2:30 PM", status: "scheduled" as const },
];

export default function ConsultPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-teal-500 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold sm:text-4xl md:text-5xl">
            Consult with Top Doctors
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-100">
            From the comfort of your home. Get expert medical advice via video or audio call.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/consult/book" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-primary-600 shadow-lg transition-transform hover:scale-105">
              Book Consultation
            </Link>
            <InstantConsultButton />
          </div>
        </div>
      </section>

      {/* Upcoming Consultations */}
      <section className="border-b bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Your Upcoming Video Consultations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingConsultations.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div>
                  <p className="font-semibold text-gray-900">{c.doctor}</p>
                  <p className="text-sm text-gray-500">{c.specialty}</p>
                  <p className="mt-1 text-xs text-primary-600">{c.time}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    c.status === "upcoming"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {c.status === "upcoming" ? "Ready to Join" : "Scheduled"}
                  </span>
                  {c.status === "upcoming" && (
                    <Link href="/consult/book" className="text-xs font-medium text-primary-600 hover:underline">
                      Join Now
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">How It Works</h2>
          <p className="section-subtitle text-center">3 simple steps to consult a doctor online</p>
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.num} className="relative text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-4xl">
                  {s.icon}
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {s.num}
                </div>
                <h3 className="mt-2 text-lg font-bold text-gray-900">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialty Pricing Grid */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Choose a Specialty</h2>
          <p className="section-subtitle text-center">Affordable consultations with expert doctors</p>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {specialtyPrices.map((s) => (
              <Link key={s.name} href="/doctors" className="group">
                <div className="card flex flex-col items-center py-6 text-center">
                  <span className="text-4xl transition-transform duration-300 group-hover:scale-110">
                    {s.icon}
                  </span>
                  <h3 className="mt-3 font-semibold text-gray-900">{s.name}</h3>
                  <p className="mt-1 text-lg font-bold text-primary-600">${s.price}</p>
                  <p className="text-xs text-gray-400">per consultation</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Health Concerns */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Common Health Concerns</h2>
          <p className="section-subtitle text-center">Quick consult for common issues</p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {healthConcerns.map((c) => (
              <Link key={c.id} href="/doctors">
                <div className={`flex items-center gap-4 rounded-xl border p-4 transition-all duration-300 hover:shadow-md ${c.color}`}>
                  <span className="text-3xl">{c.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{c.title}</h3>
                    <p className="text-xs opacity-75">Consult from ${c.price}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-primary-600 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold">Why Consult on OduDoc?</h2>
          <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.title} className="text-center">
                <span className="mb-3 block text-4xl">{b.icon}</span>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm text-primary-100">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Frequently Asked Questions</h2>
          <p className="section-subtitle mb-10 text-center">Got questions? We have answers</p>
          <FAQAccordion items={faqs} />
        </div>
      </section>
    </>
  );
}
