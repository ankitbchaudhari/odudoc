// Feature-by-feature comparison vs the closest Indian-market alternatives.
// Designed to be aggressive but defensible — every cell is something
// you can show in a demo, and every competitor cell reflects what's
// publicly advertised on their site as of April 2026. Update if a
// competitor catches up.
//
// Visual: rows = features, columns = vendors, cells = ✓ / ✗ / "$" badge.

interface Vendor {
  name: string;
  /** Tagline shown under the name. */
  tagline: string;
  /** When true, the column is highlighted (us). */
  highlight?: boolean;
}

interface RowCell {
  /** "yes" — included; "no" — not advertised; "paid" — advertised
   *  but as a paid add-on; "manual" — manual workflow only. */
  state: "yes" | "no" | "paid" | "manual";
  /** Optional inline note shown under the icon. */
  note?: string;
}

interface Row {
  feature: string;
  cells: RowCell[]; // index-aligned with VENDORS
}

const VENDORS: Vendor[] = [
  { name: "OduDoc", tagline: "AI EMR · India + Global", highlight: true },
  { name: "Abridge", tagline: "AI scribe · US-first" },
  { name: "eka.doc", tagline: "OPD + EMR · India" },
  { name: "Practo", tagline: "Booking + EMR · India" },
];

const ROWS: Row[] = [
  {
    feature: "Online appointment booking",
    cells: [{ state: "yes" }, { state: "no" }, { state: "yes" }, { state: "yes" }],
  },
  {
    feature: "Digital EMR (patients, visits, files)",
    cells: [{ state: "yes" }, { state: "no" }, { state: "yes" }, { state: "yes" }],
  },
  {
    feature: "Digital prescriptions + templates",
    cells: [{ state: "yes", note: "15 templates" }, { state: "no" }, { state: "yes" }, { state: "yes" }],
  },
  {
    feature: "Video consultations",
    cells: [{ state: "yes" }, { state: "no" }, { state: "yes" }, { state: "yes" }],
  },
  {
    feature: "AI patient summary on chart open",
    cells: [{ state: "yes" }, { state: "yes" }, { state: "no" }, { state: "no" }],
  },
  {
    feature: "Ambient AI scribe (audio → SOAP)",
    cells: [
      { state: "yes", note: "Free" },
      { state: "paid", note: "$400/mo/dr" },
      { state: "no" },
      { state: "no" },
    ],
  },
  {
    feature: "Drug-interaction safety net",
    cells: [{ state: "yes" }, { state: "no" }, { state: "no" }, { state: "manual" }],
  },
  {
    feature: "AI ICD-10 / billing code suggester",
    cells: [{ state: "yes" }, { state: "yes" }, { state: "no" }, { state: "no" }],
  },
  {
    feature: "AI differential diagnosis",
    cells: [{ state: "yes" }, { state: "no" }, { state: "no" }, { state: "no" }],
  },
  {
    feature: "Pre-visit AI intake (history → briefing)",
    cells: [{ state: "yes" }, { state: "no" }, { state: "no" }, { state: "no" }],
  },
  {
    feature: "Post-visit Q&A chatbot for patients",
    cells: [{ state: "yes" }, { state: "no" }, { state: "no" }, { state: "no" }],
  },
  {
    feature: "12 Indian languages (scribe + dictation)",
    cells: [{ state: "yes" }, { state: "no" }, { state: "manual" }, { state: "manual" }],
  },
  {
    feature: "FHIR R4 + HL7 v2.5.1 export",
    cells: [{ state: "yes" }, { state: "no" }, { state: "no" }, { state: "paid" }],
  },
  {
    feature: "ABDM-ready (HPR / HFR / ABHA)",
    cells: [{ state: "yes", note: "Phase 1" }, { state: "no" }, { state: "no" }, { state: "yes" }],
  },
  {
    feature: "Stripe Connect doctor payouts",
    cells: [{ state: "yes" }, { state: "no" }, { state: "no" }, { state: "no" }],
  },
  {
    feature: "Zero monthly fee for doctors",
    cells: [
      { state: "yes", note: "30% per consult" },
      { state: "paid" },
      { state: "paid" },
      { state: "paid" },
    ],
  },
];

function Cell({ cell, highlight }: { cell: RowCell; highlight?: boolean }) {
  const base = `flex h-full flex-col items-center justify-center gap-1 px-2 py-3 text-center ${
    highlight ? "bg-violet-50/60" : ""
  }`;
  if (cell.state === "yes") {
    return (
      <div className={base}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        {cell.note && <span className="text-[10px] font-medium text-emerald-700">{cell.note}</span>}
      </div>
    );
  }
  if (cell.state === "paid") {
    return (
      <div className={base}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <span className="text-xs font-bold">$</span>
        </span>
        {cell.note && <span className="text-[10px] font-medium text-amber-700">{cell.note}</span>}
        {!cell.note && <span className="text-[10px] font-medium text-amber-700">Paid add-on</span>}
      </div>
    );
  }
  if (cell.state === "manual") {
    return (
      <div className={base}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </span>
        <span className="text-[10px] font-medium text-slate-500">Manual</span>
      </div>
    );
  }
  return (
    <div className={base}>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    </div>
  );
}

export default function ComparisonMatrix() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-700">
            Feature comparison
          </span>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 md:text-5xl">
            Why doctors switch to{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              OduDoc
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600">
            Every claim below is something we&rsquo;ll demo live. Cells reflect publicly-advertised features as of April 2026.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Header */}
            <div
              className="grid border-b border-slate-200 bg-slate-50"
              style={{ gridTemplateColumns: `2fr repeat(${VENDORS.length}, 1fr)` }}
            >
              <div className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                Feature
              </div>
              {VENDORS.map((v) => (
                <div
                  key={v.name}
                  className={`border-l border-slate-100 px-3 py-4 text-center ${v.highlight ? "bg-violet-100/60" : ""}`}
                >
                  <p className={`text-sm font-bold ${v.highlight ? "text-violet-800" : "text-slate-800"}`}>
                    {v.name}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{v.tagline}</p>
                </div>
              ))}
            </div>

            {/* Rows */}
            {ROWS.map((row, ri) => (
              <div
                key={row.feature}
                className={`grid border-b border-slate-100 ${ri % 2 === 1 ? "bg-slate-50/30" : ""}`}
                style={{ gridTemplateColumns: `2fr repeat(${VENDORS.length}, 1fr)` }}
              >
                <div className="flex items-center px-5 py-3 text-sm text-slate-800">
                  {row.feature}
                </div>
                {row.cells.map((c, ci) => (
                  <div
                    key={ci}
                    className="border-l border-slate-100"
                  >
                    <Cell cell={c} highlight={VENDORS[ci].highlight} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Comparison based on competitor public marketing &amp; pricing pages.
          Have a correction? Email{" "}
          <a href="mailto:hello@odudoc.com" className="text-violet-600 hover:underline">
            hello@odudoc.com
          </a>{" "}
          and we&rsquo;ll fix it.
        </p>
      </div>
    </section>
  );
}
