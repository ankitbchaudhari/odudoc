import Link from "next/link";
import type { Metadata } from "next";
import EnterpriseCustomiser from "./EnterpriseCustomiser";
import { ServiceLd, BreadcrumbLd } from "@/components/StructuredData";

// Clinical/operational module catalog — mirrors the admin sidebar.
// Hospital tier ships all of these; Enterprise tier lets buyers
// cherry-pick which ones they want.
const CLINICAL_MODULE_GROUPS = [
  {
    label: "Core clinical",
    items: [
      { id: "patients", name: "Patients" },
      { id: "appointments", name: "Appointments" },
      { id: "encounters", name: "Encounters" },
      { id: "hospital-rx", name: "Hospital Rx" },
      { id: "medical-records", name: "Medical Records" },
      { id: "referrals", name: "Referrals" },
      { id: "consent-forms", name: "Consent Forms" },
      { id: "discharge-summaries", name: "Discharge Summaries" },
      { id: "allergies-problems", name: "Allergies & Problems" },
      { id: "immunizations", name: "Immunizations" },
      { id: "vitals-ews", name: "Vitals & EWS" },
    ],
  },
  {
    label: "Inpatient & surgical",
    items: [
      { id: "wards-beds", name: "Wards & Beds" },
      { id: "admissions-ipd", name: "Admissions (IPD)" },
      { id: "surgery-ot", name: "Surgery / OT" },
      { id: "pre-anesthesia", name: "Pre-Anesthesia" },
      { id: "icu", name: "ICU / Critical Care" },
      { id: "labor-delivery", name: "Labor & Delivery" },
      { id: "dialysis", name: "Dialysis" },
      { id: "wound-care", name: "Wound Care" },
      { id: "pain-management", name: "Pain Management" },
      { id: "physiotherapy", name: "Physiotherapy" },
      { id: "oncology", name: "Oncology & Chemo" },
      { id: "cardiology", name: "Cardiology" },
      { id: "endoscopy", name: "Endoscopy" },
    ],
  },
  {
    label: "Diagnostics & pharmacy",
    items: [
      { id: "lab-orders", name: "Lab Orders" },
      { id: "pathology", name: "Pathology" },
      { id: "radiology", name: "Radiology" },
      { id: "pharmacy-dispense", name: "Pharmacy Dispense" },
      { id: "pharmacy-inventory", name: "Pharmacy Inventory" },
      { id: "inventory", name: "Inventory" },
      { id: "blood-bank", name: "Blood Bank" },
    ],
  },
  {
    label: "Revenue & admin",
    items: [
      { id: "invoices", name: "Invoices" },
      { id: "insurance-tpa", name: "Insurance / TPA" },
      { id: "telemedicine", name: "Telemedicine" },
      { id: "opd-queue", name: "OPD Queue" },
      { id: "patient-feedback", name: "Patient Feedback" },
      { id: "visitors", name: "Visitors" },
      { id: "ai-voice", name: "AI Voice" },
    ],
  },
  {
    label: "Workforce",
    items: [
      { id: "medical-staff", name: "Medical Staff" },
      { id: "shift-roster", name: "Shift Roster" },
      { id: "staff-scheduling", name: "Staff Scheduling" },
      { id: "duty-handover", name: "Duty Handover" },
    ],
  },
  {
    label: "Facilities & compliance",
    items: [
      { id: "dietary-orders", name: "Dietary Orders" },
      { id: "cssd", name: "CSSD Sterilization" },
      { id: "biomedical", name: "Biomedical" },
      { id: "biomedical-waste", name: "Biomedical Waste" },
      { id: "housekeeping", name: "Housekeeping" },
      { id: "linen-laundry", name: "Linen & Laundry" },
      { id: "infection-control", name: "Infection Control" },
      { id: "incident-reports", name: "Incident Reports" },
      { id: "emergency-codes", name: "Emergency Codes" },
      { id: "ambulance-dispatch", name: "Ambulance Dispatch" },
      { id: "mortuary", name: "Mortuary" },
    ],
  },
  // Capabilities shipped in the recent batches — surface them here so
  // the corporate buyer sees the full surface area, not just the
  // legacy hospital module set.
  {
    label: "Brand & public surfaces",
    items: [
      { id: "org-branding", name: "Org Branding (logo + theme)" },
      { id: "mini-website", name: "Mini-Website at /c/<slug>" },
      { id: "org-vacancies", name: "Vacancies + jobs board" },
      { id: "watermarked-reports", name: "Watermarked Reports" },
    ],
  },
  {
    label: "Patient self-service",
    items: [
      { id: "care-plans", name: "Chronic-Condition Care Plans" },
      { id: "symptom-log", name: "Symptom Log" },
      { id: "vaccinations", name: "UIP Vaccination Tracker" },
      { id: "adherence", name: "Medication Adherence" },
      { id: "document-vault", name: "Document Vault" },
      { id: "health-timeline", name: "Health Timeline" },
      { id: "emergency-profile", name: "Emergency Profile" },
      { id: "audit-log", name: "Patient Audit Log" },
    ],
  },
  {
    label: "Hospital ops add-ons",
    items: [
      { id: "surgery-video", name: "Surgery Video (Cloudflare/Mux)" },
      { id: "biometric-emergency", name: "Biometric Emergency Unlock" },
      { id: "consumables-billing", name: "Consumables Auto-Billing" },
      { id: "vital-alerts", name: "Vital-Sign Alerts → Specialists" },
      { id: "triage-palette", name: "Triage Color Palette" },
      { id: "share-tokens", name: "Public Share-Link Tokens" },
    ],
  },
  {
    label: "AI metering & training",
    items: [
      { id: "ai-credit-pool", name: "AI Credit Pool (per-org)" },
      { id: "ai-pricing-override", name: "AI Pricing Override" },
      { id: "ml-training-queue", name: "ML Self-Learning Queue" },
    ],
  },
  {
    label: "Booking channels",
    items: [
      { id: "voice-booking-bot", name: "Voice IVR (Twilio/Exotel/Vonage)" },
      { id: "whatsapp-booking-bot", name: "WhatsApp + SMS Booking Bot" },
    ],
  },
  {
    label: "Pharma supply chain",
    items: [
      { id: "pharma-catalogue", name: "Drug Catalogue + Regulatory Papers" },
      { id: "pharma-partners", name: "Authorized Distributor Registry" },
      { id: "pharma-promo", name: "Detailing / Promo Slots" },
      { id: "anti-counterfeit", name: "Anti-Counterfeit Verification" },
    ],
  },
  {
    label: "Marketplace & education",
    items: [
      { id: "education-partner", name: "Education Partner Panel" },
      { id: "referral-commissions", name: "Referral Commission Engine" },
    ],
  },
  {
    label: "Compliance & tax",
    items: [
      { id: "country-tax", name: "19-Country Tax Engine" },
    ],
  },
];

