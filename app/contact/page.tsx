"use client";

// Hospital onboarding / contact form.
//
// Single worldwide form for hospitals and clinics in any country.
// Posts to /api/enterprise-leads which captures the lead in the admin
// inbox. Country dropdown is the full ISO 3166-1 list (196 entries),
// phone is free-text with international hint, and the modules picker
// matches the platform's actual module suite.

import { useState } from "react";
import WorkingHours from "@/components/WorkingHours";
import PhoneInput from "@/components/PhoneInput";
import { COUNTRIES } from "@/lib/countries";

const contactInfo = [
  {
    icon: "📍",
    title: "Head Office",
    gradient: "from-sky-500 to-indigo-600",
    lines: [
      "OduDoc Inc.",
      "8 The Green, Suite A",
      "Dover, Delaware 19901",
      "United States",
    ],
  },
  {
    icon: "📞",
    title: "Call Us",
    gradient: "from-emerald-500 to-teal-600",
    lines: [
      "Toll-Free: +1 (302) 899-2625",
      "Mon – Sat · 8:00 AM – 10:00 PM (EST)",
      "Sunday · Closed",
    ],
  },
  {
    icon: "✉️",
    title: "Email Us",
    gradient: "from-rose-500 to-pink-600",
    lines: [
      "support@odudoc.com",
      "Replies within 24 hours",
    ],
  },
];

const BEDS_RANGES = [
  { id: "<20",     label: "<20 beds" },
  { id: "20-50",   label: "20–50 beds" },
  { id: "50-200",  label: "50–200 beds" },
  { id: "200+",    label: "200+ beds" },
  { id: "clinic",  label: "Clinic / OPD only" },
];

const MODULES = [
  "Patient Management",
  "IPD / OPD",
  "Lab Management",
  "Pharmacy",
  "Billing & Accounting",
  "Inventory",
  "Surgery / OT",
  "Radiology & DICOM",
  "Telemedicine",
  "AI & Voice Consultation",
];

export default function ContactPage() {
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [beds, setBeds] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [currentSystem, setCurrentSystem] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleModule = (m: string) => {
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const reset = () => {
    setOrgName(""); setContactName(""); setEmail(""); setPhone("");
    setCountry(""); setBeds(""); setModules([]); setCurrentSystem("");
    setMessage(""); setError(null); setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/enterprise-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName,
          contactName,
          contactEmail: email,
          contactPhone: phone || undefined,
          country: country || undefined,
          bedsRange: beds || undefined,
          interestedModules: modules,
          currentSystem: currentSystem || undefined,
          message: message || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `Couldn't submit (HTTP ${res.status}).`);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-teal-50 to-rose-50 py-24">
        <div className="pointer-events-none absolute -top-32 -left-24 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary-200/40 to-teal-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-200/40 to-amber-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-teal-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
            <span>🏥</span> For Hospitals Worldwide
          </span>
          <h1 className="mt-6 text-4xl font-bold text-gray-900 md:text-6xl">
            Talk to{" "}
            <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-rose-500 bg-clip-text text-transparent">
              our team
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600">
            We work with hospitals, clinics and diagnostic chains in 100+ countries.
            Tell us about your facility — we'll line up a 30-min walkthrough tailored to it.
          </p>
        </div>
      </section>

      {/* Contact grid */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-primary-50/40 py-20">
        <div className="pointer-events-none absolute -top-24 right-0 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-teal-200/30 to-primary-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Contact Info */}
            <div className="space-y-6">
              {contactInfo.map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${c.gradient} text-xl text-white shadow-lg ring-4 ring-white`}
                    >
                      {c.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{c.title}</h3>
                      {c.lines.map((line) => (
                        <p key={line} className="text-sm text-gray-500">{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Working Hours */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg ring-4 ring-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900">Working Hours</h3>
                </div>
                <WorkingHours />
              </div>

              {/* Trust strip — replaces the US-only office map with a worldwide
                  signal so visitors from any region see themselves in the page. */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-xl">
                <h3 className="mb-3 font-bold text-gray-900">Where we serve</h3>
                <p className="text-sm text-gray-500">
                  Hospitals, clinics and diagnostic chains across North America,
                  Europe, the GCC, Africa, South Asia, Southeast Asia and Latin
                  America. Localized currency, language, and compliance in every region.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["🇺🇸", "🇬🇧", "🇨🇦", "🇦🇪", "🇸🇦", "🇮🇳", "🇸🇬", "🇿🇦", "🇰🇪", "🇧🇷", "🇲🇽", "🇦🇺"].map((f) => (
                    <span key={f} className="text-2xl" aria-hidden="true">{f}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-xl lg:col-span-2">
              {submitted ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl text-white shadow-lg ring-4 ring-white">
                    ✓
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Request received!</h2>
                  <p className="mt-2 max-w-md text-gray-500">
                    Thank you for reaching out. Our hospital partnerships team will
                    get back to you within 24 hours with a tailored walkthrough plan.
                  </p>
                  <button
                    onClick={reset}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105"
                  >
                    Submit another
                  </button>
                </div>
              ) : (
                <>
                  <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-rose-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
                    <span>✨</span> Book a walkthrough
                  </span>
                  <h2 className="mt-4 mb-1 text-2xl font-bold text-gray-900">
                    Tell us about your{" "}
                    <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-rose-500 bg-clip-text text-transparent">
                      hospital
                    </span>
                  </h2>
                  <p className="mb-6 text-sm text-gray-500">
                    30-minute walkthrough tailored to your facility — modules, migration, and pricing.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                        Hospital / Organization Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="St. Mary's General Hospital"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                          Your Name *
                        </label>
                        <input
                          required
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Dr. Anjali Mehta"
                          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                          Work Email *
                        </label>
                        <input
                          required
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@hospital.org"
                          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                          Phone
                        </label>
                        <PhoneInput
                          value={phone}
                          onChange={(next) => setPhone(next)}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                          Country
                        </label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                        >
                          <option value="">Select a country…</option>
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                        Beds / Capacity
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {BEDS_RANGES.map((b) => {
                          const active = beds === b.id;
                          return (
                            <button
                              type="button"
                              key={b.id}
                              onClick={() => setBeds(active ? "" : b.id)}
                              className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition ${
                                active
                                  ? "border-primary-500 bg-gradient-to-r from-primary-500 to-teal-500 text-white shadow-md"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50"
                              }`}
                            >
                              {b.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                        Which modules interest you?
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {MODULES.map((m) => {
                          const active = modules.includes(m);
                          return (
                            <button
                              type="button"
                              key={m}
                              onClick={() => toggleModule(m)}
                              className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium transition ${
                                active
                                  ? "border-primary-500 bg-gradient-to-r from-primary-500 to-teal-500 text-white shadow-md"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50"
                              }`}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                        Current HMS / system (if any)
                      </label>
                      <input
                        type="text"
                        value={currentSystem}
                        onChange={(e) => setCurrentSystem(e.target.value)}
                        placeholder="e.g. eHospital, paper records, in-house tool"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
                        Anything else?
                      </label>
                      <textarea
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Migration timeline, regulatory needs, languages required…"
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                      />
                    </div>

                    {error && (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 sm:w-auto"
                    >
                      {submitting ? "Sending…" : "Request walkthrough →"}
                    </button>

                    <p className="text-xs text-gray-400">
                      We reply within 24 hours. By submitting you agree to our
                      privacy policy. No spam — promise.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
