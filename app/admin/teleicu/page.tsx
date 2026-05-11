"use client";

// Tele-ICU command center.
//
// Grid of bed tiles colour-coded by NEWS2 band. Click a bed to open
// a detail pane with vitals trend, handover notes, coverage history,
// and inline patient/admission editing. Polls every 10s.

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

interface News2Component { kind: string; value: number | string | undefined; score: number }
interface News2 {
  total: number; band: "none" | "low" | "medium" | "high";
  components: News2Component[]; singleParam3: boolean;
  coverage: number; recommendation: string;
}
interface Bed {
  id: string; organizationId: string; bedLabel: string; ward?: string;
  patientUserId?: string; patientName?: string; patientAge?: number; patientSex?: string;
  admissionDiagnosis?: string; ventilatorMode?: string; vasopressors?: string[];
  monitorDeviceId?: string; status: string; codeStatus?: string;
  admittedAt?: string; updatedAt: string;
}
interface Snapshot {
  bed: Bed; organizationName: string;
  latestVitals: Record<string, { value: number; takenAt: string }>;
  trend: Record<string, Array<{ value: number; takenAt: string }>>;
  news2: News2 | null;
  coverage: { id: string; intensivistName?: string; fromIso: string } | null;
  stale: boolean;
}
interface IcuNote {
  id: string; bedId: string; authorEmail: string; authorName?: string;
  body: string; tag: "info" | "concern" | "critical"; createdAt: string;
}

const BAND_TILE: Record<string, string> = {
  none: "border-emerald-200 bg-emerald-50",
  low: "border-emerald-300 bg-emerald-50/60",
  medium: "border-amber-400 bg-amber-50",
  high: "border-rose-500 bg-rose-100 ring-2 ring-rose-300",
};
const BAND_LABEL: Record<string, string> = {
  none: "Stable", low: "Low risk", medium: "Medium", high: "HIGH",
};
const BAND_PILL: Record<string, string> = {
  none: "bg-emerald-200 text-emerald-900",
  low: "bg-emerald-300 text-emerald-900",
  medium: "bg-amber-400 text-amber-900",
  high: "bg-rose-600 text-white",
};
const STATUS_LABEL: Record<string, string> = {
  occupied: "Occupied", stepping_down: "Step-down", vacant: "Vacant",
  transferred: "Transferred", discharged: "Discharged",
};