const TOTAL_MODULES = CLINICAL_MODULE_GROUPS.reduce(
  (n, g) => n + g.items.length,
  0,
);

export const metadata: Metadata = {
  title: "OduDoc for Hospitals — ERP + EMR + Telemedicine + AI",
  description:
    "A modular healthcare ERP combining EMR, telemedicine, billing, pharmacy, lab, and AI — for hospitals, clinics, and diagnostic chains.",
  keywords: [
    "hospital ERP",
    "EMR software",
    "hospital information system",
    "healthcare AI",
    "clinic chain software",
    "diagnostic centre software",
  ],
  alternates: { canonical: "/corporate" },
  openGraph: {
    title: "OduDoc for Hospitals — ERP + EMR + Telemedicine + AI",
    description:
      "Modular healthcare platform — EMR, telemedicine, billing, pharmacy, lab, AI. Built for hospitals and clinic chains.",
    url: "/corporate",
    type: "website",
  },
};

const modules = [
  { icon: "🧑‍⚕️", title: "Patient Management", desc: "Longitudinal EMR, allergies, vitals, visit timeline." },
  { icon: "🛏️", title: "IPD / OPD Management", desc: "Bed map, admissions, transfers, discharge summaries." },
  { icon: "👩‍⚕️", title: "Medical Staff Management", desc: "Shifts, credentials, license expiry, payroll inputs." },
  { icon: "📋", title: "Quick Consultations", desc: "OPD queue, token numbers, consult notes in one click." },
  { icon: "🤖", title: "AI Prescription Assistant", desc: "Enter symptoms → ranked differential diagnoses → investigations and treatments." },
  { icon: "🎙️", title: "Voice Prescription", desc: "Dictate the prescription; AI structures patient, diagnosis, meds, and advice for review." },
  { icon: "🧠", title: "AI Symptom Triage", desc: "Patients describe concerns; platform routes them to the right specialty." },
  { icon: "🧪", title: "Lab Management", desc: "Order → sample → result → signed report PDF." },
  { icon: "💊", title: "Pharmacy", desc: "Batch & expiry tracking, prescription-linked dispensing." },
  { icon: "🧾", title: "Billing & Accounting", desc: "Invoices, insurance claims, GST, ledger, P&L." },
  { icon: "📦", title: "Inventory Management", desc: "Reorder points, suppliers, PO workflow, stock audits." },
  { icon: "🔪", title: "Surgery / OT", desc: "OT calendar, surgical team, consumables log, pre/post-op." },
  { icon: "🩻", title: "Radiology & DICOM", desc: "Integrated DICOM viewer, report sign-off, PACS hooks." },
  { icon: "📹", title: "Telemedicine", desc: "Video consults, e-prescriptions, follow-up scheduling." },
];

