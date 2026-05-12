"use client";

// Inline drug-interaction alert. Lives next to the medicines table inside
// DoctorNotesPanel and the EMR visit form. Fires a debounced /api/ai/drug-
// check call whenever the medicines list changes, then renders a coloured
// banner if anything is flagged. Quiet when severity is "none".

import { useEffect, useRef, useState } from "react";
import type { MedicineRow } from "@/lib/ai-prescription";

interface DrugIssue {
  title: string;
  drugs: string[];
  detail: string;
}

type Severity = "none" | "minor" | "moderate" | "severe";

interface CheckResult {
  severity: Severity;
  issues: DrugIssue[];
  alternatives: string[];
  generatedAt: string;
}

interface Props {
  medicines: MedicineRow[];
  allergies?: string;
  chronicConditions?: string;
  age?: string;
  sex?: string;
  /** Optional className applied to the wrapper div. */
  className?: string;
}

const STYLE: Record<Exclude<Severity, "none">, { bg: string; border: string; text: string; label: string; icon: string }> = {
  minor: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-900",
    label: "Heads up",
    icon: "ℹ",
  },
  moderate: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-900",
    label: "Review before prescribing",
    icon: "⚠",
  },
  severe: {
    bg: "bg-rose-50",
    border: "border-rose-300",
    text: "text-rose-900",
    label: "Stop — clinical concern",
    icon: "⛔",
  },
};

function fingerprintMeds(meds: MedicineRow[]): string {
  return meds
    .filter((m) => m.name?.trim())
    .map((m) => `${m.name}|${m.dose || ""}|${m.frequency || ""}|${m.duration || ""}`)
    .join(";");
}

export default function DrugInteractionAlert({
  medicines,
  allergies,
  chronicConditions,
  age,
  sex,
  className = "",
}: Props) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFp = useRef<string>("");
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fp = fingerprintMeds(medicines);
    // Skip if nothing meaningful changed (avoids re-checks on irrelevant
    // re-renders) and skip empty lists (no AI call worth making).
    if (!fp) {
      setResult(null);
      lastFp.current = "";
      return;
    }
    if (fp === lastFp.current) return;
    lastFp.current = fp;

    if (timer.current) clearTimeout(timer.current);
    // 1.2s debounce — long enough that typing a drug name doesn't fire
    // 10 calls, short enough that the warning appears before the
    // doctor moves on.
    timer.current = setTimeout(() => {
      runCheck();
    }, 1200);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicines, allergies, chronicConditions, age, sex]);

  async function runCheck() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/drug-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicines,
          allergies,
          chronicConditions,
          age,
          sex,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setResult(data.result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Hidden when no medicines or "none" severity — we don't want a green
  // "looks fine" banner cluttering the form on every visit.
  if (!result || result.severity === "none") {
    if (loading && medicines.some((m) => m.name?.trim())) {
      return (
        <div className={`flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Running drug-safety check…
        </div>
      );
    }
    if (error) {
      return (
        <div className={`rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
          Drug-safety check unavailable: {error}
        </div>
      );
    }
    return null;
  }

  const style = STYLE[result.severity as keyof typeof STYLE];
  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4 ${className}`}>
      <div className="flex items-start gap-2">
        <span className="text-base leading-none">{style.icon}</span>
        <div className="flex-1">
          <p className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>
            {style.label}
          </p>
          <ul className={`mt-2 space-y-2 text-sm ${style.text}`}>
            {result.issues.map((iss, i) => (
              <li key={i}>
                <span className="font-semibold">{iss.title}</span>
                {iss.drugs.length > 0 && (
                  <span className="ml-1 text-xs opacity-80">({iss.drugs.join(", ")})</span>
                )}
                <span className="ml-1">— {iss.detail}</span>
              </li>
            ))}
          </ul>
          {result.alternatives.length > 0 && (
            <p className={`mt-2 text-xs ${style.text}`}>
              <span className="font-semibold">Safer alternatives:</span>{" "}
              {result.alternatives.join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
