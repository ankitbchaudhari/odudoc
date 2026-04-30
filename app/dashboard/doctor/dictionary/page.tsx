"use client";

// Doctor-facing AI medical dictionary. Search any clinical term, drug,
// abbreviation — Gemini-backed, no static catalog. Replaces the
// "300k terms + 200k Indian drugs" pitch other Indian apps make with
// "infinite — and it actually understands what you're asking for".

import { useEffect, useRef, useState } from "react";

interface TermLookup {
  term: string;
  pronunciation?: string;
  shortDefinition: string;
  patientSummary: string;
  category?: string;
  icd10?: string[];
  relatedTerms?: string[];
  needsReview: boolean;
  confidence: number;
}

interface DrugLookup {
  generic: string;
  drugClass: string;
  commonIndianBrands: string[];
  indications: string[];
  contraindications: string[];
  commonAdultDose: string;
  pediatricNote?: string;
  commonSideEffects: string[];
  pregnancyCategory?: string;
  schedule?: string;
  prescriberNotes?: string;
  needsReview: boolean;
  confidence: number;
}

type Mode = "term" | "drug";

const SAMPLE_QUERIES: Record<Mode, string[]> = {
  term: [
    "diabetic ketoacidosis",
    "PCOS",
    "PEFR",
    "Tinel's sign",
    "essential tremor",
    "HbA1c",
  ],
  drug: [
    "Metformin",
    "Glycomet",
    "Augmentin",
    "Pantoprazole",
    "Sertraline",
    "Telmisartan",
  ],
};

function ConfidencePill({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  let cls = "bg-slate-100 text-slate-600";
  if (value >= 0.85) cls = "bg-emerald-100 text-emerald-800";
  else if (value >= 0.6) cls = "bg-sky-100 text-sky-800";
  else if (value >= 0.3) cls = "bg-amber-100 text-amber-800";
  else cls = "bg-rose-100 text-rose-800";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{pct}% confidence</span>;
}

export default function DictionaryPage() {
  const [mode, setMode] = useState<Mode>("term");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState<TermLookup | null>(null);
  const [drug, setDrug] = useState<DrugLookup | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  async function search(q?: string) {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    setLoading(true);
    setError(null);
    setTerm(null);
    setDrug(null);
    try {
      const res = await fetch(`/api/ai/dictionary/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (mode === "term") setTerm(data.result);
      else setDrug(data.result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Medical Dictionary</h1>
        <p className="mt-1 text-sm text-slate-500">
          AI-backed lookup for any clinical term, abbreviation, or drug — including Indian brand names. Decision support only; verify against your formulary before prescribing.
        </p>
      </div>

      {/* Mode switch */}
      <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => setMode("term")}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${mode === "term" ? "bg-violet-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"}`}
        >
          Clinical term
        </button>
        <button
          onClick={() => setMode("drug")}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${mode === "drug" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"}`}
        >
          Drug
        </button>
      </div>

      {/* Search bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex items-center gap-2"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            mode === "term"
              ? "e.g. diabetic ketoacidosis · PCOS · Tinel's sign"
              : "e.g. Metformin · Glycomet · Augmentin"
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-60"
        >
          {loading ? "Looking up…" : "Search"}
        </button>
      </form>

      {/* Sample queries — discoverability for first-time users */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="text-[11px] font-semibold text-slate-500">Try:</span>
        {SAMPLE_QUERIES[mode].map((q) => (
          <button
            key={q}
            onClick={() => {
              setQuery(q);
              search(q);
            }}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 hover:border-violet-400 hover:text-violet-700"
          >
            {q}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Term result */}
      {term && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
          <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{term.term}</h2>
                {term.pronunciation && (
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    /{term.pronunciation}/
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <ConfidencePill value={term.confidence} />
                {term.category && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                    {term.category}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-4 px-5 py-4 text-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700">Clinical definition</p>
              <p className="mt-1 text-slate-800">{term.shortDefinition}</p>
            </div>
            {term.patientSummary && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Patient-facing summary</p>
                <p className="mt-1 text-slate-700">{term.patientSummary}</p>
              </div>
            )}
            {(term.icd10?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Candidate ICD-10 codes</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {term.icd10!.map((c) => (
                    <span key={c} className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(term.relatedTerms?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Related</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {term.relatedTerms!.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setQuery(r);
                        search(r);
                      }}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 hover:border-violet-400 hover:text-violet-700"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {term.needsReview && (
              <p className="rounded-md bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
                ⚠ Verify against your reference of choice — query was ambiguous or low-confidence.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Drug result */}
      {drug && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{drug.generic}</h2>
                {drug.drugClass && (
                  <p className="mt-0.5 text-xs text-slate-600">{drug.drugClass}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <ConfidencePill value={drug.confidence} />
                {drug.schedule && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                    {drug.schedule}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-4 px-5 py-4 text-sm md:grid-cols-2">
            {drug.commonIndianBrands.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Common Indian brands</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {drug.commonIndianBrands.map((b) => (
                    <span key={b} className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Common adult dose</p>
              <p className="mt-1 font-mono text-sm text-slate-800">{drug.commonAdultDose}</p>
              {drug.pediatricNote && (
                <p className="mt-1 text-[11px] text-slate-500">Paediatric: {drug.pediatricNote}</p>
              )}
            </div>
            {drug.pregnancyCategory && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Pregnancy</p>
                <p className="mt-1 text-slate-800">{drug.pregnancyCategory}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Indications</p>
              <ul className="mt-1 space-y-0.5">
                {drug.indications.map((i) => (
                  <li key={i} className="flex gap-1.5 text-slate-800"><span className="text-emerald-500">•</span><span>{i}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Contraindications</p>
              <ul className="mt-1 space-y-0.5">
                {drug.contraindications.length === 0 && (
                  <li className="text-slate-400">None recorded.</li>
                )}
                {drug.contraindications.map((i) => (
                  <li key={i} className="flex gap-1.5 text-slate-800"><span className="text-rose-500">•</span><span>{i}</span></li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Common side effects</p>
              <p className="mt-1 text-slate-800">
                {drug.commonSideEffects.length === 0 ? "None typically reported." : drug.commonSideEffects.join(" · ")}
              </p>
            </div>
            {drug.prescriberNotes && (
              <div className="md:col-span-2 rounded-lg bg-indigo-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Prescribing pearls</p>
                <p className="mt-1 text-slate-800">{drug.prescriberNotes}</p>
              </div>
            )}
            {drug.needsReview && (
              <p className="md:col-span-2 rounded-md bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
                ⚠ Verify against your formulary — query needed correction or was low-confidence.
              </p>
            )}
          </div>
        </div>
      )}

      {!loading && !term && !drug && !error && (
        <p className="mt-12 text-center text-sm text-slate-400">
          Type any clinical term or drug name above. Indian brand names work too.
        </p>
      )}
    </div>
  );
}