// Clinical AI showcase — the features that actually save doctor time
// on a busy OPD day. Each card maps to a real, shipped module in the
// platform (/dashboard/doctor/ai-prescription, /voice-prescription,
// etc.).
const clinicalAi = [
  {
    icon: "🤖",
    eyebrow: "AI Prescription Assistant",
    title: "From symptoms to a drafted prescription in seconds.",
    desc: "Doctor enters age, sex, symptoms, allergies and history. AI returns up to 5 ranked differential diagnoses with confidence, rationale, and red-flag warnings. Pick a diagnosis — AI drafts investigations, first-line medications with dose/frequency/duration, advice, and follow-up. All editable; nothing is auto-prescribed.",
    bullets: [
      "Evidence-based differential with confidence levels",
      "First-line drug suggestions with dose, frequency, duration",
      "Red-flag alerts for urgent referral",
      "Doctor reviews and signs every line",
    ],
  },
  {
    icon: "🎙️",
    eyebrow: "Voice Prescription",
    title: "Speak naturally. We fill the fields.",
    desc: "Doctor taps the mic and dictates in English, Hindi, Gujarati, Marathi, or Tamil. Browser-native transcription captures the conversation; AI extracts patient details, symptoms, diagnosis, medications (with dose/frequency/duration), tests, advice, and follow-up into an editable draft. Cuts 3-4 minutes off every OPD consult.",
    bullets: [
      "Multilingual: English / Hindi / Gujarati / Marathi / Tamil",
      "Structured output matches the prescription template",
      "Flags anything it couldn't parse for manual review",
      "Works on any modern browser — no app install",
    ],
  },
  {
    icon: "🧠",
    eyebrow: "AI Symptom Triage",
    title: "Patients reach the right specialist, first time.",
    desc: "On the patient portal, a conversational AI assistant collects complaints, ranks likely specialties, and suggests the right department before booking. Reduces mis-triaged OPD slots and front-desk rerouting — especially valuable for large multi-speciality hospitals.",
    bullets: [
      "Routes patients to the correct department",
      "Supports red-flag escalation to ER",
      "Trained to refuse diagnosis — it only suggests the right doctor",
      "Available on web, WhatsApp, and kiosk modes",
    ],
  },
];

const plans = [
  {
    name: "Clinic",
    price: "$149",
    unit: "/ month",
    blurb: "Single-location clinic, up to 10 staff.",
    features: [
      "Patients + EMR",
      "Appointments + OPD Queue",
      "Hospital Rx + e-Prescriptions",
      "Invoices + Billing",
      "Inventory + Pharmacy Dispense",
      "Telemedicine",
      "Patient Feedback",
      "Email support",
    ],
    cta: "Start free 14-day trial",
    ctaHref: "/contact",
  },
  {
    name: "Hospital",
    price: "$749",
    unit: "/ month",
    blurb: "Multi-department hospital up to 100 beds.",
    features: [
      "Everything in Clinic",
      `All ${TOTAL_MODULES} clinical modules`,
      "IPD · OT · ICU · Labor & Delivery",
      "Lab · Pathology · Radiology · Blood Bank",
      "Pharmacy, CSSD, Biomedical & Waste",
      "Ambulance, Infection Control, Mortuary",
      "Medical Staff, Shift Roster, Duty Handover",
      "AI Voice + AI Symptom Triage",
      "Priority phone support",
    ],
    cta: "Request pricing",
    ctaHref: "/contact",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    unit: "",
    blurb: "100+ beds, multi-branch, or diagnostic chain.",
    features: [
      "Pick any modules you need",
      "Everything in Hospital, plus:",
      "HL7 / FHIR integrations",
      "DICOM viewer + PACS bridge",
      "Dedicated infra + 99.99% SLA",
      "Single-tenant deployment option",
      "On-site training + implementation",
    ],
    cta: "Customise & request quote",
    ctaHref: "#customise",
  },
];

