"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard, FilterChip } from "@/components/admin/PageShell";
import type {
  CarePlan, CarePlanStatus, NursingDiagnosis, NursingGoal,
  NursingIntervention, NursingProgressEntry, DiagnosisStatus,
  GoalStatus, InterventionFrequency, NursingShift,
} from "@/lib/hospital/nursing-care-store";
// Inlined from nursing-care-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const STATUS_LABEL: Record<CarePlanStatus, string> = {
  active: "Active", completed: "Completed", cancelled: "Cancelled", on_hold: "On hold",
};
const DX_STATUS_LABEL: Record<DiagnosisStatus, string> = {
  active: "Active", resolved: "Resolved", at_risk: "At risk", potential: "Potential",
};
const GOAL_LABEL: Record<GoalStatus, string> = {
  not_met: "Not met", partially_met: "Partially met", met: "Met", exceeded: "Exceeded",
};
const FREQ_LABEL: Record<InterventionFrequency, string> = {
  continuous: "Continuous", q15m: "q15m", q30m: "q30m", hourly: "Hourly",
  q2h: "q2h", q4h: "q4h", q6h: "q6h", q8h: "q8h", q12h: "q12h",
  daily: "Daily", bid: "BID", tid: "TID", qid: "QID", prn: "PRN", weekly: "Weekly",
};
const SHIFT_LABEL: Record<NursingShift, string> = {
  morning: "Morning", evening: "Evening", night: "Night",
};

interface Patient { id: string; firstName: string; lastName: string; }

const STATUSES: CarePlanStatus[] = ["active", "completed", "cancelled", "on_hold"];
const DX_STATUSES: DiagnosisStatus[] = ["active", "resolved", "at_risk", "potential"];
const GOAL_STATUSES: GoalStatus[] = ["not_met", "partially_met", "met", "exceeded"];
const FREQUENCIES: InterventionFrequency[] = ["continuous", "q15m", "q30m", "hourly", "q2h", "q4h", "q6h", "q8h", "q12h", "daily", "bid", "tid", "qid", "prn", "weekly"];
const SHIFTS: NursingShift[] = ["morning", "evening", "night"];

