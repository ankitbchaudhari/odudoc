"use client";

// Symptom log — quick-entry severity tracker.
//
// Top: 30-day summary (which symptoms keep coming back, average
// severity, last seen). Bottom: full entry log with delete. Inline
// expand-form for a new entry.

import { useCallback, useEffect, useMemo, useState } from "react";

interface Entry {
  id: string; userId: string; symptom: string; severity: number;
  bodyArea?: string; durationMinutes?: number;
  trigger?: string; relief?: string; notes?: string;
  takenAt: string; createdAt: string;
}
interface Summary { symptom: string; count: number; avgSeverity: number; lastAt: string; }

const BODY_AREA_LABEL: Record<string, string> = {
  head: "Head", neck: "Neck", chest: "Chest", abdomen: "Abdomen",
  back: "Back", limbs: "Limbs", skin: "Skin", general: "General", mental: "Mental health",
};
const BODY_AREA_EMOJI: Record<string, string> = {
  head: "🧠", neck: "🦴", chest: "🫀", abdomen: "🫃",
  back: "🦴", limbs: "🦵", skin: "🩹", general: "🌡️", mental: "💭",
};

function severityTone(s: number): string {
  if (s >= 8) return "bg-rose-600 text-white";
  if (s >= 5) return "bg-amber-500 text-white";
  if (s >= 1) return "bg-emerald-500 text-white";
  return "bg-slate-400 text-white";
}
function severityLabel(s: number): string {
  if (s === 0) return "None";
  if (s <= 3) return "Mild";
  if (s <= 6) return "Moderate";
  if (s <= 8) return "Severe";
  return "Worst";
}
function timeAgo(iso: string): string {
  const m = (Date.now() - new Date(iso).getTime()) / 60000;
  if (m < 1) return "just now";
  if (m < 60) return `${Math.floor(m)}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export default function SymptomsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterSymptom, setFilterSymptom] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/symptoms", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setEntries(d.entries || []);
        setSummary(d.summary || []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const removeEntry = async (id: string) => {
    await fetch(`/api/symptoms?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  };

  const filtered = useMemo(() => {
    if (!filterSymptom) return entries;
    const f = filterSymptom.toLowerCase();
    return entries.filter((e) => e.symptom.toLowerCase() === f);
  }, [entries, filterSymptom]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Symptom log</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track recurring symptoms. Your doctor sees the same record at your next visit.
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700">
          {showForm ? "Cancel" : "+ Log symptom"}
        </button>
      </div>

      {showForm && <LogForm onSaved={() => { setShowForm(false); load(); }} />}

      {/* Summary chips */}
      {summary.length > 0 && (
        <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Last 30 days</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterSymptom(null)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${!filterSymptom ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              All ({entries.length})
            </button>
            {summary.map((s) => (
              <button
                key={s.symptom}
                onClick={() => setFilterSymptom(s.symptom)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filterSymptom === s.symptom ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${s.avgSeverity >= 7 ? "bg-rose-500" : s.avgSeverity >= 4 ? "bg-amber-500" : "bg-emerald-500"}`} />
                {s.symptom}
                <span className={filterSymptom === s.symptom ? "text-white/80" : "text-slate-500"}>
                  {s.count}× · avg {s.avgSeverity}/10
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Entries */}
      <section className="mt-6">
        {loading ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-3xl">🩺</p>
            <p className="mt-2 text-base font-bold text-slate-700">{filterSymptom ? `No "${filterSymptom}" entries` : "No symptoms logged yet"}</p>
            <p className="mt-1 text-sm text-slate-500">Log when you feel something off — even mild. Patterns become visible after 4-5 entries.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((e) => (
              <li key={e.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start gap-3">
                  <div className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl text-base font-bold ${severityTone(e.severity)}`}>
                    {e.severity}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{e.symptom}</p>
                      {e.bodyArea && <span className="text-[11px] text-slate-500">{BODY_AREA_EMOJI[e.bodyArea]} {BODY_AREA_LABEL[e.bodyArea]}</span>}
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">{severityLabel(e.severity)}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {new Date(e.takenAt).toLocaleString()} · {timeAgo(e.takenAt)}
                      {e.durationMinutes ? ` · ${e.durationMinutes < 60 ? `${e.durationMinutes}m` : `${Math.floor(e.durationMinutes / 60)}h ${e.durationMinutes % 60}m`}` : ""}
                    </p>
                    {(e.trigger || e.relief) && (
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                        {e.trigger && <span><b>Trigger:</b> {e.trigger}</span>}
                        {e.relief && <span><b>Relief:</b> {e.relief}</span>}
                      </div>
                    )}
                    {e.notes && <p className="mt-1 text-xs italic text-slate-500">{e.notes}</p>}
                  </div>
                  <button onClick={() => removeEntry(e.id)} aria-label="Delete" className="flex-none rounded-lg p-1.5 text-rose-500 hover:bg-rose-50">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LogForm({ onSaved }: { onSaved: () => void }) {
  const [symptom, setSymptom] = useState("");
  const [severity, setSeverity] = useState(5);
  const [bodyArea, setBodyArea] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [trigger, setTrigger] = useState("");
  const [relief, setRelief] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!symptom.trim()) { setError("Add a symptom name."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/symptoms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptom: symptom.trim(), severity,
          bodyArea: bodyArea || undefined,
          durationMinutes: durationMin ? Number(durationMin) : undefined,
          trigger: trigger.trim() || undefined,
          relief: relief.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b.error || `Failed (${res.status})`);
        return;
      }
      setSymptom(""); setSeverity(5); setBodyArea(""); setDurationMin("");
      setTrigger(""); setRelief(""); setNotes("");
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-bold text-slate-900">Log a symptom</p>
      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 text-xs font-semibold text-slate-700">
          Symptom
          <input
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            placeholder="e.g. headache, knee pain, nausea"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="sm:col-span-2 text-xs font-semibold text-slate-700">
          Severity: <span className="tabular-nums">{severity}/10 — {severityLabel(severity)}</span>
          <input
            type="range" min={0} max={10} step={1}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-600"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>None</span><span>Mild</span><span>Moderate</span><span>Severe</span><span>Worst</span>
          </div>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Body area (optional)
          <select value={bodyArea} onChange={(e) => setBodyArea(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
            <option value="">—</option>
            {Object.keys(BODY_AREA_LABEL).map((k) => (
              <option key={k} value={k}>{BODY_AREA_EMOJI[k]} {BODY_AREA_LABEL[k]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Duration in minutes (optional)
          <input type="number" min={0} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="30" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Trigger (optional)
          <input value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="after coffee, post-meal, exercise" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Relief (optional)
          <input value={relief} onChange={(e) => setRelief(e.target.value)} placeholder="rest, hydration, ibuprofen…" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
        </label>
        <label className="sm:col-span-2 text-xs font-semibold text-slate-700">
          Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else worth remembering" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={submit} disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
