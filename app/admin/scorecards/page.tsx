"use client";

// V13 §6 — Per-person scorecards (admin view).
//
// Two-pane layout: ranked list of staff (worst-first so managers
// address concerns first) + detail panel showing the five sub-scores
// + the V13 §6.6 band callout + a 30-day counts breakdown.

import { useCallback, useEffect, useState } from "react";

type ScoreBand = "exemplary" | "strong" | "watch" | "concern" | "critical";

interface ScoreComponent {
  key: string;
  label: string;
  score: number;
  sampleSize: number;
  note?: string;
}

interface Scorecard {
  email: string;
  role?: string;
  windowDays: number;
  overall: number;
  band: ScoreBand;
  components: ScoreComponent[];
  counts: {
    totalEvents: number;
    breaches: number;
    breachesAcknowledged: number;
    carsOpen: number;
    carsClosedOnTime: number;
    carsClosedLate: number;
  };
  generatedAt: string;
}

const BAND_PILL: Record<ScoreBand, string> = {
  exemplary: "bg-emerald-100 text-emerald-800",
  strong:    "bg-sky-100 text-sky-800",
  watch:     "bg-amber-100 text-amber-800",
  concern:   "bg-orange-100 text-orange-800",
  critical:  "bg-rose-100 text-rose-800",
};
const BAND_LABEL: Record<ScoreBand, string> = {
  exemplary: "Exemplary (90–100)",
  strong:    "Strong (80–89)",
  watch:     "Watch (70–79)",
  concern:   "Concern (60–69)",
  critical:  "Critical (<60)",
};
const BAND_ACTION: Record<ScoreBand, string> = {
  exemplary: "Recognition + mentor candidacy.",
  strong:    "Standard performance, no action.",
  watch:     "Quarterly review with manager.",
  concern:   "Monthly review + training plan.",
  critical:  "Immediate intervention. Review suspension.",
};

export default function ScorecardsPage() {
  const [windowDays, setWindowDays] = useState(30);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [selected, setSelected] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/scorecards?windowDays=${windowDays}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setScorecards(d.scorecards || []);
      setSelected((prev) => prev ? (d.scorecards || []).find((s: Scorecard) => s.email === prev.email) || null : null);
    }
    setLoading(false);
  }, [windowDays]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff scorecards</h1>
          <p className="mt-1 text-sm text-gray-600">
            V13 §6 — rolled up from accountability events + CAR closure
            data. Lowest scores first.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Window</label>
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>365 days</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Ranked list */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-center text-sm text-gray-500">Computing scores…</p>
          ) : scorecards.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              No accountability data in this window yet. As staff use the
              platform, events flow in and scorecards populate here.
            </p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-gray-100 overflow-y-auto">
              {scorecards.map((s) => (
                <li key={s.email}>
                  <button
                    onClick={() => setSelected(s)}
                    className={`block w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${selected?.email === s.email ? "bg-[#0F6E56]/5" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">{s.email}</p>
                      <ScoreNumber value={s.overall} />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${BAND_PILL[s.band]}`}>
                        {BAND_LABEL[s.band]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {s.counts.totalEvents} actions · {s.counts.breaches} breaches
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {!selected ? (
            <p className="text-sm text-gray-500">Select a row on the left to view the detail.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.email}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Last {selected.windowDays} days · {selected.counts.totalEvents} actions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-extrabold text-[#0F6E56]">{selected.overall}</p>
                  <p className="text-xs uppercase tracking-wider text-gray-500">/ 100</p>
                </div>
              </div>

              <div className={`rounded-xl border px-4 py-3 ${BAND_PILL[selected.band]}`}>
                <p className="text-sm font-bold">{BAND_LABEL[selected.band]}</p>
                <p className="mt-0.5 text-xs">{BAND_ACTION[selected.band]}</p>
              </div>

              {/* Components */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-600">Components</p>
                <ul className="space-y-3">
                  {selected.components.map((c) => (
                    <li key={c.key}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium text-gray-800">{c.label}</span>
                        <span className="font-bold text-gray-900">{c.score}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${c.score >= 80 ? "bg-emerald-500" : c.score >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${c.score}%` }}
                        />
                      </div>
                      {c.note && <p className="mt-1 text-xs text-gray-500">{c.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Counts */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-600">Counts</p>
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Actions" value={selected.counts.totalEvents} />
                  <Stat label="Breaches" value={selected.counts.breaches} tone={selected.counts.breaches > 0 ? "warn" : "ok"} />
                  <Stat label="Acknowledged" value={selected.counts.breachesAcknowledged} />
                  <Stat label="CARs open" value={selected.counts.carsOpen} tone={selected.counts.carsOpen > 0 ? "warn" : "ok"} />
                  <Stat label="On-time close" value={selected.counts.carsClosedOnTime} />
                  <Stat label="Late close" value={selected.counts.carsClosedLate} tone={selected.counts.carsClosedLate > 0 ? "bad" : "ok"} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreNumber({ value }: { value: number }) {
  const color = value >= 80 ? "text-emerald-600" : value >= 60 ? "text-amber-600" : "text-rose-600";
  return <span className={`text-lg font-extrabold ${color}`}>{value}</span>;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" | "bad" }) {
  const c = tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-800"
    : tone === "bad" ? "border-rose-200 bg-rose-50 text-rose-800"
    : "border-gray-200 bg-gray-50 text-gray-800";
  return (
    <div className={`rounded-lg border px-3 py-2 ${c}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}
