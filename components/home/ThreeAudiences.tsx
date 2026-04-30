// Three-audience callout — splits the homepage flow into clear paths
// for the three distinct visitors we want to convert: corporates
// looking to add OduDoc as an employee health benefit, doctors
// looking for an EMR + telemedicine platform, and patients booking
// a consultation today. Each card has a single CTA so the visitor
// doesn't have to think.

import Link from "next/link";

interface Audience {
  badge: string;
  title: string;
  bullets: string[];
  cta: { label: string; href: string };
  /** Tailwind gradient classes — kept intense so the cards visually
   *  separate even when the user is skim-scrolling on mobile. */
  gradient: string;
  iconPath: string;
}

const AUDIENCES: Audience[] = [
  {
    badge: "I'm a patient",
    title: "Book a doctor in 60 seconds",
    bullets: [
      "Verified GPs and specialists across India + global",
      "Video consultations + digital prescription within minutes",
      "AI follow-up Q&A 24/7 after your visit",
      "Local pricing in your currency",
    ],
    cta: { label: "Book a consultation", href: "/consult" },
    gradient: "from-sky-500 via-blue-600 to-indigo-600",
    iconPath:
      "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    badge: "I'm a doctor",
    title: "The AI-EMR that pays for itself in week one",
    bullets: [
      "Ambient scribe — writes your SOAP note from the consultation audio",
      "AI patient summary, drug-interaction checker, ICD-10 auto-coder",
      "Free clinic EMR — 50 patients/month free, $50 to unlock 250",
      "Stripe payouts, FHIR/HL7 export, full audit trail",
    ],
    cta: { label: "Apply to join", href: "/for-doctors" },
    gradient: "from-emerald-500 via-teal-600 to-cyan-600",
    iconPath:
      "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    badge: "I run a company",
    title: "Telemedicine + AI-EMR for your team",
    bullets: [
      "On-demand video consults for every employee + dependant",
      "Branded portal in your colours — looks like your benefit, not ours",
      "Group billing, single invoice, usage analytics dashboard",
      "Multi-language coverage for distributed Indian teams",
    ],
    cta: { label: "Talk to enterprise", href: "/corporate" },
    gradient: "from-violet-500 via-purple-600 to-fuchsia-600",
    iconPath:
      "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
];

export default function ThreeAudiences() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
            Built for{" "}
            <span className="bg-gradient-to-r from-sky-600 via-emerald-600 to-violet-600 bg-clip-text text-transparent">
              everyone in the room
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            Pick your path — patients book, doctors practise, companies cover their people.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div
              key={a.badge}
              className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg transition-transform hover:-translate-y-1"
            >
              <div className={`relative bg-gradient-to-br ${a.gradient} p-6 text-white`}>
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10" />
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={a.iconPath} />
                      </svg>
                    </div>
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
                      {a.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold leading-tight">{a.title}</h3>
                </div>
              </div>

              <div className="p-6">
                <ul className="space-y-2.5">
                  {a.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={a.cta.href}
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${a.gradient} px-5 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105`}
                >
                  {a.cta.label}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
