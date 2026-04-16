import Link from "next/link";

const features = [
  {
    title: "Smart Appointment System",
    desc: "Online booking, automated SMS/email reminders, and real-time queue management. Reduce no-shows by up to 40%.",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Digital Health Records (EHR)",
    desc: "Paperless patient records with instant search. Access full histories, prescriptions, lab reports, and vitals from anywhere.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    color: "text-primary-600",
    bg: "bg-primary-50",
  },
  {
    title: "Billing & Invoicing",
    desc: "Automated billing, GST/VAT invoices, and insurance claim processing. Accept UPI, cards, and net banking seamlessly.",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    title: "Inventory Management",
    desc: "Track medicines, consumables, and equipment in real time. Get auto-reorder alerts before stock runs out.",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    title: "Staff & Payroll Management",
    desc: "Manage doctor schedules, staff roles, attendance tracking, leave management, and payroll from one dashboard.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Analytics & Reports",
    desc: "Revenue reports, patient demographics, peak hour analysis, and doctor performance metrics — all in real time.",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    title: "Telemedicine & Video Consult",
    desc: "Built-in HD video consultations. Patients book online, doctors consult from anywhere. Prescriptions sent automatically.",
    icon: "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    title: "Patient Engagement",
    desc: "Automated follow-up messages, health tips, medication reminders, and satisfaction surveys to boost patient retention.",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    title: "Multi-Branch Support",
    desc: "Manage multiple clinic branches from one account. Centralized patient records, shared inventory, and consolidated reports.",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
];

const stats = [
  { value: "2,500+", label: "Clinics Onboarded" },
  { value: "40%", label: "Fewer No-Shows" },
  { value: "3x", label: "Faster Billing" },
  { value: "98%", label: "Satisfaction Rate" },
];

const steps = [
  {
    num: "01",
    title: "Sign Up & Set Up",
    desc: "Register your clinic in minutes. Add your doctors, services, working hours, and fee structure.",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    num: "02",
    title: "Go Live with Bookings",
    desc: "Share your clinic's booking link. Patients book appointments online 24/7 — no phone calls needed.",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    num: "03",
    title: "Manage Everything",
    desc: "Use the dashboard to handle records, billing, inventory, and staff — all from one place.",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  },
  {
    num: "04",
    title: "Grow Your Practice",
    desc: "Leverage analytics to spot trends, improve patient satisfaction, and scale with multi-branch support.",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
];

const testimonials = [
  {
    name: "Dr. Amina Osei",
    role: "Cardiologist, HeartCare Clinic — Lagos",
    text: "OduDoc's clinic platform cut our billing time in half. The automated reminders alone reduced no-shows by 35%. I can't imagine running my practice without it.",
    initials: "AO",
    color: "bg-rose-500",
    rating: 5,
  },
  {
    name: "Dr. Raj Mehta",
    role: "Pediatrician, Little Stars Hospital — Mumbai",
    text: "Managing 3 branches used to be a nightmare. Now everything — records, inventory, payroll — is centralized. The multi-branch feature is a game changer.",
    initials: "RM",
    color: "bg-blue-500",
    rating: 5,
  },
  {
    name: "Dr. Claire Fontaine",
    role: "General Physician, MedPlus Clinic — Paris",
    text: "The EHR system is intuitive and fast. My patients love the online booking, and I love the automatic prescription generation after every video consult.",
    initials: "CF",
    color: "bg-teal-500",
    rating: 5,
  },
];

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    desc: "Perfect for solo practitioners and small clinics.",
    features: [
      "Up to 3 doctors",
      "500 appointments/month",
      "Basic EHR",
      "Online booking page",
      "Automated reminders",
      "Email support",
    ],
    highlight: false,
    cta: "Get Started Free",
  },
  {
    name: "Professional",
    price: "$149",
    period: "/month",
    desc: "Everything a growing multi-doctor clinic needs.",
    features: [
      "Up to 15 doctors",
      "Unlimited appointments",
      "Full EHR + Billing",
      "Inventory management",
      "Staff & payroll module",
      "Analytics dashboard",
      "Telemedicine included",
      "Priority support",
    ],
    highlight: true,
    cta: "Start 14-Day Trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For hospital chains and multi-branch networks.",
    features: [
      "Unlimited doctors",
      "Multi-branch management",
      "Custom integrations & API",
      "Dedicated account manager",
      "SLA guarantee",
      "On-premise option",
      "Staff training included",
    ],
    highlight: false,
    cta: "Contact Sales",
  },
];

