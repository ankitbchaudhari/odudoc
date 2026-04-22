// Colorful services/features grid for the homepage.
// Six flagship services rendered as vibrant gradient cards to draw the eye
// and quickly communicate what OduDoc offers.

import Link from "next/link";

const services = [
  {
    title: "Video Consultations",
    description: "Talk to verified doctors over secure HD video — any time, any place.",
    href: "/consult",
    gradient: "from-sky-500 to-indigo-600",
    bg: "from-sky-50 to-indigo-50",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Find Specialists",
    description: "Browse 500+ specialists across every department and book in minutes.",
    href: "/doctors",
    gradient: "from-emerald-500 to-teal-600",
    bg: "from-emerald-50 to-teal-50",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: "Online Pharmacy",
    description: "Order prescribed medicines with home delivery & genuine-med guarantee.",
    href: "/shop",
    gradient: "from-fuchsia-500 to-pink-600",
    bg: "from-fuchsia-50 to-pink-50",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    title: "Digital Prescriptions",
    description: "Beautiful, printable, shareable Rx — delivered straight to your dashboard.",
    href: "/dashboard/prescriptions",
    gradient: "from-amber-500 to-orange-600",
    bg: "from-amber-50 to-orange-50",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "Lab Tests at Home",
    description: "Book diagnostics with doorstep sample collection and digital reports.",
    href: "/results",
    gradient: "from-rose-500 to-red-600",
    bg: "from-rose-50 to-red-50",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    title: "Health Records",
    description: "All your prescriptions, tests and visits in one encrypted place.",
    href: "/dashboard",
    gradient: "from-violet-500 to-purple-600",
    bg: "from-violet-50 to-purple-50",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

export default function ServicesGrid() {
  return (
    <section className="relative overflow-hidden bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-100 to-purple-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-purple-700">
            Everything You Need
          </span>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 md:text-5xl">
            Your Complete{" "}
            <span className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Healthcare Hub
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-500">
            From video consultations to home lab tests — everything you need for a
            healthier life, in one beautiful app.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.title}
              href={s.href}
              className={`group relative overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-br ${s.bg} p-7 transition-all hover:-translate-y-2 hover:shadow-2xl`}
            >
              <div
                className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.gradient} text-white shadow-lg ring-4 ring-white transition-transform group-hover:scale-110 group-hover:rotate-3`}
              >
                {s.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.description}</p>
              <span
                className={`mt-5 inline-flex items-center gap-1 text-sm font-semibold bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent`}
              >
                Learn more
                <svg className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>

              {/* Decorative blob */}
              <div
                className={`pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