const differentiators = [
  { icon: "🧩", title: "Modular, not monolithic", desc: "Buy only the modules you need. Turn others on later without re-platforming." },
  { icon: "🛡️", title: "Compliance-ready", desc: "Audit logs on every record, role-based access, HIPAA/GDPR/DPDP aligned." },
  { icon: "⚡", title: "Modern stack", desc: "Built on Next.js + Postgres. Deployed on Vercel. Fast, reliable, browser-native." },
  { icon: "🤝", title: "No lock-in", desc: "Your data, exportable any time. HL7/FHIR and CSV exports built-in." },
];

const trustStats = [
  { value: "100+", label: "Integrated modules" },
  { value: "19", label: "Country tax rules" },
  { value: "11", label: "UI languages" },
  { value: "HIPAA / GDPR / DPDP", label: "Compliance" },
];

// Cross-cutting capabilities — apply to every org type. Shown as a
// dedicated band below the module catalogue so corporate buyers see
// the platform's "plumbing" alongside the per-module list.
const PLATFORM_CAPABILITIES = [
  { icon: "🔒", title: "Audit + watermarking", desc: "Every view of a sensitive record (lab, Rx, surgery video, invoice) logged with actor + IP + UA. Print/view UIs overlay patient ID + viewer IP + timestamp." },
  { icon: "👁", title: "Biometric emergency unlock", desc: "WebAuthn fingerprint + face capture (browser-native, no USB SDK). HMAC hashes only. Consent-gated, audit-logged on every lookup." },
  { icon: "🎥", title: "Live surgery video", desc: "Cloudflare Stream + Mux providers. RTMPS encoder ingest, signed HLS playback, expiring share-links for family / external observers." },
  { icon: "📞", title: "Voice + WhatsApp + SMS booking", desc: "Twilio, Exotel, Vonage providers. Multi-turn IVR + WhatsApp Business intake walks patients through book / refill / reschedule / human handoff." },
  { icon: "🤖", title: "Metered AI", desc: "DDx, scribe, OCR, triage, image analysis, voice transcript, Rx safety, summarize. Per-call rupee metering with auto-topup + per-org pricing override." },
  { icon: "🧬", title: "ML self-learning", desc: "Doctor edits to AI output queue as training samples — opt-in, PII-scrubbed, GDPR/DPDP right-to-erasure built in." },
  { icon: "💊", title: "Anti-counterfeit", desc: "Pharma registers drug + batch + regulatory papers; doctor / pharmacist scans → instant verdict. Public verify endpoint at /verify-medicine." },
  { icon: "💰", title: "19-country tax engine", desc: "India GST split (CGST/SGST/IGST), UK/EU/GCC VAT, US sales tax. Healthcare-services-exempt where the law allows." },
  { icon: "🌐", title: "Multi-region health-IDs", desc: "ABHA (India), NHS (UK), NPI (US). Records port across providers via the shared identity layer." },
  { icon: "🏥", title: "Multi-tenant org hierarchy", desc: "Hospital / clinic / lab / pharmacy / pharma / insurer / education partner — same platform, role-scoped views, shared registry." },
  { icon: "🎨", title: "Org branding cascade", desc: "Upload logo + theme + footer once. Cascades onto invoice PDFs, prescription pads, mini-site at /c/<slug>, and the white-label sub-app." },
  { icon: "🌍", title: "11-language UI", desc: "English, Hindi, Tamil, Telugu, Marathi, Spanish, Mandarin, French, German, Portuguese, Arabic (RTL), Russian, Swahili, Hausa, Amharic." },
];

