import Link from "next/link";

const features = [
  {
    title: "Smart Appointment System",
    desc: "Online booking, automated reminders, and queue management. Reduce no-shows by 40%.",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    title: "Digital Health Records",
    desc: "Paperless patient records with instant search. Access histories, prescriptions, and reports from anywhere.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    title: "Billing & Invoicing",
    desc: "Automated billing, GST invoices, and insurance claim processing. Accept UPI, cards, and net banking.",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    title: "Inventory Management",
    desc: "Track medicines, consumables, and equipment. Auto-reorder alerts when stock runs low.",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    title: "Staff Management",
    desc: "Manage doctor schedules, staff roles, attendance, and payroll from a single dashboard.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    title: "Analytics & Reports",
    desc: "Revenue reports, patient demographics, peak hours analysis, and doctor performance metrics.",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
];

const plans = [
  { name: "Starter", price: "$49", period: "/month", features: ["Up to 3 doctors", "500 appointments/month", "Basic EHR", "Email support"], highlight: false },
  { name: "Professional", price: "$149", period: "/month", features: ["Up to 15 doctors", "Unlimited appointments", "Full EHR + Billing", "Priority support", "Analytics dashboard", "Inventory mgmt"], highlight: true },
  { name: "Enterprise", price: "Custom", period: "", features: ["Unlimited doctors", "Multi-branch", "Custom integrations", "Dedicated account manager", "SLA guarantee", "On-premise option"], highlight: false },
];

export default function ForClinicsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-20 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-200">For Clinics & Hospitals</p>
          <h1 className="text-4xl font-bold md:text-5xl">Run Your Clinic Smarter</h1>
          <p className="mt-4 text-lg text-primary-100">
            All-in-one clinic management software. Appointments, records, billing, and more.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="rounded-xl bg-white px-8 py-3 text-sm font-semibold text-primary-700 shadow-lg hover:bg-gray-50">
              Request Demo
            </Link>
            <Link href="/for-doctors/register" className="rounded-xl border-2 border-white/30 px-8 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Sign Up Free
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-4 text-center text-2xl font-bold text-gray-900">Everything Your Clinic Needs</h2>
          <p className="mb-12 text-center text-gray-500">One platform to manage your entire practice</p>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-100 p-6 transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                  <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Pricing */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">Simple, Transparent Pricing</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.name} className={`rounded-2xl border-2 p-6 ${p.highlight ? "border-primary-500 bg-white shadow-lg" : "border-gray-100 bg-white"}`}>
                {p.highlight && <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary-600">Most Popular</p>}
                <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                <div className="mt-2 mb-6">
                  <span className="text-3xl font-bold text-gray-900">{p.price}</span>
                  <span className="text-sm text-gray-500">{p.period}</span>
                </div>
                <ul className="mb-6 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/contact" className={`block rounded-lg py-2.5 text-center text-sm font-semibold ${p.highlight ? "bg-primary-600 text-white hover:bg-primary-700" : "border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                  {p.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
