"use client";

// ICD-10 auto-coder picker.
//
// Shows ranked code suggestions as the doctor types a diagnosis. Click
// a suggestion to call onPick. Also takes an array (multi-line
// diagnoses textarea) via the onChangeLines path.

import { useEffect, useState } from "react";

interface Suggestion {
  code: string; title: string; chapter: string;
  score: number; matchedKeywords: string[];
}

interface Props {
  query?: string;
  lines?: string[];
  onPick?: (s: Suggestion) => void;
  limit?: number;
}

const CHAPTER_COLORS: Record<string, string> = {
  Endocrine: "bg-purple-100 text-purple-800",
  Circulatory: "bg-rose-100 text-rose-800",
  Respiratory: "bg-sky-100 text-sky-800",
  Digestive: "bg-amber-100 text-amber-800",
  Genitourinary: "bg-yellow-100 text-yellow-800",
  Infectious: "bg-emerald-100 text-emerald-800",
  Neurological: "bg-indigo-100 text-indigo-800",
  Psychiatric: "bg-pink-100 text-pink-800",
  Musculoskeletal: "bg-orange-100 text-orange-800",
  Skin: "bg-lime-100 text-lime-800",
  Symptoms: "bg-slate-100 text-slate-700",
};

export default function Icd10Picker({ query, lines, onPick, limit = 8 }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const useLines = Array.isArray(lines) && lines.some((l) => l.trim().length > 1);
    const useQuery = typeof query === "string" && query.trim().length > 1;
    if (!useLines && !useQuery) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/clinical/icd10", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: useQuery ? query : undefined, lines: useLines ? lines : undefined, limit }),
        });
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled) setSuggestions(data.suggestions || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, JSON.stringify(lines), limit]);

  if (suggestions.length === 0) {
    return query && query.length > 1 && !loading ? (
      <p className="text-xs text-slate-400">No matching ICD-10 codes. Try different wording.</p>
    ) : null;
  }

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Suggested ICD-10 codes</p>
      <ul className="space-y-1">
        {suggestions.map((s) => (
          <li key={s.code}>
            <button
              onClick={() => onPick?.(s)}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-indigo-400 hover:bg-indigo-50"
            >
              <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">{s.code}</span>
              <span className="flex-1 text-slate-800">{s.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CHAPTER_COLORS[s.chapter] || "bg-slate-100"}`}>{s.chapter}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
