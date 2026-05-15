import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Pharmacy on OduDoc · Partner with us",
  description:
    "List your retail or hospital pharmacy on OduDoc. Receive e-prescriptions from doctors in your city, fulfil online medicine orders, and stay anti-counterfeit compliant — all from one dashboard.",
  alternates: { canonical: "https://www.odudoc.com/pharmacy-partners" },
  openGraph: {
    title: "Your Pharmacy on OduDoc",
    description:
      "Receive e-prescriptions, take medicine orders, and stay anti-counterfeit compliant.",
    url: "https://www.odudoc.com/pharmacy-partners",
    type: "website",
  },
};

interface Benefit {
  icon: string;
  title: string;
  body: string;
  tone: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: "💊",
    title: "Direct e-prescriptions",
    body: "Doctors writing on OduDoc can route Rx straight to your counter. Patient walks in, you verify the QR, dispense in seconds.",
    tone: "from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 ring-emerald-200 dark:ring-emerald-800/60 text-emerald-700",
  },
  {
    icon: "🛵",
    title: "Online medicine orders",
    body: "Get listed in the OduDoc patient app. Accept prepaid + COD orders, manage your own slots, and track delivery riders.",
    tone: "from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 ring-sky-200 dark:ring-sky-800/60 text-sky-700",
  },
  {
    icon: "🛡️",
    title: "Anti-counterfeit registry",
    body: "Patients scan QRs printed on strips and OduDoc validates against the manufacturer registry. Become the trusted pharmacy in your area.",
    tone: "from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 ring-rose-200 dark:ring-rose-800/60 text-rose-700",
  },
  {
    icon: "📦",
    title: "FEFO inventory + batches",
    body: "Built-in batch lots, expiry alerts, low-stock reorder points, and movement audit. Replaces three spreadsheets and a notebook.",
    tone: "from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 ring-amber-200 dark:ring-amber-800/60 text-amber-700",
  },
  {
    icon: "🧾",
    title: "GST invoices & e-billing",
    body: "Every dispense generates a compliant invoice. Hospital pharmacies can post directly to AR; standalone shops can print or email it.",
    tone: "from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 ring-violet-200 dark:ring-violet-800/60 text-violet-700",
  },
  {
    icon: "🌐",
    title: "Mini-website + WhatsApp",
    body: "Free public profile page (your hours, address, photos), OTP-based login for repeat customers, and WhatsApp order links.",
    tone: "from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 ring-indigo-200 dark:ring-indigo-800/60 text-indigo-700",
  },
];

const STEPS = [
  { n: "1", title: "Register your pharmacy", body: "Drug license number, GSTIN, and a contact phone. Approval typically same-day." },
  { n: "2", title: "Confirm your inventory", body: "Bulk-import your SKUs from CSV or sync from your existing TallyPrime / Marg ERP." },
  { n: "3", title: "Go live", body: "Your pharmacy appears in the patient app the same evening. Doctors in your area can start routing prescriptions immediately." },
];

const FAQS = [
  {
    q: "How much does it cost?",
    a: "Listing is free. We charge a flat 4% take-rate on online order revenue and ₹0 on walk-in e-prescriptions. No setup, monthly, or hidden fees.",
  },
  {
    q: "What if I already use Marg or TallyPrime?",
    a: "We sync inventory both ways via the OduDoc Bridge agent. Your existing ERP stays the system of record; OduDoc just adds the patient-facing front door.",
  },
  {
    q: "Do you handle delivery?",
    a: "You can use your own riders, partner with a 3PL like Dunzo / Porter through OduDoc, or pick up only. Your choice — toggle per-store.",
  },
  {
    q: "Is this for hospital pharmacies too?",
    a: "Yes — hospital in-house pharmacies get the full ‘Pharmacy Dispense’ console: dispense against IPD orders, post to patient AR, FEFO batch picking, and BMW segregation. Free if you're already on a Hospital plan.",
  },
];

export default function PharmacyPartnersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-emerald-300/35 to-teal-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-primary-300/35 to-fuchsia-300/25 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Pharmacy partner program · India
              </div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl lg:text-6xl">
                Your pharmacy on{" "}
                <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-primary-600 bg-clip-text text-transparent">
                  OduDoc
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
                Receive doctor e-prescriptions in real time, fulfil online medicine orders, and stay anti-counterfeit compliant — from one beautiful dashboard. Free to list, 4% on online sales, ₹0 on walk-in Rx.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/auth/register?role=pharmacy"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  💊 List my pharmacy free
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/contact?topic=pharmacy"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md"
                >
                  Talk to partnerships
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> Same-day approval
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> No setup fee
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-emerald-600">✓</span> Cancel anytime
                </span>
              </div>
            </div>
            {/* Mock dashboard preview */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-emerald-200/50 to-primary-200/50 blur-2xl" />
              <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Today</p>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">₹ 84,210</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">↑ 18%</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: "E-Rx", v: "23", tone: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-900 text-emerald-700" },
                    { l: "Orders", v: "47", tone: "bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-900 dark:to-slate-900 text-sky-700" },
                    { l: "Walk-ins", v: "112", tone: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-900 text-amber-700" },
                  ].map((s) => (
                    <div key={s.l} className={`rounded-xl ${s.tone} p-3 ring-1 ring-slate-200 dark:ring-slate-800/60`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{s.l}</p>
                      <p className="mt-1 text-xl font-extrabold">{s.v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">⏱ New e-prescription · 2 min ago</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">Ready</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Dr. Sharma — Paracetamol 500 × 10</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Patient: Ananya R · Pickup · ₹ 42</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Everything in one console</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Built for the way pharmacies actually run
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            E-prescriptions, online orders, inventory, billing, and compliance — without juggling four apps and a WhatsApp group.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${b.tone} p-6 ring-1 transition-all hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className="mb-3 text-3xl">{b.icon}</div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{b.title}</h3>
              <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300/90">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gradient-to-b from-emerald-50/40 to-white dark:from-slate-900 dark:to-slate-950 py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">3 steps · 24 hours</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">From sign-up to first sale</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-primary-600 text-base font-extrabold text-white shadow-md">
                  {s.n}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">FAQs</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">Common questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-all hover:border-emerald-300 hover:shadow-sm">
              <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-slate-900 dark:text-slate-100">
                {f.q}
                <span className="text-emerald-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-primary-700 p-10 text-white shadow-2xl">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-extrabold sm:text-3xl">Ready to take your first e-prescription?</h3>
                <p className="mt-2 max-w-xl text-emerald-50/90">
                  Join 1,200+ pharmacies on OduDoc. Free to list. Cancel anytime.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/auth/register?role=pharmacy"
                  className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-emerald-700 shadow-md transition-transform hover:-translate-y-0.5"
                >
                  💊 List my pharmacy
                </Link>
                <Link
                  href="/for-doctors/guide"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  Read the doctor's guide
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