export default function CorporatePage() {
  return (
    <>
      <ServiceLd
        name="OduDoc for Hospitals — Hospital ERP"
        description="Hospital and clinic-chain ERP: EMR, telemedicine, billing, pharmacy, lab, HR, and AI."
        url="/corporate"
        serviceType="Hospital information system"
      />
      <BreadcrumbLd
        items={[
          { name: "Home", url: "/" },
          { name: "For Hospitals", url: "/corporate" },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />

        {/* Persistent corner sign-in pill. Visible the moment the
            page loads so existing-customer admins don't have to
            hunt through the hero for the login affordance. */}
        <div className="relative mx-auto flex max-w-7xl justify-end px-4 pt-6 sm:px-6 lg:px-8">
          <Link
            href="/corporate/login"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Corporate sign-in
          </Link>
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              For Hospitals · Clinics · HR Benefits
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
              The AI hospital OS that replaces{" "}
              <span className="bg-gradient-to-r from-teal-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                six disconnected tools
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Patient records, OPD/IPD, pharmacy, lab, billing, telemedicine + a full AI EMR — unified
              and modular. Ambient scribe, drug-interaction safety, ICD-10 auto-coding, differential Dx,
              FHIR/HL7 export. What Abridge charges $400/doctor for, included by default.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="rounded-full bg-white/10 px-2.5 py-1 backdrop-blur">🎤 Ambient scribe</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 backdrop-blur">🧠 Differential Dx</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 backdrop-blur">💊 Drug safety</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 backdrop-blur">📋 ICD-10 codes</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 backdrop-blur">📖 Medical dictionary</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 backdrop-blur">🌏 22 Indian languages</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 backdrop-blur">🔓 FHIR/HL7 export</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition-transform hover:scale-[1.02]"
              >
                Request a demo
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="#clinical-ai"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                See clinical AI
              </Link>
              {/* Tertiary CTA — existing-customer sign-in. Different
                  visual weight than the demo CTA so we don't dilute
                  the primary lead-capture goal, but still discoverable
                  for orgs that have already onboarded. */}
              <Link
                href="/corporate/login"
                className="inline-flex items-center gap-2 rounded-xl border border-teal-300/40 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 px-6 py-3 text-sm font-semibold text-teal-100 backdrop-blur-sm transition-colors hover:from-teal-500/30 hover:to-cyan-500/30"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Hospital admin sign-in
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              For hospital admins, doctors, nurses, billing & lab employees.{" "}
              <Link href="/corporate/login" className="font-semibold text-teal-300 hover:text-teal-200 hover:underline">
                Sign in to your admin console
              </Link>{" "}
              · New hospital?{" "}
              <Link href="/contact" className="font-semibold text-teal-300 hover:text-teal-200 hover:underline">
                Talk to sales
              </Link>
            </p>
            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {trustStats.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-extrabold">{s.value}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: module constellation */}
          <div className="relative hidden lg:block">
            <div className="relative mx-auto h-[460px] w-[460px]">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/5 to-white/0 blur-2xl" />
              <div className="absolute left-1/2 top-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-400 to-indigo-500 text-lg font-bold shadow-2xl">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-white/70">Core</p>
                  <p className="mt-1 text-2xl font-extrabold">OduDoc</p>
                  <p className="text-xs text-white/70">Hospital OS</p>
                </div>
              </div>
              {modules.slice(0, 8).map((m, i) => {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                const r = 180;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                return (
                  <div
                    key={m.title}
                    className="absolute flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl ring-1 ring-white/20 backdrop-blur-sm"
                    style={{
                      left: `calc(50% + ${x}px - 28px)`,
                      top: `calc(50% + ${y}px - 28px)`,
                    }}
                    title={m.title}
                  >
                    {m.icon}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {differentiators.map((d) => (
              <div key={d.title} className="rounded-2xl border border-gray-100 p-6 shadow-sm">
                <span className="mb-3 block text-3xl">{d.icon}</span>
                <h3 className="text-lg font-bold text-gray-900">{d.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules grid */}
      <section id="modules" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
              The platform
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              One system. Every module your hospital runs on.
            </h2>
            <p className="mt-3 text-gray-500">
              Turn modules on per branch, per department — pay only for what you use.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <div
                key={m.title}
                className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-teal-50 text-2xl">
                  {m.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{m.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clinical AI showcase */}
      <section id="clinical-ai" className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-teal-50 py-20">
        <div className="pointer-events-none absolute -right-10 top-20 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-20 h-64 w-64 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-teal-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
              Clinical AI — shipped and live
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              AI that actually saves doctors time.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-500">
              Three features, built on medical-grade LLMs, designed to fit the way
              OPDs actually run — anywhere in the world. Every output is advisory — the
              doctor signs off on every line.
            </p>
          </div>

          <div className="mt-14 space-y-6">
            {clinicalAi.map((f, i) => (
              <div
                key={f.eyebrow}
                className={`grid grid-cols-1 gap-8 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:grid-cols-[auto_1fr_auto] md:items-center md:p-10 ${
                  i % 2 === 1 ? "md:bg-gradient-to-br md:from-white md:to-indigo-50/40" : ""
                }`}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 text-4xl shadow-lg">
                  {f.icon}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    {f.eyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-extrabold text-gray-900 sm:text-2xl">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {f.desc}
                  </p>
                </div>
                <ul className="space-y-2 border-t border-gray-100 pt-4 md:max-w-xs md:border-l md:border-t-0 md:pl-8 md:pt-0">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-indigo-700"
            >
              See the AI demo live
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <p className="text-xs text-gray-500">
              Available on Hospital and Enterprise plans. Doctors keep full
              editorial control — AI never writes a signed prescription.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-3 text-gray-500">Start with a 14-day trial. No credit card required.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border p-8 shadow-sm transition-transform hover:-translate-y-1 ${
                  p.highlight
                    ? "border-indigo-500 bg-gradient-to-br from-indigo-50 to-white ring-2 ring-indigo-500"
                    : "border-gray-100 bg-white"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{p.blurb}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">{p.price}</span>
                  <span className="text-sm text-gray-500">{p.unit}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.ctaHref}
                  className={`mt-8 block w-full rounded-xl px-4 py-3 text-center text-sm font-bold transition-colors ${
                    p.highlight
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "border border-gray-300 text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise module customiser */}
      <section id="customise" className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
              Enterprise plan
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Build your own module stack
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-500">
              The Hospital tier ships all {TOTAL_MODULES} clinical modules by default. Enterprise
              buyers instead pick exactly what they want — we price against your selection and
              add any custom integrations you need.
            </p>
          </div>
          <div className="mt-10">
            <EnterpriseCustomiser groups={CLINICAL_MODULE_GROUPS} />
          </div>
        </div>
      </section>

      {/* Platform capabilities — cross-cutting "plumbing" that applies
          to every module above. Shown as a band below the customiser
          so a corporate buyer sees the full picture: per-module
          flexibility AND the cross-cutting infrastructure they get
          regardless of which modules they pick. */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-emerald-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
              🛠 Platform plumbing
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Cross-cutting capabilities every module inherits
            </h2>
            <p className="mt-3 text-slate-600">
              Audit logs, watermarking, biometric unlock, voice + WhatsApp booking, metered AI, anti-counterfeit
              verification, country-aware tax — these aren&apos;t per-module add-ons. They&apos;re platform-wide
              infrastructure that applies to whatever modules you pick.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_CAPABILITIES.map((c) => (
              <article key={c.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <p className="text-base font-bold text-slate-900">{c.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{c.desc}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/features" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30">
              See the full feature catalogue
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Security & compliance */}
      <section className="bg-slate-900 py-20 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Built for hospitals that can&apos;t afford downtime.</h2>
            <p className="mt-4 text-slate-300">
              Every patient record is audit-logged. Role-based access for 10+ clinical roles.
              Daily encrypted backups with point-in-time restore. On request, we deploy in your
              cloud account with a signed BAA.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Audit logs", value: "Every read + write" },
              { label: "Encryption", value: "TLS 1.3 + AES-256 at rest" },
              { label: "Backups", value: "Hourly PITR" },
              { label: "Roles", value: "10+ clinical presets" },
              { label: "Exports", value: "HL7 / FHIR / CSV" },
              { label: "Hosting", value: "EU / US / IN regions" },
            ].map((b) => (
              <div key={b.label} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wider text-slate-400">{b.label}</p>
                <p className="mt-1 text-sm font-semibold">{b.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
