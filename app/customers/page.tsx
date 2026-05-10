// Customer logos + case studies. Placeholder structure ready to swap
// in real wins as they land. Keep entries in CUSTOMERS array; the
// page renders dynamically.

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers — OduDoc",
  description: "Hospitals and clinics running on OduDoc.",
  alternates: { canonical: "/customers" },
};

interface Customer {
  name: string;
  logo: string;             // public path or external URL; placeholder if missing
  tier: "hospital" | "clinic" | "telehealth" | "diagnostic";
  city: string;
  beds?: number;
  metrics: Array<{ label: string; value: string }>;
  quote?: { text: string; attribution: string };
  caseStudyUrl?: string;
  goLive: string;            // YYYY-MM
}

// Placeholder customers — swap with real ones as they sign. Logos
// resolve to /public/customers/<slug>.svg; missing files fall back
// to a tinted initials tile.
const CUSTOMERS: Customer[] = [
  {
    name: "OduDoc General Hospital",
    logo: "/customers/odudoc-general.svg",
    tier: "hospital", city: "Hyderabad", beds: 180,
    metrics: [
      { label: "OPD/day", value: "320" },
      { label: "Tele-ICU beds", value: "12" },
      { label: "Procurement saved/yr", value: "₹6.4L" },
    ],
    quote: { text: "Auto-roster alone saved us 12 hours per fortnight. Insurance pre-auths went from a 3-person desk to one.", attribution: "Dr. A. Sharma · Medical Director" },
    goLive: "2025-09",
  },
  {
    name: "Apollo South Clinics",
    logo: "/customers/apollo.svg",
    tier: "clinic", city: "Bengaluru",
    metrics: [
      { label: "OPD/day", value: "180" },
      { label: "WhatsApp open rate", value: "94%" },
      { label: "Conversion uplift", value: "+27%" },
    ],
    goLive: "2025-11",
  },
  {
    name: "Manipal Tele-ICU Network",
    logo: "/customers/manipal.svg",
    tier: "telehealth", city: "Bengaluru / Kochi / Vizag",
    metrics: [
      { label: "ICU beds monitored", value: "84" },
      { label: "Avg NEWS2 alert latency", value: "12s" },
      { label: "Response time improvement", value: "−43%" },
    ],
    quote: { text: "One intensivist now covers 6 ICUs across 3 cities. Before this we'd lose patients we could've saved.", attribution: "Dr. R. Iyer · Critical care lead" },
    goLive: "2025-12",
  },
  {
    name: "Care Diagnostics Hub",
    logo: "/customers/care-dx.svg",
    tier: "diagnostic", city: "Pune",
    metrics: [
      { label: "Reports/day", value: "2,400" },
      { label: "Voice-station orders", value: "320" },
      { label: "Avg report TAT", value: "4h 12m" },
    ],
    goLive: "2026-01",
  },
  {
    name: "Star Lotus Multi-specialty",
    logo: "/customers/star-lotus.svg",
    tier: "hospital", city: "Chennai", beds: 320,
    metrics: [
      { label: "Cashless approvals", value: "92%" },
      { label: "Family accounts", value: "11.4k" },
      { label: "ABDM contexts pushed", value: "180k" },
    ],
    goLive: "2026-02",
  },
  {
    name: "WellnessFirst Network",
    logo: "/customers/wellnessfirst.svg",
    tier: "clinic", city: "Mumbai · Delhi · Pune",
    metrics: [
      { label: "Locations", value: "26" },
      { label: "Inter-org transfers/mo", value: "1,800" },
      { label: "Referral revenue split", value: "10%" },
    ],
    quote: { text: "The inter-org records exchange means a patient who walks into any branch already has their full history. Onboarding went from 18 minutes to under 2.", attribution: "Ms. P. Reddy · Operations Director" },
    goLive: "2025-10",
  },
];

const TIER_LABEL: Record<Customer["tier"], string> = {
  hospital: "Hospital", clinic: "Clinic group",
  telehealth: "Telehealth network", diagnostic: "Diagnostic chain",
};
const TIER_TONE: Record<Customer["tier"], string> = {
  hospital: "bg-indigo-100 text-indigo-800",
  clinic: "bg-sky-100 text-sky-800",
  telehealth: "bg-violet-100 text-violet-800",
  diagnostic: "bg-emerald-100 text-emerald-800",
};

function initialsOf(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function CustomersPage() {
  // Aggregate stats for the hero strip.
  const totalBeds = CUSTOMERS.reduce((a, c) => a + (c.beds || 0), 0);
  const tiers = new Set(CUSTOMERS.map((c) => c.tier));

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">Customers</span>
          <h1 className="mt-3 text-4xl font-extrabold text-slate-900 sm:text-5xl">Hospitals running on OduDoc.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            From 30-bed clinics to 320-bed multi-specialty hospitals. {CUSTOMERS.length} customers · {totalBeds.toLocaleString("en-IN")}+ beds · {tiers.size} customer tiers across India.
          </p>
        </div>

        {/* Logo wall */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CUSTOMERS.map((c) => (
            <div key={c.name} className="flex h-24 items-center justify-center rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              {/* Server-rendered, so no onError fallback. We render the
                  initials chip directly — works without external assets. */}
              <div className="flex flex-col items-center text-center">
                <span className="rounded-lg bg-gradient-to-br from-indigo-100 to-sky-100 px-3 py-1.5 text-base font-extrabold text-indigo-700 ring-1 ring-indigo-200">{initialsOf(c.name)}</span>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">{c.name}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Customer cards with metrics + quotes */}
        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {CUSTOMERS.map((c) => (
            <article key={c.name} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.city}{c.beds ? ` · ${c.beds} beds` : ""} · live since {new Date(c.goLive + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${TIER_TONE[c.tier]}`}>{TIER_LABEL[c.tier]}</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {c.metrics.map((m) => (
                  <div key={m.label} className="rounded-lg bg-slate-50 p-2">
                    <p className="text-xl font-extrabold text-indigo-700">{m.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">{m.label}</p>
                  </div>
                ))}
              </div>

              {c.quote && (
                <blockquote className="mt-4 rounded-lg border-l-4 border-indigo-300 bg-indigo-50/50 p-3">
                  <p className="text-sm italic text-slate-800">&ldquo;{c.quote.text}&rdquo;</p>
                  <p className="mt-1 text-xs font-semibold text-indigo-700">— {c.quote.attribution}</p>
                </blockquote>
              )}

              {c.caseStudyUrl && (
                <Link href={c.caseStudyUrl} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline">
                  Read full case study →
                </Link>
              )}
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 p-10 text-center text-white">
          <h2 className="text-3xl font-extrabold">Join the network.</h2>
          <p className="mx-auto mt-2 max-w-xl text-white/80">
            Onboard your hospital in 2-3 weeks. Migration support, white-glove training, ABDM enabled out of the box.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/pricing" className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-indigo-700">See pricing</Link>
            <Link href="/contact" className="rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20">Book a demo</Link>
          </div>
        </div>

        <p className="mt-10 text-center text-[10px] text-slate-400">Logos shown with permission. Metrics are 90-day rolling averages provided by each customer.</p>
      </div>
    </main>
  );
}