const faqs = [
  { q: "Is my patient data secure?", a: "Yes. All data is encrypted in transit and at rest with AES-256 encryption. We comply with HIPAA, GDPR, and local health data regulations." },
  { q: "Can I import existing patient records?", a: "Absolutely. We provide a bulk import tool for CSV/Excel files and support HL7 / FHIR data formats for seamless migration." },
  { q: "Does it work on mobile?", a: "Yes. OduDoc Clinic is fully responsive and we offer native iOS and Android apps for doctors and front-desk staff." },
  { q: "Is there a free trial?", a: "Yes — 14 days free on the Professional plan, no credit card required. You can downgrade or cancel anytime." },
  { q: "Can patients book without the app?", a: "Yes. Patients can book via your clinic's unique booking link on any browser — no app download needed." },
];

export default function ForClinicsPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 py-24 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-100">
            For Clinics & Hospitals
          </span>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
            Run Your Clinic <span className="text-primary-200">Smarter.</span>
            <br />Grow It <span className="text-primary-200">Faster.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-primary-100 md:text-xl">
            All-in-one clinic management — appointments, digital records, billing,
            inventory, staff, telemedicine, and more. Built for modern healthcare.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/for-doctors/register"
              className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-primary-700 shadow-xl hover:bg-gray-50 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border-2 border-white/30 px-8 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
            >
              Request a Demo
            </Link>
          </div>
          <p className="mt-4 text-xs text-primary-300">No credit card required · 14-day free trial · Cancel anytime</p>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-b border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-primary-600">{s.value}</p>
              <p className="mt-1 text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Everything Your Clinic Needs</h2>
            <p className="mt-3 text-gray-500">One platform to manage your entire practice — from day one to scale.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-gray-100 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.bg}`}>
                  <svg className={`h-6 w-6 ${f.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                  </svg>
                </div>
                <h3 className="mb-2 font-bold text-gray-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Get Started in 4 Simple Steps</h2>
            <p className="mt-3 text-gray-500">From sign-up to a fully running clinic in under an hour.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.num} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="absolute left-full top-8 hidden w-full border-t-2 border-dashed border-primary-200 lg:block" style={{ width: "calc(100% - 4rem)", left: "calc(50% + 2rem)" }} />
                )}
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={step.icon} />
                  </svg>
                </div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-primary-500">{step.num}</span>
                <h3 className="mb-2 font-bold text-gray-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Loved by Clinics Worldwide</h2>
            <p className="mt-3 text-gray-500">Join 2,500+ healthcare providers already using OduDoc.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                {/* Stars */}
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <svg key={i} className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="mb-5 text-sm leading-relaxed text-gray-700">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${t.color} text-sm font-bold text-white`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Simple, Transparent Pricing</h2>
            <p className="mt-3 text-gray-500">No hidden fees. Scale up or down anytime.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl p-7 ${
                  p.highlight
                    ? "border-2 border-primary-500 bg-white shadow-xl"
                    : "border border-gray-200 bg-white shadow-sm"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary-600 px-4 py-1 text-xs font-bold text-white shadow">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                <p className="mt-1 text-xs text-gray-500">{p.desc}</p>
                <div className="my-5 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">{p.price}</span>
                  <span className="mb-1 text-sm text-gray-500">{p.period}</span>
                </div>
                <ul className="mb-7 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.name === "Enterprise" ? "/contact" : "/for-doctors/register"}
                  className={`block rounded-xl py-3 text-center text-sm font-bold transition-colors ${
                    p.highlight
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : "border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm open:shadow-md"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-gray-900">
                  {faq.q}
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-gradient-to-r from-primary-700 to-primary-900 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to Transform Your Clinic?
          </h2>
          <p className="mt-3 text-primary-100">
            Join 2,500+ clinics already managing smarter with OduDoc. Start free, no card required.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/for-doctors/register"
              className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-primary-700 shadow-lg hover:bg-gray-50"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border-2 border-white/30 px-8 py-3.5 text-sm font-bold text-white hover:bg-white/10"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