const VITAL_LABELS: Record<string, string> = {
  hr_resting: "HR", spo2: "SpO₂", bp_systolic: "SBP",
  bp_diastolic: "DBP", respiratory_rate: "RR", temperature_c: "Temp",
};
const VITAL_UNITS: Record<string, string> = {
  hr_resting: "bpm", spo2: "%", bp_systolic: "", bp_diastolic: "",
  respiratory_rate: "/min", temperature_c: "°C",
};
const NOTE_TONE: Record<string, string> = {
  info: "border-sky-200 bg-sky-50",
  concern: "border-amber-300 bg-amber-50",
  critical: "border-rose-300 bg-rose-50",
};

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function TeleIcuPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState<IcuNote[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [noteTag, setNoteTag] = useState<"info" | "concern" | "critical">("info");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ bedLabel: "", ward: "" });
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ patientUserId: "", patientName: "", patientAge: "", admissionDiagnosis: "", monitorDeviceId: "" });
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/teleicu/dashboard?scope=${scope}`, { cache: "no-store" });
    if (r.ok) setSnapshots((await r.json()).snapshots || []);
  }, [scope]);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const active = useMemo(() => snapshots.find((s) => s.bed.id === activeId) || null, [snapshots, activeId]);

  useEffect(() => {
    if (!activeId) { setActiveNotes([]); return; }
    fetch(`/api/teleicu/beds/${activeId}`).then(async (r) => {
      if (r.ok) setActiveNotes((await r.json()).notes || []);
    });
  }, [activeId, snapshots]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { none: 0, low: 0, medium: 0, high: 0 };
    for (const s of snapshots) c[s.news2?.band || "none"]++;
    return c;
  }, [snapshots]);

  const createBed = async () => {
    if (!createForm.bedLabel.trim()) return;
    const r = await fetch("/api/teleicu/beds", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    if (r.ok) { setToast({ kind: "ok", text: "Bed created." }); setShowCreate(false); setCreateForm({ bedLabel: "", ward: "" }); await load(); }
    else { setToast({ kind: "err", text: "Create failed (need active org context)." }); }
  };

  const assignPatient = async () => {
    if (!active) return;
    const r = await fetch(`/api/teleicu/beds/${active.bed.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...assignForm,
        patientAge: assignForm.patientAge ? Number(assignForm.patientAge) : undefined,
        status: "occupied",
        admittedAt: new Date().toISOString(),
      }),
    });
    if (r.ok) { setToast({ kind: "ok", text: "Patient assigned." }); setShowAssign(false); setAssignForm({ patientUserId: "", patientName: "", patientAge: "", admissionDiagnosis: "", monitorDeviceId: "" }); await load(); }
  };

  const claimCoverage = async (bedId: string) => {
    const r = await fetch("/api/teleicu/coverage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bedId }),
    });
    if (r.ok) { setToast({ kind: "ok", text: "Coverage claimed." }); await load(); }
  };

  const addNote = async () => {
    if (!active || !noteBody.trim()) return;
    const r = await fetch("/api/teleicu/notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bedId: active.bed.id, body: noteBody, tag: noteTag }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: "Note added." });
      setNoteBody("");
      const r2 = await fetch(`/api/teleicu/beds/${active.bed.id}`);
      if (r2.ok) setActiveNotes((await r2.json()).notes || []);
    }
  };

  return (
    <div>
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6">
        <PageHero
          icon="🫀"
          eyebrow="Critical Care Grid"
          title="Tele-ICU Command Center"
          subtitle="Every covered ICU bed in one grid. NEWS2 score updates every 10 seconds from live wearable streams."
          tone="rose"
          primaryAction={{ label: "+ New bed", onClick: () => setShowCreate(true) }}
        />
      </div>
      <div className="mb-4 flex justify-end">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button onClick={() => setScope("all")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${scope === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>All beds</button>
          <button onClick={() => setScope("mine")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${scope === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>My coverage</button>
        </div>
      </div>

      {/* Risk strip */}
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">High risk</p>
          <p className="mt-1 text-3xl font-extrabold text-rose-700">{counts.high}</p>
        </div>
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Medium</p>
          <p className="mt-1 text-3xl font-extrabold text-amber-700">{counts.medium}</p>
        </div>
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Low / stable</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-700">{counts.low + counts.none}</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Beds total</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{snapshots.length}</p>
        </div>
      </div>

      {/* Bed grid */}
      {snapshots.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">No beds in scope. Add a bed via the &ldquo;+ New bed&rdquo; button to get started.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {snapshots.map((s) => (
            <button key={s.bed.id} onClick={() => setActiveId(s.bed.id)} className={`rounded-xl border-2 p-3 text-left transition hover:shadow-md ${BAND_TILE[s.news2?.band || "none"]}`}>
              <div className="mb-1 flex items-center justify-between">
                <p className="font-bold text-slate-900">{s.bed.bedLabel}</p>
                {s.news2 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${BAND_PILL[s.news2.band]}`}>{BAND_LABEL[s.news2.band]} · {s.news2.total}</span>}
              </div>
              <p className="text-[11px] text-slate-500">{s.organizationName}{s.bed.ward ? ` · ${s.bed.ward}` : ""}</p>
              {s.bed.patientName ? (
                <>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {s.bed.patientName}
                    {s.bed.patientAge !== undefined && <span className="text-slate-500"> · {s.bed.patientAge}y{s.bed.patientSex ? ` ${s.bed.patientSex[0].toUpperCase()}` : ""}</span>}
                  </p>
                  {s.bed.admissionDiagnosis && <p className="text-[11px] italic text-slate-600">&ldquo;{s.bed.admissionDiagnosis}&rdquo;</p>}
                </>
              ) : (
                <p className="mt-1 text-sm italic text-slate-400">{STATUS_LABEL[s.bed.status]}</p>
              )}
              <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                {Object.entries(s.latestVitals).filter(([k]) => VITAL_LABELS[k]).map(([k, v]) => (
                  <span key={k} className="rounded bg-white px-1.5 py-0.5 ring-1 ring-slate-200">
                    <span className="font-semibold text-slate-500">{VITAL_LABELS[k]}</span>{" "}
                    <span className="font-mono text-slate-900">{Math.round(v.value * 10) / 10}{VITAL_UNITS[k]}</span>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className={s.stale ? "text-rose-600 font-semibold" : "text-slate-500"}>
                  {s.stale ? "⚠ Stale (>15m)" : `Updated ${timeAgo(Object.values(s.latestVitals)[0]?.takenAt)} ago`}
                </span>
                {s.coverage ? (
                  <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 font-bold text-indigo-700">👁 {s.coverage.intensivistName?.split(" ")[0] || "covered"}</span>
                ) : (
                  <span className="text-amber-600 font-semibold">No coverage</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bed detail */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40" onClick={() => setActiveId(null)}>
          <div className="w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">{active.organizationName}{active.bed.ward ? ` · ${active.bed.ward}` : ""}</p>
                <h2 className="text-2xl font-bold text-slate-900">{active.bed.bedLabel}</h2>
                {active.bed.patientName ? (
                  <p className="mt-0.5 text-sm text-slate-700">
                    <strong>{active.bed.patientName}</strong>
                    {active.bed.patientAge !== undefined && ` · ${active.bed.patientAge}y${active.bed.patientSex ? ` ${active.bed.patientSex}` : ""}`}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm italic text-slate-400">{STATUS_LABEL[active.bed.status]}</p>
                )}
              </div>
              <button onClick={() => setActiveId(null)} className="text-slate-500">✕</button>
            </div>

            {/* NEWS2 detail */}
            {active.news2 ? (
              <div className={`mb-4 rounded-2xl border-2 p-4 ${BAND_TILE[active.news2.band]}`}>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-extrabold text-slate-900">NEWS2 {active.news2.total}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${BAND_PILL[active.news2.band]}`}>{BAND_LABEL[active.news2.band]} risk</span>
                </div>
                <p className="mt-1 text-xs text-slate-700"><strong>Action:</strong> {active.news2.recommendation}</p>
                <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] sm:grid-cols-4">
                  {active.news2.components.map((c, i) => (
                    <div key={i} className={`rounded px-1.5 py-0.5 ${c.score >= 3 ? "bg-rose-200 text-rose-900 font-bold" : c.score >= 1 ? "bg-amber-100 text-amber-800" : "bg-white text-slate-700"}`}>
                      <span className="font-semibold">{c.kind}</span> {c.value !== undefined ? c.value : "—"} <span className="opacity-60">+{c.score}</span>
                    </div>
                  ))}
                </div>
                {active.news2.coverage < 1 && <p className="mt-2 text-[10px] text-amber-700">Coverage {Math.round(active.news2.coverage * 100)}% — score may be understated.</p>}
              </div>
            ) : (
              <div className="mb-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">No vitals yet for this bed. Assign a patient + monitor device to start scoring.</p>
                {!active.bed.patientUserId && (
                  <button onClick={() => setShowAssign(true)} className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">Assign patient</button>
                )}
              </div>
            )}

            {/* Trend sparklines */}
            {Object.keys(active.trend).length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">6h vital trends</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(active.trend).map(([kind, points]) => (
                    <Spark key={kind} label={VITAL_LABELS[kind] || kind} unit={VITAL_UNITS[kind] || ""} points={points} />
                  ))}
                </div>
              </div>
            )}

            {/* Coverage */}
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Coverage</p>
                {!active.coverage && (
                  <button onClick={() => claimCoverage(active.bed.id)} className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white">Claim coverage</button>
                )}
              </div>
              {active.coverage ? (
                <p className="mt-1 text-sm text-slate-800">
                  <strong>{active.coverage.intensivistName || "Unknown"}</strong> since {new Date(active.coverage.fromIso).toLocaleString()}
                </p>
              ) : (
                <p className="mt-1 text-xs italic text-amber-700">No active coverage</p>
              )}
            </div>

            {/* Notes thread */}
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Handover notes ({activeNotes.length})</p>
              <div className="mb-3 flex gap-2">
                <select value={noteTag} onChange={(e) => setNoteTag(e.target.value as "info" | "concern" | "critical")} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">
                  <option value="info">Info</option><option value="concern">Concern</option><option value="critical">Critical</option>
                </select>
                <input className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a handover note…" onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} />
                <button onClick={addNote} disabled={!noteBody.trim()} className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-50">Add</button>
              </div>
              <ul className="space-y-1">
                {activeNotes.map((n) => (
                  <li key={n.id} className={`rounded-md border-l-4 px-2 py-1 ${NOTE_TONE[n.tag]}`}>
                    <p className="text-xs">{n.body}</p>
                    <p className="text-[10px] text-slate-500">— {n.authorName || n.authorEmail} · {new Date(n.createdAt).toLocaleString()}</p>
                  </li>
                ))}
                {activeNotes.length === 0 && <p className="text-xs italic text-slate-400">No notes yet.</p>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Create bed dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">New ICU bed</h3>
            <p className="mt-1 text-xs text-slate-500">Beds belong to your active organisation. Use the org-switcher in the top bar to change context.</p>
            <input className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder='Label e.g. "ICU-3 Bed 12"' value={createForm.bedLabel} onChange={(e) => setCreateForm({ ...createForm, bedLabel: e.target.value })} />
            <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ward (optional)" value={createForm.ward} onChange={(e) => setCreateForm({ ...createForm, ward: e.target.value })} />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button onClick={createBed} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign patient dialog */}
      {showAssign && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAssign(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Assign patient to {active.bed.bedLabel}</h3>
            <div className="mt-3 space-y-2">
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Patient user id (links wearables)" value={assignForm.patientUserId} onChange={(e) => setAssignForm({ ...assignForm, patientUserId: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Patient name" value={assignForm.patientName} onChange={(e) => setAssignForm({ ...assignForm, patientName: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Age" value={assignForm.patientAge} onChange={(e) => setAssignForm({ ...assignForm, patientAge: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Admission diagnosis" value={assignForm.admissionDiagnosis} onChange={(e) => setAssignForm({ ...assignForm, admissionDiagnosis: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Monitor device id (optional)" value={assignForm.monitorDeviceId} onChange={(e) => setAssignForm({ ...assignForm, monitorDeviceId: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowAssign(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button onClick={assignPatient} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spark({ label, unit, points }: { label: string; unit: string; points: Array<{ value: number; takenAt: string }> }) {
  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 240;
  const h = 50;
  const step = w / Math.max(1, points.length - 1);
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(" ");
  const last = values[values.length - 1];
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="font-mono text-xs font-bold text-slate-900">{Math.round(last * 10) / 10}{unit}</p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full">
        <path d={path} fill="none" stroke="#0ea5e9" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[9px] text-slate-400">
        <span>{Math.round(min * 10) / 10}</span>
        <span>{Math.round(max * 10) / 10}</span>
      </div>
    </div>
  );
}
