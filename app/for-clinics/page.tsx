import Link from "next/link";
import type { Metadata } from "next";
import { ServiceLd, BreadcrumbLd } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Hospital & Clinic Management Software",
  description:
    "Run your clinic or hospital on OduDoc: smart appointments, EHR, billing, pharmacy, lab, and WhatsApp reminders. HIPAA-aware, multi-tenant, cloud-based.",
  keywords: [
    "hospital management software",
    "clinic software",
    "EHR",
    "electronic health records",
    "clinic appointment system",
    "practice management",
  ],
  alternates: { canonical: "/for-clinics" },
  openGraph: {
    title: "Hospital & Clinic Management Software | OduDoc",
    description:
      "Run your clinic on OduDoc — appointments, EHR, billing, pharmacy, lab, WhatsApp reminders.",
    url: "/for-clinics",
    type: "website",
  },
};

const features = [
  {
    title: "Smart Appointment System",
    desc: "Online booking, automated SMS/email reminders, and real-time queue management. Reduce no-shows by up to 40%.",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    gradient: "from-sky-500 to-indigo-600",
  },
  {
    title: "Digital Health Records (EHR)",
    desc: "Paperless patient records with instant search. Access full histories, prescriptions, lab reports, and vitals from anywhere.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    title: "Billing & Invoicing",
    desc: "Automated billing, GST/VAT invoices, and insurance claim processing. Accept UPI, cards, and net banking seamlessly.",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    gradient: "from-fuchsia-500 to-pink-600",
  },
  {
    title: "Inventory Management",
    desc: "Track medicines, consumables, and equipment in real time. Get auto-reorder alerts before stock runs out.",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    title: "Staff & Payroll Management",
    desc: "Manage doctor schedules, staff roles, attendance tracking, leave management, and payroll from one dashboard.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    gradient: "from-rose-500 to-red-600",
  },
  {
    title: "Analytics & Reports",
    desc: "Revenue reports, patient demographics, peak hour analysis, and doctor performance metrics — all in real time.",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    title: "Patient Engagement",
    desc: "Automated follow-up messages, health tips, medication reminders, and satisfaction surveys to boost patient retention.",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    title: "Multi-Branch Support",
    desc: "Manage multiple clinic branches from one account. Centralized patient records, shared inventory, and consolidated reports.",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    gradient: "from-teal-500 to-emerald-600",
  },
];

const stats = [
  { value: "2,500+", label: "Clinics Onboarded", gradient: "from-primary-500 to-teal-500" },
  { value: "40%", label: "Fewer No-Shows", gradient: "from-fuchsia-500 to-pink-500" },
  { value: "3x", label: "Faster Billing", gradient: "from-amber-500 to-orange-500" },
  { value: "98%", label: "Satisfaction Rate", gradient: "from-indigo-500 to-purple-500" },
];

const steps = [
  {
    num: "01",
    title: "Sign Up & Set Up",
    desc: "Register your clinic in minutes. Add your doctors, services, working hours, and fee structure.",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    gradient: "from-sky-500 to-indigo-600",
  },
  {
    num: "02",
    title: "Go Live with Bookings",
    desc: "Share your clinic's booking link. Patients book appointments online 24/7 — no phone calls needed.",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    num: "03",
    title: "Manage Everything",
    desc: "Use the dashboard to handle records, billing, inventory, and staff — all from one place.",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    gradient: "from-fuchsia-500 to-pink-600",
  },
  {
    num: "04",
    title: "Grow Your Practice",
    desc: "Leverage analytics to spot trends, improve patient satisfaction, and scale with multi-branch support.",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    gradient: "from-amber-500 to-orange-600",
  },
];

const testimonials = [
  {
    name: "Dr. Amina Osei",
    role: "Cardiologist, HeartCare Clinic — Lagos",
    text: "OduDoc's clinic platform cut our billing time in half. The automated reminders alone reduced no-shows by 35%. I can't imagine running my practice without it.",
    initials: "AO",
    gradient: "from-rose-500 to-pink-600",
    rating: 5,
  },
  {
    name: "Dr. Raj Mehta",
    role: "Pediatrician, Little Stars Hospital — Mumbai",
    text: "Managing 3 branches used to be a nightmare. Now everything — records, inventory, payroll — is centralized. The multi-branch feature is a game changer.",
    initials: "RM",
    gradient: "from-sky-500 to-indigo-600",
    rating: 5,
  },
  {
    name: "Dr. Claire Fontaine",
    role: "General Physician, MedPlus Clinic — Paris",
    text: "The EHR system is intuitive and fast. My patients love the online booking, and I love the automatic prescription generation after every video consult.",
    initials: "CF",
    gradient: "from-teal-500 to-emerald-600",
    rating: 5,
  },
];

