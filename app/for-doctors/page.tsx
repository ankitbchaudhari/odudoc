import Link from "next/link";
import ComparisonMatrix from "@/components/marketing/ComparisonMatrix";

export const metadata = {
  title: "For Doctors - Grow Your Practice with OduDoc",
  description:
    "Join 1000+ doctors on OduDoc. Zero monthly fees — we only earn when you do. Pay just 30% commission per successful consultation.",
};

const stats = [
  { value: "1000+", label: "Doctors Joined" },
  { value: "50K+", label: "Patients Monthly" },
  { value: "4.9", label: "Average Rating" },
  { value: "98%", label: "Doctor Satisfaction" },
];

const steps = [
  {
    num: 1,
    title: "Register & Submit Documents",
    desc: "Fill out the application form and upload your medical license, ID proof, and qualifications.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    num: 2,
    title: "Get Verified (24-48 hours)",
    desc: "Our team reviews your documents. You'll get a verification badge once approved.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    num: 3,
    title: "Set Your Schedule & Fees",
    desc: "Configure your availability, consultation duration, and set your per-visit fee.",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    num: 4,
    title: "Start Consulting",
    desc: "Receive patient bookings and start video or in-person consultations right away.",
    icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  },
];

const commissionPerks = [
  {
    title: "Zero Monthly Fees",
    desc: "No subscription. No lock-in. Keep 100% of your fee when there are no consultations.",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    title: "30% Commission — Only When You Earn",
    desc: "We take a flat 30% per successful consultation. You keep 70% of every fee, every time.",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    color: "text-primary-600",
    bg: "bg-primary-50",
  },
  {
    title: "Weekly Payouts",
    desc: "Your 70% share is automatically paid to your bank account every week. Fully transparent.",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Unlimited Consultations",
    desc: "No caps. Take as many patients as your schedule allows. More consults = more earnings.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    title: "All Features Included",
    desc: "Video consults, digital prescriptions, patient records, analytics, reminders — everything at no extra cost.",
    icon: "M5 13l4 4L19 7",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Cancel Anytime",
    desc: "No commitments. Pause or leave whenever. Your patient records remain yours forever.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
];

const testimonials = [
  {
    name: "Dr. Emily Rodriguez",
    specialty: "Pediatrician",
    quote:
      "OduDoc has transformed my practice. I now see 40% more patients without the admin headache — and I only pay when I earn.",
    initials: "ER",
  },
  {
    name: "Dr. James Kumar",
    specialty: "Cardiologist",
    quote:
      "The zero-fee model is genius. No risk to join, and the 30% commission is more than fair for the patients they send me.",
    initials: "JK",
  },
  {
    name: "Dr. Linda Park",
    specialty: "Dermatologist",
    quote:
      "Setup was smooth. Got verified within 24 hours and started earning the next day. Payouts arrive every week, no delays.",
    initials: "LP",
  },
];

const faqs = [
  {
    q: "How long does verification take?",
    a: "Most applications are reviewed within 24-48 hours. You'll receive an email once verified.",
  },
  {
    q: "Is there any subscription or monthly fee for doctors?",
    a: "No. Doctors pay zero subscription fees. We only earn when you do — a flat 30% commission per successful consultation.",
  },
  {
    q: "How is the 30% commission calculated?",
    a: "If your consultation fee is $100, you receive $70 and OduDoc keeps $30. This covers payment processing, platform hosting, patient acquisition, and support.",
  },
  {
    q: "When do I get paid?",
    a: "Earnings are paid out weekly to your connected bank account. You can track every consultation and payout in your dashboard in real time.",
  },
  {
    q: "What counts as a 'successful consultation'?",
    a: "A consultation is marked successful once the patient attends the full session (video or in-person) and the fee is paid. Cancellations and no-shows are not charged.",
  },
  {
    q: "Is there a contract or lock-in?",
    a: "No contracts. You can pause or leave OduDoc anytime. Your patient records and history remain accessible to you.",
  },
];

export default function ForDoctorsPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-wider">
              ✨ AI-powered EMR · Free for India&apos;s doctors
            </span>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">
              The AI EMR that does your{" "}
              <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-white bg-clip-text text-transparent">
                paperwork for you
              </span>
            </h1>
            <p className="mt-6 text-lg text-white/90 md:text-xl">
              Ambient scribe writes your SOAP notes from the consultation audio. AI checks every prescription
              for drug interactions. ICD-10 codes auto-suggested. Zero monthly fee — flat 30% only when you earn.
            </p>
            <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
              <span>🎤 Ambient scribe</span>
              <span>·</span>
              <span>💊 Drug-interaction safety</span>
              <span>·</span>
              <span>📋 ICD-10 auto-coder</span>
              <span>·</span>
              <span>🧠 Differential diagnosis</span>
              <span>·</span>
              <span>🌏 12 Indian languages</span>
            </div>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/for-doctors/register"
                className="rounded-lg bg-white px-8 py-3 font-semibold text-primary-700 hover:bg-gray-100"
              >
                Join as a Doctor →
              </Link>
              <a
                href="#how-we-earn"
                className="rounded-lg border-2 border-white px-8 py-3 font-semibold text-white hover:bg-white/10"
              >
                How the pricing works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison matrix — drops in right after the hero so the
          differentiator vs Abridge / eka.doc / Practo lands before
          the visitor scrolls into the commission/perks block. */}
      <ComparisonMatrix />

      {/* Stats */}
      <section className="border-b border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-primary-600 md:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-gray-600">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Model */}
      <section id="how-we-earn" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-green-700">
              No Subscription · No Hidden Fees
            </span>
            <h2 className="mt-4 text-3xl font-bold text-gray-900 md:text-4xl">
              You Earn First. We Earn Later.
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              OduDoc is completely free for doctors to join. We charge a flat
              <span className="font-semibold text-primary-600"> 30% commission </span>
              per successful consultation — you keep
              <span className="font-semibold text-primary-600"> 70% </span>
              of every fee.
            </p>
          </div>

          {/* Earnings calculator card */}
          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-8 shadow-md">
            <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-primary-700">
              Example Consultation
            </h3>
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500">Consultation Fee</div>
                <div className="mt-1 text-3xl font-extrabold text-gray-900">$100</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">You Keep (70%)</div>
                <div className="mt-1 text-3xl font-extrabold text-green-600">$70</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">OduDoc (30%)</div>
                <div className="mt-1 text-3xl font-extrabold text-primary-600">$30</div>
              </div>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="flex h-full">
                <div className="flex h-full w-[70%] items-center justify-center bg-green-500 text-xs font-bold text-white">
                  70% to Doctor
                </div>
                <div className="flex h-full w-[30%] items-center justify-center bg-primary-600 text-xs font-bold text-white">
                  30%
                </div>
              </div>
            </div>
            <p className="mt-6 text-center text-xs text-gray-500">
              No consultation = No charge. We only earn when you successfully consult a patient.
            </p>
          </div>

          {/* Perks grid */}
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {commissionPerks.map((p) => (
              <div
                key={p.title}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${p.bg}`}>
                  <svg className={`h-6 w-6 ${p.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={p.icon} />
                  </svg>
                </div>
                <h3 className="mb-2 font-bold text-gray-900">{p.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/for-doctors/register"
              className="inline-block rounded-lg bg-primary-600 px-8 py-3.5 font-semibold text-white shadow-md hover:bg-primary-700"
            >
              Start Earning Today
            </Link>
            <p className="mt-3 text-xs text-gray-500">
              Takes 10 minutes to apply · Get verified within 48 hours
            </p>
          </div>
        </div>
      </section>

      {/* Free EMR — clinic-in-a-box */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-cyan-50 to-indigo-50 py-20">
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute -top-40 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-200/40 via-cyan-200/40 to-indigo-200/40 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-100 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Now included · No extra cost
            </span>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 md:text-4xl">
              Run your whole clinic on OduDoc
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              The platform just upgraded into a full small-clinic EMR. Patients,
              SOAP notes, prescriptions, lab files, invoices, payments, staff —
              all in your dashboard. <b>50 patients/month free</b>, then $50 to
              unlock unlimited for that month. Cancel anytime.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Patients & SOAP notes", icon: "🩺", desc: "Build a real medical record per patient with chronic conditions, allergies, vitals and dated SOAP notes — searchable, exportable.", tone: "from-emerald-50 to-emerald-100/40" },
              { title: "Lab reports & scans", icon: "🧪", desc: "Upload PDFs, X-rays and reports straight to a patient's chart. 10 MB per file, hosted on the same private VPS as your prescriptions.", tone: "from-cyan-50 to-cyan-100/40" },
              { title: "Invoices + online payment", icon: "💳", desc: "Raise multi-line invoices in your local currency. Send the patient a one-click pay link — Stripe Checkout marks it paid automatically.", tone: "from-amber-50 to-amber-100/40" },
              { title: "Staff with roles", icon: "👥", desc: "Add 1 nurse + 1 front desk on free, or 3+3+3 (with extra doctors) on the unlock. Front desk registers patients, nurse logs visits, you sign certificates.", tone: "from-violet-50 to-violet-100/40" },
              { title: "FHIR + HL7 export", icon: "📤", desc: "Click once and download a patient as a FHIR R4 bundle or an HL7 v2 message. Migrate to or from any modern hospital system.", tone: "from-indigo-50 to-indigo-100/40" },
              { title: "Audit log + AI tools", icon: "📋", desc: "Every action timestamped + attributed. AI prescription assistant, voice prescription, prescription templates — all included.", tone: "from-fuchsia-50 to-fuchsia-100/40" },
            ].map((f) => (
              <div
                key={f.title}
                className={`rounded-2xl border border-white/60 bg-gradient-to-br ${f.tone} p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-1.5 font-bold text-gray-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Pricing card */}
          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                Free forever
              </p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900">
                Solo doctor + 50 patients / month
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Perfect for solo practitioners. Everything works — no asterisks,
                no demo data, no time limit.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-gray-700">
                {[
                  "50 new patients / month",
                  "1 nurse + 1 front desk seat (you don't count)",
                  "Unlimited visits, files, invoices, prescriptions, certificates",
                  "AI prescription assistant + voice dictation",
                  "FHIR + HL7 export · GDPR portability",
                  "Patient online payments via Stripe",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-3xl font-bold text-gray-900">
                $0 <span className="text-base font-normal text-gray-500">/ month</span>
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-7 text-white shadow-lg shadow-emerald-500/30">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100">
                Growing practice? One $50 unlocks the whole month.
              </p>
              <h3 className="mt-1 text-2xl font-bold">
                Practice unlock — $50 / month
              </h3>
              <p className="mt-2 text-sm text-emerald-50">
                Lifts both caps for the calendar month — up to 250 patients
                AND a 3+3+3 team. Single one-time payment per month, no
                auto-renew.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-emerald-50">
                {[
                  "Up to 250 new patients / month",
                  "3 nurses + 3 front desk + 3 staff doctors",
                  "Pay via Stripe — issued by your existing OduDoc account",
                  "Cancel anytime by simply not paying next time",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-3xl font-bold">
                $50 <span className="text-base font-normal text-emerald-100">/ month</span>
              </p>
            </div>
          </div>

          {/* Corporate strip */}
          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Multi-clinic / hospital
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  More than 250 patients/month or 3+3+3 staff? OduDoc Corporate.
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Unlimited patients, unlimited staff &amp; roles, multi-clinic
                  admin, BAA / DPA available, custom SLA. Talk to us.
                </p>
              </div>
              <Link
                href="/corporate"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-600"
              >
                Visit /corporate
                <span>→</span>
              </Link>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/for-doctors/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-xl"
            >
              Get your free clinic dashboard
              <span>→</span>
            </Link>
            <p className="mt-3 text-xs text-gray-500">
              Already on OduDoc? It&apos;s already in your dashboard under{" "}
              <b>Clinic EMR</b>.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Get up and running in 4 simple steps
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.num}
                className="relative rounded-xl bg-white p-6 shadow-sm"
              >
                <div className="absolute -top-4 left-6 flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {s.num}
                </div>
                <div className="mb-3 mt-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={s.icon}
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              Doctors Love OduDoc
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Here&apos;s what our medical community says
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="mb-4 flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.922-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.196-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-700">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {t.name}
                    </div>
                    <div className="text-xs text-gray-500">{t.specialty}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-gray-200 bg-white p-5"
              >
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
                  {f.q}
                  <svg
                    className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary-700 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold md:text-4xl">
            Join 1000+ Doctors on OduDoc
          </h2>
          <p className="mt-4 text-white/90">
            Zero monthly fees. No risk. Start earning in under 48 hours.
          </p>
          <Link
            href="/for-doctors/register"
            className="mt-8 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-primary-700 hover:bg-gray-100"
          >
            Start Your Application
          </Link>
        </div>
      </section>
    </div>
  );
}
