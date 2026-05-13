// /pilot — single-purpose landing page for cold-outreach prospects.
//
// No nav, no banners, no announcement bar. Just hero + value prop +
// comparison teaser + calendar booking. Visitor came here from a
// cold email; they don't need the rest of the site distracting them.
// Closes faster than /for-doctors because there's nowhere else to click.

import Link from "next/link";

export const metadata = {
  title: "OduDoc Pilot — 90-day AI EMR free trial for one clinic",
  description:
    "Free 90-day pilot of OduDoc's AI EMR. Ambient scribe, drug-interaction safety, ICD-10 auto-coder, 22 Indian languages. Founder-direct support.",
};

const FEATURES = [
  {
    icon: "🎤",
    title: "Ambient AI scribe",
    body: "Audio of your consultation → structured SOAP note in ~30 seconds. 22 Indian languages including Hinglish. Doctors save 90+ minutes a day.",
  },
  {
    icon: "🧠",
    title: "AI patient summary",
    body: "Open any chart, get a 4-bullet briefing — active conditions, recent findings, red flags, what to focus on today. Cited to specific visits.",
  },
  {
    icon: "💊",
    title: "Drug-interaction safety net",
    body: "Every prescription checked in real-time against allergies, chronic conditions, and other meds. Severe interactions block sending.",
  },
  {
    icon: "📋",
    title: "ICD-10 + differential Dx",
    body: "Auto-suggested billing codes from your SOAP note. Differential diagnosis on the cases where assessment is ambiguous.",
  },
  {
    icon: "📖",
    title: "Medical dictionary",
    body: "Look up any term, abbreviation, or drug — generic or Indian brand. Returns dosing, contraindications, pregnancy category, D&CR Schedule.",
  },
  {
    icon: "🌏",
    title: "22 Indian languages",
    body: "Generate or translate any prescription into the patient's preferred language. Drug names stay in Latin script for pharmacy safety.",
  },
];

const COMPARISON = [
  { feature: "Ambient AI scribe",                     odu: "Free",     others: "$300-500/dr/mo (Abridge)" },
  { feature: "Patient summary on chart open",         odu: "Free",     others: "Not in eka.doc / Practo" },
  { feature: "Drug-interaction safety",               odu: "Free",     others: "Manual / paid add-on" },
  { feature: "ICD-10 auto-coder",                     odu: "Free",     others: "Not in any Indian app" },
  { feature: "Indian language prescriptions",         odu: "22 langs", others: "14 (eka.doc)" },
  { feature: "Per-doctor cost dashboard",             odu: "Free",     others: "Not offered" },
  { feature: "FHIR/HL7 export — your data",           odu: "Free",     others: "Paid add-on or none" },
];

export default function PilotPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      {/* Minimal header — logo only, no nav */}
      <header className="border-b border-slate-100 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white">
              O
            </div>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">OduDoc</span>
          </Link>
          <a
            href="mailto:founder@odudoc.com"
            className="text-sm font-semibold text-violet-700 hover:underline"
          >
            founder@odudoc.com
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-gradient-to-br from-violet-300/30 to-indigo-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 top-40 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-300/30 to-emerald-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-700">
              ✨ Pilot programme · 90 days free
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-900 dark:text-slate-100 sm:text-5xl md:text-6xl">
              The AI EMR that does your{" "}
              <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                paperwork for you
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              Ambient scribe writes your SOAP note from the consultation audio. AI checks every prescription. ICD-10 codes auto-suggested. <strong className="text-slate-900 dark:text-slate-100">Free for 90 days, founder-direct support, you message me and I pick up.</strong>
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="mailto:founder@odudoc.com?subject=Pilot%20programme%20-%20interested&body=Hi%2C%0A%0AI%27m%20interested%20in%20the%20OduDoc%20pilot.%20Here%27s%20a%20bit%20about%20me%3A%0A%0AName%3A%20%0ASpecialty%3A%20%0AClinic%20size%3A%20%0ACity%3A%20%0AAvg%20patients%2Fday%3A%20%0A%0ABest%20number%20to%20call%3A%20%0A%0AThanks."
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-transform hover:scale-105"
              >
                Email me about the pilot
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="https://wa.me/919999999999?text=Hi%20I%27m%20interested%20in%20the%20OduDoc%20pilot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-7 py-3.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                💬 WhatsApp instead
              </a>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Reply with your specialty, clinic size, and city. I&rsquo;ll send a 15-minute call slot the same day.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-slate-100">
            What&rsquo;s in the pilot
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
            Everything below is live in production today. No vapourware.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cost comparison teaser */}
      <section className="bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            What&rsquo;s included vs what others charge
          </h2>
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="grid grid-cols-3 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/60">
              <div>Feature</div>
              <div className="text-center text-violet-300">OduDoc pilot</div>
              <div className="text-center text-white/60">Other Indian / US tools</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 px-4 py-3 text-sm ${i % 2 === 1 ? "bg-white/5" : ""}`}
              >
                <div className="text-white/85">{row.feature}</div>
                <div className="text-center font-bold text-emerald-300">{row.odu}</div>
                <div className="text-center text-white/60">{row.others}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-white/70">
            After the 90-day pilot, Practice tier is <strong className="text-white">$50/clinic/month flat</strong> (3 doctors + 3 staff seats, ambient scribe included). For comparison, Abridge bills US groups around <strong className="text-white">$400/doctor/month</strong> for ambient scribe alone.
          </p>
        </div>
      </section>

      {/* What I'll ask in return */}
      <section className="bg-white dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            What I&rsquo;ll ask in return
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
              <div className="text-2xl">🗣️</div>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">Honest feedback</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Tell me what&rsquo;s broken, what reads weird, what you wish worked differently.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
              <div className="text-2xl">📹</div>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">30-sec testimonial</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">At week 4, if it&rsquo;s working, a short video on what time it&rsquo;s saved you. Optional.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
              <div className="text-2xl">🤝</div>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">Word-of-mouth</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">If you like it, tell one colleague. That&rsquo;s how this grows.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-900 dark:to-slate-900 py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            Ready to try it?
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Reply with your specialty, clinic size, and city. I&rsquo;ll send a 15-minute call slot today.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="mailto:founder@odudoc.com?subject=Pilot%20programme%20-%20interested"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 hover:scale-105"
            >
              Email me about the pilot
            </a>
            <Link
              href="/for-doctors"
              className="text-sm font-semibold text-violet-700 hover:underline"
            >
              See the full feature list →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-400">
        OduDoc · founder@odudoc.com · Pilot enquiries only on this page.{" "}
        <Link href="/" className="text-violet-600 hover:underline">
          Main site
        </Link>
      </footer>
    </main>
  );
}
