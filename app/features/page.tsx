// Public feature catalogue.
//
// One page that surfaces everything OduDoc does, organized by
// audience (Patient / Doctor / Hospital / Lab + Diagnostic / Pharmacy
// / Pharma / Insurer / Education). Each capability links to either
// the live surface (signed-in users) or a relevant marketing page.
//
// Indexed by SEO — generateMetadata sets a title + description that
// names the major modules so the page ranks for queries like
// "telemedicine + ABHA + cashless + voice scribe + lab marketplace".

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "All features — OduDoc · One-stop healthcare ecosystem",
  description:
    "Telemedicine, ABHA-linked records, voice AI scribe, cashless insurance, lab + diagnostic marketplace, pharmacy fulfilment, pharma anti-counterfeit, hospital ops, surgery video, biometric emergency unlock, multi-language, GST-aware billing — for patients, doctors, hospitals, labs, pharmacies, insurers, and education partners.",
  alternates: { canonical: "/features" },
};

interface FeatureGroup {
  audience: string;
  emoji: string;
  blurb: string;
  features: Array<{
    title: string;
    body: string;
    href?: string;
    tag?: "AI" | "Live" | "Beta" | "Privacy" | "Compliance";
  }>;
}

const GROUPS: FeatureGroup[] = [
  {
    audience: "Patients",
    emoji: "🧑‍⚕️",
    blurb: "Everything from booking to discharge in one app.",
    features: [
      { title: "Verified specialist consults", body: "Telemedicine + in-person, 22 specialties × 18 cities. Verified credentials.", href: "/doctors" },
      { title: "AI symptom triage", body: "Pre-visit chatbot routes you to the right urgency band — ER / today / 3 days / routine.", href: "/dashboard", tag: "AI" },
      { title: "Health timeline", body: "Appointments, prescriptions, labs, vitals, wallet — every event in one chronological feed.", href: "/dashboard/timeline" },
      { title: "Vital signs log", body: "BP, glucose, weight, SpO2, HR with sparkline trends. Critical readings auto-alert your care team.", href: "/dashboard/vitals" },
      { title: "Today's medications", body: "Dose schedule from your active prescriptions. Refill reminders fire 3 days before you run out.", href: "/dashboard/adherence" },
      { title: "Symptom log", body: "Track migraine days, IBS flares, joint pain with 0–10 severity. Surface patterns to your doctor.", href: "/dashboard/symptoms" },
      { title: "Care plans", body: "Chronic-condition targets — diabetes, hypertension, asthma, post-MI. 30-day compliance %.", href: "/dashboard/care-plan" },
      { title: "Vaccination tracker", body: "Indian UIP schedule for kids + adult catch-up + travel. Per-family-member records.", href: "/dashboard/vaccinations" },
      { title: "Document vault", body: "Prescriptions, lab reports, imaging, insurance — watermarked viewer, every view audit-logged.", href: "/dashboard/documents", tag: "Privacy" },
      { title: "Emergency profile", body: "Blood group, allergies, current Rx, NOK — what a hospital reads if you arrive unconscious.", href: "/dashboard/emergency-profile", tag: "Compliance" },
      { title: "OduDoc Wallet", body: "Top up once, pay across consults / pharmacy / labs. 5% bonus on every top-up.", href: "/dashboard/wallet" },
      { title: "ABHA / ABDM linkage", body: "National health-ID linked records, interoperable with any ABDM-onboarded provider.", href: "/dashboard/abha" },
      { title: "Cashless insurance", body: "Track preauths, decisions land on your bell within hours. Cashless if your hospital is empanelled.", href: "/dashboard/insurance" },
      { title: "Family + carer access", body: "Manage parents' / kids' care from one login. Each profile fully isolated.", href: "/dashboard/family" },
      { title: "Surgery video access", body: "Watch consented OT recordings with watermarked playback. Share via expiring link.", href: "/dashboard/surgery-video", tag: "Privacy" },
      { title: "Audit log", body: "See exactly who accessed your records, when, from what IP. Flag anything you didn't authorize.", href: "/dashboard/audit", tag: "Privacy" },
      { title: "11-language UI", body: "English, Hindi, Tamil, Telugu, Marathi, Spanish, Mandarin, French, German, Portuguese, Arabic, Russian, Swahili, Hausa, Amharic." },
    ],
  },
  {
    audience: "Doctors",
    emoji: "👨‍⚕️",
    blurb: "Faster consults, less paperwork, AI you control.",
    features: [
      { title: "Voice AI scribe", body: "Listen to the consult; structured note + Rx auto-drafted. Brand + generic both shown side-by-side.", tag: "AI" },
      { title: "Differential diagnosis assist", body: "Symptom-based DDx ranked by prevalence + red flags. Doctor approves, never auto-prescribes.", tag: "AI" },
      { title: "Rx safety check", body: "Drug interactions, contraindications, dose ceilings before you e-sign.", tag: "AI" },
      { title: "Self-service profile", body: "Fees, slots, photo, services, qualifications — edit live, changes show on the public page in seconds.", href: "/dashboard/doctor/profile" },
      { title: "Doctor analytics", body: "Earnings (70/30 split), conversion %, rating trend, week-over-week, top complaint buckets.", href: "/dashboard/doctor" },
      { title: "Multi-specialist routing", body: "Hospital admissions list multiple assigned doctors; vital alerts fan out to the whole care team." },
      { title: "Anti-counterfeit verification", body: "One scan: brand + batch + reseller → verified / warning / counterfeit risk verdict.", href: "/verify-medicine", tag: "Compliance" },
      { title: "Pharma drug catalogue", body: "Verify a sales rep's claim against the pharma's own registry before prescribing." },
      { title: "AI credit pool", body: "Per-call rupee metering, auto-topup rule, per-org pricing override. You see exactly what AI costs.", tag: "AI" },
      { title: "Referral commissions", body: "Pharmacy / lab / insurance kickback rules with idempotent ledger. Configure rate per scope." },
    ],
  },
  {
    audience: "Hospitals + Clinics",
    emoji: "🏥",
    blurb: "From front-desk to OT to billing, one platform.",
    features: [
      { title: "Wards + beds + admissions", body: "GPS-pinned admit/discharge timestamps, multi-specialist assignment, transfer history." },
      { title: "ICU + ward boards", body: "Triage palette (red/yellow/blue/green/gray) on every bed. Vital alerts auto-route to the assigned specialist.", tag: "Live" },
      { title: "Live surgery video", body: "Cloudflare Stream / Mux ingest, RTMPS encoder, signed HLS playback, share-link generator with TTL.", tag: "Live" },
      { title: "Reception duty roster", body: "Assign doctors / nurses to wards + beds. Notifications fire when newly assigned." },
      { title: "Consumables auto-billing", body: "Mask, gloves, IV set, ECG pad — staff log usage per admission, billing rolls them onto discharge invoice." },
      { title: "OPD / IPD / OT modules", body: "30+ clinical modules: ICU, dialysis, oncology, NICU, blood bank, pharmacy dispense, etc." },
      { title: "Cashless preauth", body: "Submit + track decisions, automatic patient notification on approve/reject/query." },
      { title: "Voice IVR booking bot", body: "Twilio / Exotel / Vonage — patients call your number, bot books / reschedules / refills." },
      { title: "WhatsApp + SMS booking", body: "Multi-turn conversation: BOOK → specialty → date → confirm. Handoff to human on request." },
      { title: "Branded everything", body: "Upload light + dark logo + favicon + theme + invoice footer. Renders on receipts, Rx pads, mini-site, patient files.", href: "/admin/branding" },
      { title: "GST-aware billing", body: "19-country tax engine. India splits CGST/SGST/IGST. Services-exempt for licensed practitioners.", tag: "Compliance" },
      { title: "Watermarked reports", body: "View-only + print-only. Every page carries patient ID + viewer IP + timestamp on a diagonal overlay.", tag: "Privacy" },
      { title: "Public mini-website", body: "Hero / about / services / team / gallery / contact. Cross-links to your jobs + courses automatically.", href: "/admin/website" },
      { title: "Job + internship board", body: "Post vacancies; appears on the cross-org /jobs feed.", href: "/jobs" },
      { title: "Audit log", body: "Every view, print, download, share, modify — actor + IP + UA + reason captured.", tag: "Compliance" },
    ],
  },
  {
    audience: "Labs + Diagnostic Centers",
    emoji: "🧪",
    blurb: "Marketplace + ops, one stack.",
    features: [
      { title: "Lab marketplace", body: "Auto-match orders by coverage, price, NABL, reporting hours, pincode.", href: "/admin/lab-ops" },
      { title: "7-state order lifecycle", body: "placed → confirmed → sample_collected → in_lab → reported → closed. Each transition pushes patient notification.", tag: "Live" },
      { title: "Slide + biopsy uploads", body: "Pathology slides + radiology images attached to the patient's report. Watermarked viewer.", tag: "Privacy" },
      { title: "Per-test pricing override", body: "Bulk pricing by panel, NABL bonus, marketplace fee defaulted to 7%." },
    ],
  },
  {
    audience: "Pharmacies",
    emoji: "💊",
    blurb: "Fulfillment, inventory, anti-counterfeit.",
    features: [
      { title: "Fulfilment lifecycle", body: "placed → accepted → packed → out_for_delivery → delivered. Each state pushes patient notification.", tag: "Live" },
      { title: "Stock + expiry tracking", body: "Per-SKU inventory, expiry alerts, decrement on dispense.", href: "/admin/pharmacy-inventory" },
      { title: "Counterfeit verification", body: "Verify any brand + batch + reseller combo against the pharma's own registry.", href: "/verify-medicine", tag: "Compliance" },
      { title: "Anti-counterfeit kiosk", body: "Camera barcode scan → instant verdict. Works on Chrome native or USB barcode scanner.", href: "/admin/anti-counterfeit-kiosk" },
      { title: "Pharmacy dispense console", body: "Verify Rx, dispense, capture payment. Multi-vendor support.", href: "/admin/dispensing" },
    ],
  },
  {
    audience: "Pharma Companies",
    emoji: "🏭",
    blurb: "Anti-counterfeit + supply chain + detailing.",
    features: [
      { title: "Drug catalogue", body: "Brand + generic + composition + form + schedule class + manufacturer license. Per-batch entries.", href: "/admin/pharma/drugs" },
      { title: "Regulatory papers", body: "Upload DCGI/CDSCO approval + batch lab report + packaging photo. Doctors verify before prescribing.", tag: "Compliance" },
      { title: "Authorized partner registry", body: "Distributor + retailer + stockist + agent roster with full address + lat/lng + valid-until. Doctors verify.", href: "/admin/pharma/partners" },
      { title: "Promo + detailing slots", body: "Targeted by doctor specialty + city. CPC billing, impression + click tracking.", href: "/admin/pharma/promo" },
      { title: "Combined verification API", body: "One call: brand + batch + reseller → verified / warning / counterfeit_risk. Public — no signup needed.", href: "/verify-medicine" },
    ],
  },
  {
    audience: "Insurance + TPA",
    emoji: "🛡️",
    blurb: "Cashless preauth + claims + commission.",
    features: [
      { title: "Cashless preauth flow", body: "Submit → TPA decides → patient notification with approved amount in the title." },
      { title: "Policy + procedure tariff", body: "Per-plan coverage estimates, room caps, sub-limits, waiting periods, intra-state vs inter-state." },
      { title: "Empanelment registry", body: "TPA + insurer + hospital network. Cross-link with patient's policy at booking." },
      { title: "Policy-sale commission", body: "Configurable rules (% of premium / flat ₹), idempotent ledger, settle / reverse." },
    ],
  },
  {
    audience: "Education Partners",
    emoji: "🎓",
    blurb: "Courses + placement + 1:1 training.",
    features: [
      { title: "Course catalogue", body: "7 levels × 5 modes including 1:1 online for private clinic training. Direct enrollment or partner-website redirect.", href: "/education" },
      { title: "Student placement", body: "Submitted → in_review → matched → placed. Match against open vacancies on the same platform." },
      { title: "Mini-website", body: "Public landing at /c/<slug> with hero, faculty, courses, gallery. Themed by your branding.", href: "/admin/website" },
    ],
  },
];

