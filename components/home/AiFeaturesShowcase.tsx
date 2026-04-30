// AI features showcase — the homepage section that explains why
// OduDoc is different. Every other Indian clinic-management app sells
// "online appointments + digital prescriptions". OduDoc has those AND
// a full Gemini-powered AI EMR layer that no Indian competitor we've
// seen advertises. This block puts that front and centre so visitors
// understand the differentiator without reading the docs.

import Link from "next/link";

interface Feature {
  title: string;
  body: string;
  audience: "doctor" | "patient" | "both";
  /** Inline SVG path for the icon — keeps the page lightweight (no
   *  per-feature image asset needed). */
  icon: string;
  accent: string; // tailwind colour class
}

const FEATURES: Feature[] = [
  {
    title: "Ambient AI scribe",
    body: "Records the consultation, transcribes it, and writes the SOAP note for you. Works in 12 Indian languages plus Hinglish. Doctors save 15 minutes per visit.",
    audience: "doctor",
    accent: "violet",
    icon: "M19 11a7 7 0 11-14 0m7 7v4m0 0H8m4 0h4m-7-9V5a3 3 0 016 0v8a3 3 0 11-6 0z",
  },
  {
    title: "Patient summary on chart open",
    body: "When a doctor opens a patient's chart, AI gives them a 30-second briefing — active conditions, recent findings, red flags, what to focus on today. Each fact cited to a specific visit.",
    audience: "doctor",
    accent: "indigo",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    title: "AI prescription assistant",
    body: "Type symptoms and a working diagnosis — get a starter plan with first-line medicines, dosing, and tests. Doctor reviews and one-click sends.",
    audience: "doctor",
    accent: "emerald",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    title: "Drug interaction safety net",
    body: "Every prescription is checked in real-time against the patient's allergies, chronic conditions, and other meds. Severe interactions block sending.",
    audience: "doctor",
    accent: "rose",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  {
    title: "ICD-10 + differential diagnosis",
    body: "AI suggests billing codes from your SOAP note and a ranked differential when assessment is ambiguous. Faster billing, fewer missed Dx.",
    audience: "doctor",
    accent: "fuchsia",
    icon: "M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    title: "Pre-visit intake",
    body: "Patient submits their history at booking; AI structures it for the doctor. Walks into the call already knowing the chief complaint, red flags, and questions to ask.",
    audience: "both",
    accent: "cyan",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    title: "Post-visit Q&A for patients",
    body: "After the consultation, patients can ask follow-ups (\"what was the dose?\", \"can I take it with food?\") and get answers grounded in their own prescription, 24/7.",
    audience: "patient",
    accent: "sky",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    title: "Medical dictionary + Indian drug catalog",
    body: "Look up any clinical term, abbreviation, or drug — generic or Indian brand. Returns dosing, contraindications, pregnancy category, Indian D&CR schedule, and ICD-10 codes. Infinite coverage; not a static 300k-term catalog.",
    audience: "doctor",
    accent: "indigo",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  {
    title: "Prescriptions in 22 Indian + 60 global languages",
    body: "Generate or translate any prescription into the patient's preferred language — Hindi, Tamil, Marathi, Bengali, Gujarati, Punjabi, all 22 Schedule-8 official languages plus 60 global. Drug names always stay in Latin script for pharmacy safety.",
    audience: "both",
    accent: "rose",
    icon: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129",
  },
  {
    title: "FHIR / HL7 export",
    body: "One-click export of any patient record in international standard formats. Zero platform lock-in — switch tools whenever you want, your data stays yours.",
    audience: "both",
    accent: "amber",
    icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
  },
];

const ACCENT_BG: Record<string, string> = {
  violet: "from-violet-500 to-indigo-500 shadow-violet-500/30",
  indigo: "from-indigo-500 to-blue-500 shadow-indigo-500/30",
  emerald: "from-emerald-500 to-teal-500 shadow-emerald-500/30",
  rose: "from-rose-500 to-pink-500 shadow-rose-500/30",
  fuchsia: "from-fuchsia-500 to-purple-500 shadow-fuchsia-500/30",
  cyan: "from-cyan-500 to-sky-500 shadow-cyan-500/30",
  sky: "from-sky-500 to-blue-500 shadow-sky-500/30",
  amber: "from-amber-500 to-orange-500 shadow-amber-500/30",
};

const AUDIENCE_LABEL: Record<Feature["audience"], { label: string; cls: string }> = {
  doctor: { label: "For doctors", cls: "bg-emerald-100 text-emerald-800" },
  patient: { label: "For patients", cls: "bg-sky-100 text-sky-800" },
  both: { label: "For everyone", cls: "bg-violet-100 text-violet-800" },
};

export default function AiFeaturesShowcase() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-violet-50/40 via-white to-indigo-50/30 py-20">
      <div className="pointer-events-none absolute -right-32 top-32 h-96 w-96 rounded-full bg-gradient-to-br from-violet-200/30 to-indigo-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-10 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-200/30 to-sky-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-100 to-indigo-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-700">
            ✨ AI-powered EMR
          </span>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 md:text-5xl">
            The first telemedicine platform with{" "}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              every AI feature
            </span>{" "}
            built in
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 md:text-lg">
            Other apps charge $400/month per doctor for what we ship by default. Ambient scribe, drug-interaction
            safety, ICD-10 coding, differential diagnosis — all included, all running on Google Gemini.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const aud = AUDIENCE_LABEL[f.audience];
            return (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${ACCENT_BG[f.accent]}`}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                    </svg>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${aud.cls}`}>
                    {aud.label}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/for-doctors"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-105"
          >
            See how doctors use it
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link
            href="/corporate"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-violet-200 bg-white px-6 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            For corporate health teams →
          </Link>
        </div>
      </div>
    </section>
  );
}