const planFeatures = [
  "Smart Appointment System with SMS/email reminders",
  "Digital Health Records (EHR) — unlimited patients",
  "Automated Billing & GST/VAT Invoicing",
  "Inventory Management with auto-reorder alerts",
  "Staff & Payroll Management",
  "Real-time Analytics & Reports",
  "Patient Engagement & follow-up automation",
  "Multi-Branch Support — manage all locations",
  "Unlimited doctors, staff, and appointments",
  "Secure cloud storage — HIPAA & GDPR compliant",
  "Priority support · Free onboarding",
];

const faqs = [
  { q: "Is my patient data secure?", a: "Yes. All data is encrypted in transit and at rest with AES-256 encryption. We comply with HIPAA, GDPR, and local health data regulations." },
  { q: "Can I import existing patient records?", a: "Absolutely. We provide a bulk import tool for CSV/Excel files and support HL7 / FHIR data formats for seamless migration." },
  { q: "Does it work on mobile?", a: "Yes. OduDoc Clinic is fully responsive and we offer native iOS and Android apps for doctors and front-desk staff." },
  { q: "Is there a free trial?", a: "Yes — every clinic gets a full 30-day free trial with all features unlocked. No credit card required upfront. After the trial, it's a flat $100/month." },
  { q: "What's included in the $100/month plan?", a: "Everything. All features — appointments, EHR, billing, inventory, staff, telemedicine, analytics, multi-branch — for unlimited doctors and patients. No add-ons, no hidden fees." },
  { q: "Can patients book without the app?", a: "Yes. Patients can book via your clinic's unique booking link on any browser — no app download needed." },
];