const HORIZONTAL = [
  { title: "Audit + watermarking", body: "Every view of a sensitive record (lab report, Rx, surgery video, invoice) is logged with actor + IP + UA. Print/view UIs overlay the patient ID + viewer IP + timestamp." },
  { title: "Biometric emergency unlock", body: "WebAuthn fingerprint + face capture (browser-native, no USB SDK). HMAC hashes only — never raw biometric. Consent-gated, audit-logged on every lookup." },
  { title: "ML self-learning queue", body: "Doctors who edit AI output can opt-in to contribute the (input, output, ground-truth) tuple to a training queue. PII-scrubbed before persistence. GDPR/DPDP right-to-erasure." },
  { title: "Org branding cascade", body: "Upload one set of logos + theme. Cascades across patient dashboards, billing PDFs, prescription pads, mini-website, and the white-label sub-app." },
  { title: "11-language UI", body: "Patient-facing surfaces translate via useLanguage(). RTL flip auto-handles Arabic." },
  { title: "Country tax engine", body: "19 countries: India GST split (CGST/SGST/IGST), UK/EU/GCC VAT, US sales tax. Healthcare-services exempt where applicable." },
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {/* Hero */}
        <header className="mb-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-700">The OduDoc platform</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight text-slate-900 sm:text-6xl">
            One stack for the<br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
              entire healthcare ecosystem
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">
            Patients book + track care. Doctors consult + prescribe with AI assist. Hospitals run wards, OT, and billing.
            Labs, pharmacies, pharma, insurers, education partners plug into the same registry.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/auth/register" className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-transform hover:-translate-y-0.5">
              Get started — free for patients
            </Link>
            <Link href="/corporate" className="rounded-xl border-2 border-indigo-200 bg-white px-6 py-3 text-sm font-bold text-indigo-700">
              For hospitals + corporates
            </Link>
            <Link href="/verify-medicine" className="rounded-xl bg-emerald-50 px-6 py-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
              Verify a medicine →
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat n="8" label="audiences" />
            <Stat n="80+" label="capabilities" />
            <Stat n="19" label="country tax rules" />
            <Stat n="11" label="languages" />
          </div>
        </header>

        {/* Audience tabs (anchors) */}
        <nav className="mb-10 flex flex-wrap justify-center gap-2 sticky top-2 z-10 bg-white/80 p-2 rounded-full shadow-sm ring-1 ring-slate-200 backdrop-blur">
          {GROUPS.map((g) => (
            <a
              key={g.audience}
              href={`#${g.audience.toLowerCase().replace(/\s+/g, "-")}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-indigo-50 hover:ring-indigo-300"
            >
              <span>{g.emoji}</span>{g.audience}
            </a>
          ))}
        </nav>

        {/* Per-audience sections */}
        <div className="space-y-16">
          {GROUPS.map((g) => (
            <section key={g.audience} id={g.audience.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-24">
              <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">{g.emoji} For {g.audience}</p>
                  <h2 className="mt-1 text-3xl font-extrabold text-slate-900 sm:text-4xl">{g.audience}</h2>
                  <p className="mt-1 text-sm text-slate-600">{g.blurb}</p>
                </div>
                <p className="text-xs text-slate-500">{g.features.length} features</p>
              </header>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.features.map((f) => (
                  <FeatureCard key={f.title} feature={f} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Horizontal capabilities */}
        <section className="mt-16 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-8 text-white shadow-2xl sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-300">Cross-cutting</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Plumbing every audience benefits from</h2>
          <p className="mt-2 max-w-3xl text-white/80">
            These work across surfaces — every patient, doctor, and admin gets them automatically.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HORIZONTAL.map((h) => (
              <div key={h.title} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur">
                <p className="text-base font-bold text-white">{h.title}</p>
                <p className="mt-1.5 text-xs text-white/70">{h.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-white shadow-xl sm:p-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-extrabold sm:text-4xl">Try it in 60 seconds</h2>
              <p className="mt-2 max-w-xl text-white/90">
                Sign up as a patient (free). Or contact us to onboard a hospital, lab, pharmacy, pharma company, insurer, or education partner.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/auth/register" className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-md">
                Patient signup
              </Link>
              <Link href="/corporate" className="rounded-xl border-2 border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur">
                Org onboarding →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-3xl font-extrabold text-slate-900">{n}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}

function FeatureCard({ feature }: { feature: FeatureGroup["features"][number] }) {
  const tagClass: Record<string, string> = {
    AI: "bg-purple-100 text-purple-800",
    Live: "bg-rose-100 text-rose-800",
    Beta: "bg-amber-100 text-amber-800",
    Privacy: "bg-emerald-100 text-emerald-800",
    Compliance: "bg-sky-100 text-sky-800",
  };
  const inner = (
    <article className="group h-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-300">
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-bold text-slate-900">{feature.title}</p>
        {feature.tag && (
          <span className={`flex-none rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tagClass[feature.tag] || "bg-slate-100 text-slate-700"}`}>
            {feature.tag}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-slate-600">{feature.body}</p>
      {feature.href && (
        <p className="mt-3 text-xs font-semibold text-indigo-600 group-hover:underline">Open →</p>
      )}
    </article>
  );
  return feature.href ? <Link href={feature.href}>{inner}</Link> : inner;
}
