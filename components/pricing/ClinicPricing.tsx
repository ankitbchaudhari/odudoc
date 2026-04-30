// Clinic / doctor pricing — three tiers (Free, Practice, Enterprise)
// shown side-by-side on /pricing under the "For clinics & doctors" tab.
//
// Pricing here is the public-facing rate card. Free is a real free
// tier (50 patients/month cap); Practice unlocks the cap to 250 +
// extra staff seats for a flat $50/mo; Enterprise is "talk to us"
// for hospitals.

import Link from "next/link";

interface Tier {
  id: "free" | "practice" | "enterprise";
  name: string;
  priceUsd: number | "custom";
  blurb: string;
  cta: { label: string; href: string };
  /** When true the column is highlighted as recommended. */
  popular?: boolean;
  features: Array<{ text: string; included: boolean; emphasise?: boolean }>;
  /** Footnote shown under the price. */
  footnote?: string;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    priceUsd: 0,
    blurb: "For solo doctors getting started. Real product — no credit card.",
    footnote: "30% commission per paid consultation",
    cta: { label: "Sign up free →", href: "/for-doctors/register" },
    features: [
      { text: "Unlimited video consultations", included: true },
      { text: "Up to 50 EMR patients per month", included: true },
      { text: "1 doctor + 1 staff seat", included: true },
      { text: "AI patient summary on chart open", included: true, emphasise: true },
      { text: "AI prescription assistant", included: true, emphasise: true },
      { text: "AI drug-interaction safety net", included: true, emphasise: true },
      { text: "AI ICD-10 auto-coder", included: true, emphasise: true },
      { text: "AI differential diagnosis", included: true, emphasise: true },
      { text: "AI pre-visit intake briefing", included: true, emphasise: true },
      { text: "AI post-visit Q&A for patients", included: true, emphasise: true },
      { text: "Voice dictation in 90+ languages", included: true },
      { text: "FHIR R4 + HL7 v2.5.1 export", included: true },
      { text: "Stripe Connect weekly payouts", included: true },
      { text: "Ambient AI scribe", included: false },
      { text: "Unlimited patients + staff seats", included: false },
      { text: "Custom domain + branding", included: false },
    ],
  },
  {
    id: "practice",
    name: "Practice",
    priceUsd: 50,
    blurb: "For clinics scaling past 50 patients/month. Everything in Free + ambient scribe + bigger limits.",
    footnote: "Per clinic, per month — flat. Still no per-consult subscription.",
    popular: true,
    cta: { label: "Start 14-day trial →", href: "/for-doctors/register?tier=practice" },
    features: [
      { text: "Unlimited video consultations", included: true },
      { text: "Up to 250 EMR patients per month", included: true },
      { text: "3 doctors + 3 staff seats", included: true },
      { text: "Everything in Free, plus:", included: true, emphasise: true },
      { text: "🎤 Ambient AI scribe (12 Indian languages)", included: true, emphasise: true },
      { text: "🧠 AI ambient + scribe long-recording mode", included: true, emphasise: true },
      { text: "📊 Per-doctor AI usage dashboard", included: true },
      { text: "📋 Per-clinic audit log + DPDP compliance trail", included: true },
      { text: "📞 Priority email + WhatsApp support", included: true },
      { text: "🏷 Branded prescription templates", included: true },
      { text: "Custom domain + branding", included: false },
      { text: "Dedicated success manager", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceUsd: "custom",
    blurb: "Hospitals, multi-clinic chains, corporate health benefits. Everything in Practice + your branding + procurement support.",
    footnote: "Annual contract · usage-based with caps",
    cta: { label: "Talk to enterprise →", href: "/contact?topic=enterprise" },
    features: [
      { text: "Everything in Practice, plus:", included: true, emphasise: true },
      { text: "Unlimited patients + doctors + staff", included: true },
      { text: "Custom domain (clinic.yourbrand.com)", included: true },
      { text: "Your colours, logo, prescription header", included: true },
      { text: "Dedicated success manager", included: true },
      { text: "SSO (Okta, Google Workspace, Azure AD)", included: true },
      { text: "Group billing + employee usage analytics", included: true },
      { text: "ABDM HPR/HFR/HIE-CM live integration", included: true },
      { text: "Multi-region data residency", included: true },
      { text: "Custom SLA, audit support, BAA", included: true },
      { text: "Procurement-friendly invoicing (NET-30/60)", included: true },
      { text: "On-prem / VPC deployment available", included: true },
    ],
  },
];

function formatPrice(p: Tier["priceUsd"]): string {
  if (p === "custom") return "Custom";
  if (p === 0) return "$0";
  return `$${p}`;
}

export default function ClinicPricing() {
  return (
    <section className="bg-gradient-to-br from-slate-50 via-white to-violet-50/40 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white p-7 shadow-sm transition-all hover:shadow-xl ${
                t.popular
                  ? "border-violet-500 ring-2 ring-violet-500/30 shadow-lg lg:scale-[1.03]"
                  : "border-slate-200"
              }`}
            >
              {t.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
                    Most popular
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-slate-900">{t.name}</h3>
                <p className="mt-1 min-h-[40px] text-sm text-slate-500">{t.blurb}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">
                    {formatPrice(t.priceUsd)}
                  </span>
                  {typeof t.priceUsd === "number" && t.priceUsd > 0 && (
                    <span className="text-sm text-slate-500">/clinic/mo</span>
                  )}
                </div>
                {t.footnote && (
                  <p className="mt-1 text-[11px] text-slate-500">{t.footnote}</p>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <svg className={`mt-0.5 h-4 w-4 shrink-0 ${f.emphasise ? "text-violet-600" : "text-emerald-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`${f.included ? (f.emphasise ? "font-semibold text-slate-900" : "text-slate-700") : "text-slate-400"}`}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={t.cta.href}
                className={`mt-6 block w-full rounded-xl px-5 py-3 text-center text-sm font-semibold transition-all ${
                  t.popular
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30 hover:scale-[1.02]"
                    : "border-2 border-slate-200 text-slate-800 hover:border-violet-400 hover:bg-violet-50"
                }`}
              >
                {t.cta.label}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-violet-200 bg-violet-50/50 p-5 text-center">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-violet-800">Cost reality check:</span>{" "}
            US ambient-scribe vendors charge $300-500 per doctor per month for what we ship by default. A 5-doctor clinic on our Practice tier ($50 flat) saves $1,400-2,400/month vs Abridge or Nuance DAX.
          </p>
        </div>
      </div>
    </section>
  );
}
