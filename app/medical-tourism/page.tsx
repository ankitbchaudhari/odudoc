import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Medical Tourism — pre-flight consult, transparent costs, post-return follow-up",
  description: "Compare medical procedures across countries, consult with the destination surgeon before flying, and stay connected to your home doctor during treatment.",
  alternates: { canonical: "/medical-tourism" },
};

// Spec v6.0 §24 — Medical Tourism module. Public feature page; the
// actual booking workflow lives in /dashboard for signed-in patients.
const PROCEDURES = [
  { name: "Knee replacement (TKR)", india: "$5,800", thailand: "$13,200", us: "$45,000", saves: "87%" },
  { name: "Cardiac bypass (CABG)", india: "$7,500", thailand: "$18,000", us: "$78,000", saves: "90%" },
  { name: "Hip replacement (THR)", india: "$6,200", thailand: "$14,000", us: "$50,000", saves: "88%" },
  { name: "Dental implants (full mouth)", india: "$2,400", thailand: "$8,000", us: "$22,000", saves: "89%" },
  { name: "IVF (per cycle)", india: "$3,500", thailand: "$5,500", us: "$15,000", saves: "77%" },
  { name: "Bariatric surgery", india: "$5,000", thailand: "$13,000", us: "$25,000", saves: "80%" },
];

const STEPS = [
  { n: 1, emoji: "🔍", title: "Compare destinations", body: "Procedure cost across 8 destination countries, surgeon credentials, hospital accreditations." },
  { n: 2, emoji: "📹", title: "Pre-flight video consult", body: "Mandatory consultation with the destination surgeon before any payment is collected." },
  { n: 3, emoji: "💳", title: "Escrow payment", body: "Funds held in escrow. Released to the hospital only after the procedure is completed and signed off." },
  { n: 4, emoji: "✈️", title: "Travel + surgery", body: "Visa-assist documentation, airport pickup, hospital stay, surgery, recovery — all coordinated." },
  { n: 5, emoji: "🏠", title: "Post-return follow-up", body: "Your home doctor gets read access during your stay. Discharge summary auto-sent on return." },
];

export default function MedicalTourismPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 py-20 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Medical Tourism</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-5xl">
            World-class surgery at a fraction of the cost
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Compare procedures across 8 destination countries. Talk to the destination surgeon by video before you fly.
            Pay through escrow. Stay connected to your home doctor throughout.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/doctors?context=medical-tourism" className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/40 transition-transform hover:-translate-y-0.5">
              Browse surgeons →
            </Link>
            <Link href="/contact?subject=medical-tourism" className="rounded-xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20">
              Talk to a coordinator
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-white">{s.n}</span>
                  <span className="text-2xl">{s.emoji}</span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-slate-100">{s.title}</h3>
                <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 dark:bg-slate-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Indicative procedure costs</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
            All-inclusive estimates — surgeon fees, hospital stay, theatre, anaesthesia. Travel costs not included.
            Final quote after pre-flight consult.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Procedure</th>
                  <th className="px-4 py-3 text-left font-semibold">🇮🇳 India</th>
                  <th className="px-4 py-3 text-left font-semibold">🇹🇭 Thailand</th>
                  <th className="px-4 py-3 text-left font-semibold">🇺🇸 US (baseline)</th>
                  <th className="px-4 py-3 text-right font-semibold">Saves vs US</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {PROCEDURES.map((p) => (
                  <tr key={p.name}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{p.name}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{p.india}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{p.thailand}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{p.us}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{p.saves}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
            Pricing is indicative and varies by hospital tier, surgeon experience, length of stay, and complications.
            Final quote is locked at the pre-flight consult stage.
          </p>
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Ready to explore?</h2>
          <p className="mt-3 text-gray-600 dark:text-slate-300">
            Free to browse, free to consult. You only pay (via escrow) after you&apos;ve picked your surgeon and confirmed the plan.
          </p>
          <Link
            href="/signup?path=patient"
            className="mt-6 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg"
          >
            Get started — free →
          </Link>
        </div>
      </section>
    </main>
  );
}