export default function ForClinicsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <ServiceLd
        name="Hospital & Clinic Management Software"
        description="Cloud-based hospital and clinic management software — appointments, EHR, billing, pharmacy, lab, and WhatsApp reminders."
        url="/for-clinics"
        serviceType="Healthcare software"
      />
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "For Clinics", url: "/for-clinics" },
        ]}
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-primary-50 to-indigo-50 py-24">
        <div className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary-200/40 to-teal-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-indigo-200/40 to-purple-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-gradient-to-br from-teal-200/30 to-emerald-200/30 blur-3xl" />

        {/* Floating decorative icons */}
        <div className="pointer-events-none absolute left-[8%] top-24 hidden h-14 w-14 rotate-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-xl md:flex">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <div className="pointer-events-none absolute right-[10%] top-40 hidden h-14 w-14 -rotate-6 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-pink-500 text-white shadow-xl md:flex">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        </div>

        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-teal-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700">
            <span>🏥</span> For Clinics &amp; Hospitals
          </span>
          <h1 className="text-4xl font-extrabold leading-tight text-gray-900 dark:text-slate-100 md:text-5xl lg:text-6xl">
            Run Your Clinic{" "}
            <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">Smarter.</span>
            <br />Grow It{" "}
            <span className="bg-gradient-to-r from-fuchsia-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">Faster.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-gray-600 dark:text-slate-300 md:text-xl">
            All-in-one clinic management — appointments, digital records, billing,
            inventory, staff, telemedicine, and more. Built for modern healthcare.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard/clinic"
              className="rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105"
            >
              Open Clinic Dashboard →
            </Link>
            <Link
              href="/for-doctors/register"
              className="rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white/70 px-8 py-3.5 text-sm font-bold text-gray-800 dark:text-slate-200 backdrop-blur-sm transition-colors hover:border-primary-400 hover:bg-white dark:bg-slate-900"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white/70 px-8 py-3.5 text-sm font-bold text-gray-800 dark:text-slate-200 backdrop-blur-sm transition-colors hover:border-primary-400 hover:bg-white dark:bg-slate-900"
            >
              Request a Demo
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">No credit card required · 30-day free trial · Cancel anytime</p>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-gray-100 bg-white dark:bg-slate-900 py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className={`bg-gradient-to-r ${s.gradient} bg-clip-text text-4xl font-extrabold text-transparent`}>{s.value}</p>
              <p className="mt-1 text-sm font-medium text-gray-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-primary-50/40 py-20">
        <div className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary-200/30 to-indigo-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="mb-14 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-primary-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
              <span>✨</span> Everything in One Place
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-4xl">
              Everything Your{" "}
              <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">Clinic Needs</span>
            </h2>
            <p className="mt-3 text-gray-500 dark:text-slate-400">One platform to manage your entire practice — from day one to scale.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} text-white shadow-lg ring-4 ring-white`}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                  </svg>
                </div>
                <h3 className="mb-2 font-bold text-gray-900 dark:text-slate-100">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-amber-50 py-20">
        <div className="pointer-events-none absolute -left-32 top-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-rose-200/30 to-amber-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4">
          <div className="mb-14 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-rose-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
              <span>🚀</span> Quick Start
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-4xl">
              Get Started in{" "}
              <span className="bg-gradient-to-r from-rose-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">4 Simple Steps</span>
            </h2>
            <p className="mt-3 text-gray-500 dark:text-slate-400">From sign-up to a fully running clinic in under an hour.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.num} className="relative rounded-3xl border border-gray-100 bg-white dark:bg-slate-900 p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} text-white shadow-lg ring-4 ring-white`}>
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                  </svg>
                </div>
                <span className={`mb-2 block bg-gradient-to-r ${step.gradient} bg-clip-text text-xs font-bold uppercase tracking-widest text-transparent`}>{step.num}</span>
                <h3 className="mb-2 font-bold text-gray-900 dark:text-slate-100">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-white dark:bg-slate-900 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-14 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-purple-700">
              <span>💜</span> Loved by Doctors
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-4xl">
              Loved by Clinics{" "}
              <span className="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">Worldwide</span>
            </h2>
            <p className="mt-3 text-gray-500 dark:text-slate-400">Join 2,500+ healthcare providers already using OduDoc.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <svg key={i} className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="mb-5 text-sm leading-relaxed text-gray-700 dark:text-slate-300">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${t.gradient} text-sm font-bold text-white shadow-lg ring-4 ring-white`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{t.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-purple-50 py-20">
        <div className="pointer-events-none absolute -right-32 top-10 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary-200/30 to-teal-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-10 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-purple-200/30 to-pink-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4">
          <div className="mb-14 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <span>🎁</span> 30-Day Free Trial · No Credit Card
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-4xl">
              One Simple Plan.{" "}
              <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">Everything Included.</span>
            </h2>
            <p className="mt-3 text-gray-500 dark:text-slate-400">
              Try free for 30 days. Then flat <span className="font-semibold text-gray-900 dark:text-slate-100">$100/month</span> — no tiers, no surprises.
            </p>
          </div>

          <div className="relative mx-auto max-w-3xl">
            {/* Most Popular Pill */}
            <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-500/30">
                <span>⭐</span> Most Popular
              </span>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-teal-600 to-emerald-600 p-[2px] shadow-2xl">
              <div className="overflow-hidden rounded-[calc(1.5rem-2px)] bg-white dark:bg-slate-900">
                <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 px-8 py-10 text-center text-white">
                  <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                  <span className="relative inline-block rounded-full bg-white/20 px-4 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    OduDoc Clinic · All-in-One
                  </span>
                  <h3 className="relative mt-4 text-2xl font-extrabold md:text-3xl">Complete Clinic Platform</h3>
                  <p className="relative mt-2 text-sm text-primary-50">Everything you need to run a modern clinic — nothing you don&apos;t.</p>
                </div>

                <div className="grid md:grid-cols-2">
                  <div className="border-b border-gray-100 p-8 md:border-b-0 md:border-r">
                    <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      First 30 Days
                    </div>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-5xl font-extrabold text-transparent">FREE</span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
                      Full access to every feature. No credit card required. Cancel anytime during trial with zero charge.
                    </p>
                  </div>

                  <div className="p-8">
                    <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-100 to-indigo-100 px-3 py-1 text-xs font-bold text-primary-700">
                      <span className="h-2 w-2 rounded-full bg-primary-500" />
                      After Trial
                    </div>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 bg-clip-text text-5xl font-extrabold text-transparent">$100</span>
                      <span className="text-sm text-gray-500 dark:text-slate-400">/month</span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
                      Flat monthly fee for the entire clinic. Unlimited doctors, patients, and appointments.
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100 bg-gradient-to-br from-slate-50 to-primary-50/40 p-8">
                  <h4 className="mb-5 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                    Everything Included
                  </h4>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {planFeatures.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/for-doctors/register"
                      className="flex-1 rounded-xl bg-gradient-to-r from-primary-600 via-teal-600 to-emerald-600 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105"
                    >
                      Start 30-Day Free Trial
                    </Link>
                    <Link
                      href="/contact"
                      className="flex-1 rounded-xl border-2 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3.5 text-center text-sm font-bold text-gray-700 dark:text-slate-300 transition-colors hover:border-primary-400"
                    >
                      Talk to Sales
                    </Link>
                  </div>
                  <p className="mt-4 text-center text-xs text-gray-500 dark:text-slate-400">
                    Secure payments via IndusPays · Cancel anytime · No setup fees
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white dark:bg-slate-900 py-20">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-14 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-100 to-indigo-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
              <span>❓</span> FAQ
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-4xl">
              Frequently Asked{" "}
              <span className="bg-gradient-to-r from-sky-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent">Questions</span>
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 px-6 py-4 shadow-sm transition-all open:shadow-lg hover:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-gray-900 dark:text-slate-100">
                  {faq.q}
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-primary-500 transition-transform group-open:rotate-180"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dark Accent CTA ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-teal-700 to-emerald-700 py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="pointer-events-none absolute -left-32 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 -bottom-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Available 24/7
          </span>
          <h2 className="text-3xl font-extrabold text-white md:text-5xl">
            Ready to Transform Your Clinic?
          </h2>
          <p className="mt-4 text-lg text-primary-50">
            Join 2,500+ clinics already managing smarter with OduDoc. Start free, no card required.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/for-doctors/register"
              className="rounded-xl bg-white dark:bg-slate-900 px-8 py-3.5 text-sm font-bold text-primary-700 shadow-lg transition-all hover:scale-105"
            >
              Start Free Trial →
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border-2 border-white/40 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