export default function NursingCarePage() {
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [stats, setStats] = useState<{ active: number; onHold: number; completedMonth: number; activeDiagnoses: number; highPriority: number; overdueReview: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showPlan, setShowPlan] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [editing, setEditing] = useState<CarePlan | null>(null);
  const [progressFor, setProgressFor] = useState<CarePlan | null>(null);
  const [filterStatus, setFilterStatus] = useState<CarePlanStatus | "">("");

  async function load() {
    const qs = new URLSearchParams();
    if (filterStatus) qs.set("status", filterStatus);
    const res = await fetch(`/api/hospital/nursing-care?${qs.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setPlans(data.plans || []);
    setStats(data.stats || null);
  }
  async function loadPatients() {
    try {
      const res = await fetch("/api/patients", { cache: "no-store" });
      const data = await res.json();
      setPatients(data.patients || []);
    } catch {}
  }
  useEffect(() => { load(); }, [filterStatus]);
  useEffect(() => { loadPatients(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete care plan?")) return;
    await fetch("/api/hospital/nursing-care", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon="🩷"
        eyebrow="Bedside"
        title="Nursing Care Plans"
        subtitle="NANDA diagnoses · NOC goals · NIC interventions · SOAP progress notes"
        tone="rose"
        primaryAction={{ label: "+ New care plan", onClick: () => { setEditing(null); setShowPlan(true); } }}
      />

      {stats && (
        <StatGrid cols={6}>
          <StatCard label="Active" value={stats.active} tone="emerald" icon="●" />
          <StatCard label="On hold" value={stats.onHold} tone="slate" icon="⏸" />
          <StatCard label="Completed (mo)" value={stats.completedMonth} tone="teal" icon="✓" />
          <StatCard label="Active diagnoses" value={stats.activeDiagnoses} tone="indigo" icon="📋" />
          <StatCard label="High priority" value={stats.highPriority} tone="rose" icon="❗" />
          <StatCard label="Overdue review" value={stats.overdueReview} tone="amber" icon="⏰" />
        </StatGrid>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={filterStatus === ""} onClick={() => setFilterStatus("")}>All</FilterChip>
        {STATUSES.map((s) => <FilterChip key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}>{STATUS_LABEL[s]}</FilterChip>)}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {plans.length === 0 ? <Empty label="No care plans." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Primary nurse</th>
                  <th className="px-4 py-3">Dx (active)</th>
                  <th className="px-4 py-3">Goals (met)</th>
                  <th className="px-4 py-3">Last reviewed</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => {
                  const activeDx = p.diagnoses.filter((d) => d.status === "active" || d.status === "at_risk").length;
                  const metGoals = p.goals.filter((g) => g.status === "met" || g.status === "exceeded").length;
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.id}</td>
                      <td className="px-4 py-3 font-medium">{p.patientName}</td>
                      <td className="px-4 py-3">{p.primaryNurse}</td>
                      <td className="px-4 py-3 text-xs">{activeDx} / {p.diagnoses.length}</td>
                      <td className="px-4 py-3 text-xs">{metGoals} / {p.goals.length}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{p.lastReviewedAt ? new Date(p.lastReviewedAt).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{new Date(p.startedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><Pill tone={p.status === "active" ? "emerald" : p.status === "on_hold" ? "amber" : "slate"}>{STATUS_LABEL[p.status]}</Pill></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setProgressFor(p); setShowProgress(true); }} className="text-xs font-semibold text-indigo-600 hover:underline">+ SOAP</button>
                        <button onClick={() => { setEditing(p); setShowPlan(true); }} className="ml-3 text-xs font-semibold text-primary-600 hover:underline">Edit</button>
                        <button onClick={() => remove(p.id)} className="ml-3 text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPlan && <PlanModal patients={patients} editing={editing} onClose={() => setShowPlan(false)} onSaved={() => { setShowPlan(false); load(); }} />}
      {showProgress && progressFor && <ProgressModal plan={progressFor} onClose={() => setShowProgress(false)} onSaved={() => { setShowProgress(false); load(); }} />}
    </div>
  );
}

function PlanModal({ patients, editing, onClose, onSaved }: { patients: Patient[]; editing: CarePlan | null; onClose: () => void; onSaved: () => void; }) {
  const [patientId, setPatientId] = useState(editing?.patientId || "");
  const [primaryNurse, setPrimaryNurse] = useState(editing?.primaryNurse || "");
  const [status, setStatus] = useState<CarePlanStatus>(editing?.status || "active");
  const [reviewFrequencyHours, setRFH] = useState<number | "">(editing?.reviewFrequencyHours ?? 24);
  const [closeReason, setCR] = useState(editing?.closeReason || "");
  const [diagnoses, setDiagnoses] = useState<NursingDiagnosis[]>(editing?.diagnoses || []);
  const [goals, setGoals] = useState<NursingGoal[]>(editing?.goals || []);
  const [interventions, setInterventions] = useState<NursingIntervention[]>(editing?.interventions || []);
  const [saving, setSaving] = useState(false);

  function addDx() { setDiagnoses([...diagnoses, { id: `dx-${Date.now()}`, title: "", status: "active", priority: 2 }]); }
  function updDx(i: number, patch: Partial<NursingDiagnosis>) { setDiagnoses(diagnoses.map((d, idx) => idx === i ? { ...d, ...patch } : d)); }
  function delDx(i: number) { setDiagnoses(diagnoses.filter((_, idx) => idx !== i)); }

  function addGoal() { setGoals([...goals, { id: `g-${Date.now()}`, text: "", status: "not_met" }]); }
  function updGoal(i: number, patch: Partial<NursingGoal>) { setGoals(goals.map((g, idx) => idx === i ? { ...g, ...patch } : g)); }
  function delGoal(i: number) { setGoals(goals.filter((_, idx) => idx !== i)); }

  function addIntv() { setInterventions([...interventions, { id: `iv-${Date.now()}`, title: "", frequency: "daily", active: true }]); }
  function updIntv(i: number, patch: Partial<NursingIntervention>) { setInterventions(interventions.map((x, idx) => idx === i ? { ...x, ...patch } : x)); }
  function delIntv(i: number) { setInterventions(interventions.filter((_, idx) => idx !== i)); }

  async function submit() {
    if (!patientId || !primaryNurse) return;
    const p = patients.find((x) => x.id === patientId);
    if (!p) return;
    setSaving(true);
    const payload = {
      id: editing?.id,
      patientId, patientName: `${p.firstName} ${p.lastName}`,
      primaryNurse, status,
      reviewFrequencyHours: reviewFrequencyHours === "" ? 24 : Number(reviewFrequencyHours),
      closeReason: closeReason || undefined,
      diagnoses, goals, interventions,
    };
    await fetch("/api/hospital/nursing-care", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit care plan" : "New care plan"}</h2>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Patient">
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
            </Field>
            <Field label="Primary nurse"><input value={primaryNurse} onChange={(e) => setPrimaryNurse(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as CarePlanStatus)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Review freq (hrs)"><input type="number" value={reviewFrequencyHours} onChange={(e) => setRFH(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>
          {(status === "completed" || status === "cancelled") && <Field label="Close reason"><input value={closeReason} onChange={(e) => setCR(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase text-slate-600">NANDA Diagnoses</div>
              <button type="button" onClick={addDx} className="text-xs font-semibold text-primary-600">+ Add diagnosis</button>
            </div>
            {diagnoses.length === 0 ? <div className="text-xs text-slate-400">No diagnoses.</div> : (
              <div className="space-y-2">
                {diagnoses.map((d, i) => (
                  <div key={d.id} className="grid grid-cols-12 gap-2 rounded border border-slate-200 bg-white p-2">
                    <input value={d.code || ""} onChange={(e) => updDx(i, { code: e.target.value })} placeholder="NANDA code" className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={d.title} onChange={(e) => updDx(i, { title: e.target.value })} placeholder="Diagnosis title" className="col-span-3 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={d.relatedTo || ""} onChange={(e) => updDx(i, { relatedTo: e.target.value })} placeholder="Related to..." className="col-span-3 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <select value={d.priority} onChange={(e) => updDx(i, { priority: Number(e.target.value) as 1 | 2 | 3 })} className="col-span-1 rounded border border-slate-300 px-2 py-1 text-xs">
                      <option value={1}>P1</option><option value={2}>P2</option><option value={3}>P3</option>
                    </select>
                    <select value={d.status} onChange={(e) => updDx(i, { status: e.target.value as DiagnosisStatus })} className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs">
                      {DX_STATUSES.map((s) => <option key={s} value={s}>{DX_STATUS_LABEL[s]}</option>)}
                    </select>
                    <button type="button" onClick={() => delDx(i)} className="col-span-1 text-xs text-rose-600">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase text-slate-600">NOC Goals</div>
              <button type="button" onClick={addGoal} className="text-xs font-semibold text-primary-600">+ Add goal</button>
            </div>
            {goals.length === 0 ? <div className="text-xs text-slate-400">No goals.</div> : (
              <div className="space-y-2">
                {goals.map((g, i) => (
                  <div key={g.id} className="grid grid-cols-12 gap-2 rounded border border-slate-200 bg-white p-2">
                    <input value={g.nocCode || ""} onChange={(e) => updGoal(i, { nocCode: e.target.value })} placeholder="NOC" className="col-span-1 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={g.text} onChange={(e) => updGoal(i, { text: e.target.value })} placeholder="Goal (measurable)" className="col-span-4 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={g.indicators || ""} onChange={(e) => updGoal(i, { indicators: e.target.value })} placeholder="Indicators" className="col-span-3 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input type="date" value={g.targetDate?.slice(0, 10) || ""} onChange={(e) => updGoal(i, { targetDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <select value={g.status} onChange={(e) => updGoal(i, { status: e.target.value as GoalStatus })} className="col-span-1 rounded border border-slate-300 px-2 py-1 text-xs">
                      {GOAL_STATUSES.map((s) => <option key={s} value={s}>{GOAL_LABEL[s]}</option>)}
                    </select>
                    <button type="button" onClick={() => delGoal(i)} className="col-span-1 text-xs text-rose-600">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase text-slate-600">NIC Interventions</div>
              <button type="button" onClick={addIntv} className="text-xs font-semibold text-primary-600">+ Add intervention</button>
            </div>
            {interventions.length === 0 ? <div className="text-xs text-slate-400">No interventions.</div> : (
              <div className="space-y-2">
                {interventions.map((x, i) => (
                  <div key={x.id} className="grid grid-cols-12 gap-2 rounded border border-slate-200 bg-white p-2">
                    <input value={x.nicCode || ""} onChange={(e) => updIntv(i, { nicCode: e.target.value })} placeholder="NIC" className="col-span-1 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={x.title} onChange={(e) => updIntv(i, { title: e.target.value })} placeholder="Intervention" className="col-span-3 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={x.rationale || ""} onChange={(e) => updIntv(i, { rationale: e.target.value })} placeholder="Rationale" className="col-span-3 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <select value={x.frequency} onChange={(e) => updIntv(i, { frequency: e.target.value as InterventionFrequency })} className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs">
                      {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQ_LABEL[f]}</option>)}
                    </select>
                    <input value={x.assignedTo || ""} onChange={(e) => updIntv(i, { assignedTo: e.target.value })} placeholder="Assigned" className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <label className="col-span-0 flex items-center gap-1 text-xs"><input type="checkbox" checked={x.active} onChange={(e) => updIntv(i, { active: e.target.checked })} /></label>
                    <button type="button" onClick={() => delIntv(i)} className="col-span-1 text-xs text-rose-600">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function ProgressModal({ plan, onClose, onSaved }: { plan: CarePlan; onClose: () => void; onSaved: () => void; }) {
  const [recordedBy, setBy] = useState("");
  const [shift, setShift] = useState<NursingShift>("morning");
  const [subjective, setS] = useState("");
  const [objective, setO] = useState("");
  const [assessment, setA] = useState("");
  const [planText, setP] = useState("");
  const [vitalsSummary, setV] = useState("");
  const [painScoreNrs, setPain] = useState<number | "">("");
  const [interventionsPerformed, setIP] = useState("");
  const [patientResponse, setPR] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!recordedBy) return;
    setSaving(true);
    const payload = {
      kind: "progress",
      planId: plan.id,
      entry: {
        recordedBy, shift,
        subjective: subjective || undefined,
        objective: objective || undefined,
        assessment: assessment || undefined,
        plan: planText || undefined,
        vitalsSummary: vitalsSummary || undefined,
        painScoreNrs: painScoreNrs === "" ? undefined : Number(painScoreNrs),
        interventionsPerformed: interventionsPerformed || undefined,
        patientResponse: patientResponse || undefined,
      },
    };
    await fetch("/api/hospital/nursing-care", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    onSaved();
  }

  const recent = plan.progress.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">SOAP note · {plan.patientName}</h2>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Recorded by"><input value={recordedBy} onChange={(e) => setBy(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Shift">
              <select value={shift} onChange={(e) => setShift(e.target.value as NursingShift)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {SHIFTS.map((s) => <option key={s} value={s}>{SHIFT_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Pain NRS"><input type="number" min={0} max={10} value={painScoreNrs} onChange={(e) => setPain(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>
          <Field label="S — Subjective"><textarea value={subjective} onChange={(e) => setS(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="O — Objective"><textarea value={objective} onChange={(e) => setO(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="A — Assessment"><textarea value={assessment} onChange={(e) => setA(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="P — Plan"><textarea value={planText} onChange={(e) => setP(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Vitals summary"><input value={vitalsSummary} onChange={(e) => setV(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Interventions performed"><input value={interventionsPerformed} onChange={(e) => setIP(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>
          <Field label="Patient response"><textarea value={patientResponse} onChange={(e) => setPR(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>

          {recent.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-600">Last {recent.length} entries</div>
              <div className="space-y-2">
                {recent.map((e) => (
                  <div key={e.id} className="rounded border border-slate-200 bg-white p-2 text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold">{e.recordedBy} · {SHIFT_LABEL[e.shift]}</span>
                      <span className="text-slate-500">{new Date(e.recordedAt).toLocaleString()}</span>
                    </div>
                    {e.subjective && <div><span className="font-semibold text-slate-500">S:</span> {e.subjective}</div>}
                    {e.objective && <div><span className="font-semibold text-slate-500">O:</span> {e.objective}</div>}
                    {e.assessment && <div><span className="font-semibold text-slate-500">A:</span> {e.assessment}</div>}
                    {e.plan && <div><span className="font-semibold text-slate-500">P:</span> {e.plan}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Close</button>
          <button disabled={saving} onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save entry"}</button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const map: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  };
  return <div className={`rounded-lg p-3 ring-1 ${map[tone]}`}><div className="text-xs">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-primary-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{children}</button>;
}
function Pill({ tone, children }: { tone: "slate" | "amber" | "emerald" | "rose" | "indigo"; children: React.ReactNode; }) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}
function Field({ label, children }: { label: string; children: React.ReactNode; }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}</label>;
}
function Empty({ label }: { label: string }) {
  return <div className="p-8 text-center text-sm text-slate-500">{label}</div>;
}
