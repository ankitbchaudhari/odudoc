import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Foreign Study Programmes — MBBS Abroad",
  description: "MBBS and medical-degree programmes abroad — Russia, Ukraine, Georgia, Kazakhstan, Philippines, China — listed by verified educational agencies on OduDoc.",
  alternates: { canonical: "/foreign-studies" },
};

// Spec: Footer_v2_Cowork Section 3 + Header_Footer_Final Section 2.3.
// Foreign study programmes — listed by verified educational agencies
// and institutes (not individual students). Students browse, filter,
// and enquire; the enquiry routes to the listing agency.
const COUNTRIES = [
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
];

const PROGRAMMES = [
  { country: "Russia", flag: "🇷🇺", uni: "Crimea Federal University", degree: "MBBS (6 years)", language: "English", nmc: true, fmge: "78%", fee: "$4,500/yr" },
  { country: "Russia", flag: "🇷🇺", uni: "Bashkir State Medical University", degree: "MBBS (6 years)", language: "English", nmc: true, fmge: "62%", fee: "$5,200/yr" },
  { country: "Georgia", flag: "🇬🇪", uni: "Tbilisi State Medical University", degree: "MD (6 years)", language: "English", nmc: true, fmge: "84%", fee: "$7,800/yr" },
  { country: "Kazakhstan", flag: "🇰🇿", uni: "Kazakh National Medical University", degree: "MBBS (5 years)", language: "English", nmc: true, fmge: "71%", fee: "$3,900/yr" },
  { country: "Philippines", flag: "🇵🇭", uni: "AMA School of Medicine", degree: "MD (5 years)", language: "English", nmc: true, fmge: "55%", fee: "$6,400/yr" },
  { country: "Uzbekistan", flag: "🇺🇿", uni: "Tashkent Medical Academy", degree: "MBBS (6 years)", language: "English", nmc: true, fmge: "68%", fee: "$3,200/yr" },
];

export default function ForeignStudiesPage() {
  return (
    <main>
      <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
            <span>✦</span> New
          </div>
          <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">
            MBBS abroad —{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
              verified programmes
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Browse medical-degree programmes from 8+ countries, listed by verified
            educational agencies on OduDoc. Every programme shows NMC recognition,
            FMGE pass rate, and current intake details.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            {COUNTRIES.map((c) => (
              <span key={c.code} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <span>{c.flag}</span> {c.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Featured programmes</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{PROGRAMMES.length} programmes · 8 countries</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PROGRAMMES.map((p) => (
              <div key={p.uni} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-2xl">
                  <span>{p.flag}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">{p.country}</span>
                </div>
                <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-slate-100">{p.uni}</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{p.degree} · {p.language}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">NMC recognised</dt>
                    <dd className="font-semibold text-emerald-600 dark:text-emerald-400">{p.nmc ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-slate-400">FMGE pass rate</dt>
                    <dd className="font-semibold text-gray-900 dark:text-slate-100">{p.fmge}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-gray-500 dark:text-slate-400">Tuition fee</dt>
                    <dd className="font-semibold text-gray-900 dark:text-slate-100">{p.fee}</dd>
                  </div>
                </dl>
                <Link
                  href={`/contact?subject=foreign-studies&programme=${encodeURIComponent(p.uni)}`}
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                >
                  Enquire →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-14 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Are you an educational agency?</h2>
          <p className="mt-3 text-gray-600 dark:text-slate-300">
            List your foreign-study programmes on OduDoc. Reach lakhs of Indian
            students browsing medical-degree options abroad. NMC verification, FMGE
            data, and student enquiries routed directly to your dashboard.
          </p>
          <Link
            href="/signup/corporate/education-agency"
            className="mt-6 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg"
          >
            List your programmes →
          </Link>
        </div>
      </section>
    </main>
  );
}
