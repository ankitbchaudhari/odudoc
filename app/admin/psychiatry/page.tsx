"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard, TabSwitch } from "@/components/admin/PageShell";
import type { PsychSession, TherapyPlan, SessionStatus, SessionType, PlanStatus, TherapyModality, RiskLevel, ScaleScore, PlanGoal } from "@/lib/hospital/psychiatry-store";
// Inlined from psychiatry-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: "Scheduled", in_progress: "In progress", completed: "Completed",
  no_show: "No show", cancelled: "Cancelled",
};
const MODALITY_LABEL: Record<TherapyModality, string> = {
  cbt: "CBT", dbt: "DBT", ipt: "IPT", psychodynamic: "Psychodynamic",
  family: "Family", group: "Group", act: "ACT", emdr: "EMDR", supportive: "Supportive",
};
function phq9Severity(score: number): string {
  if (score <= 4) return "minimal";
  if (score <= 9) return "mild";
  if (score <= 14) return "moderate";
  if (score <= 19) return "moderately severe";
  return "severe";
}
function gad7Severity(score: number): string {
  if (score <= 4) return "minimal";
  if (score <= 9) return "mild";
  if (score <= 14) return "moderate";
  return "severe";
}

interface Patient { id: string; firstName: string; lastName: string; }

const SESSION_TYPES: SessionType[] = ["initial", "follow_up", "therapy", "crisis", "medication_review", "family"];
const PLAN_STATUSES: PlanStatus[] = ["active", "on_hold", "completed", "discharged"];
const MODALITIES: TherapyModality[] = ["cbt", "dbt", "ipt", "psychodynamic", "family", "group", "act", "emdr", "supportive"];
const RISK_LEVELS: RiskLevel[] = ["none", "low", "moderate", "high", "imminent"];

const STATUS_COLOR: Record<SessionStatus, string> = {
  scheduled: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  no_show: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const RISK_COLOR: Record<RiskLevel, string> = {
  none: "bg-emerald-50 text-emerald-700",
  low: "bg-sky-50 text-sky-700",
  moderate: "bg-amber-50 text-amber-700",
  high: "bg-rose-100 text-rose-700",
  imminent: "bg-rose-600 text-white",
};

export default function PsychPage() {
  const [tab, setTab] = useState<"sessions" | "plans">("sessions");
  const [sessions, setSessions] = useState<PsychSession[]>([]);
  const [plans, setPlans] = useState<TherapyPlan[]>([]);
  const [stats, setStats] = useState<{ scheduledToday: number; completedMonth: number; noShowRate: number; activePlans: number; highRiskAlerts: number; severeDepression: number; severeAnxiety: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showSession, setShowSession] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [editingSession, setEditingSession] = useState<PsychSession | null>(null);
  const [editingPlan, setEditingPlan] = useState<TherapyPlan | null>(null);

  async function load() {
    const res = await fetch("/api/hospital/psychiatry", { cache: "no-store" });
    const d = await res.json();
    setSessions(d.sessions || []);
    setPlans(d.plans || []);
    setStats(d.stats || null);
  }
  async function loadPatients() { try { const r = await fetch("/api/patients", { cache: "no-store" }); const d = await r.json(); setPatients(d.patients || []); } catch {} }
  useEffect(() => { load(); loadPatients(); }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon="🧠"
        eyebrow="Mental health"
        title="Psychiatry"
        subtitle="MSE, PHQ-9 / GAD-7, risk assessment, therapy plans"
        tone="violet"
        secondaryAction={{ label: "+ Session", onClick: () => setShowSession(true) }}
        primaryAction={{ label: "+ Therapy plan", onClick: () => setShowPlan(true) }}
      />

      {stats && (
        <StatGrid cols={7}>
          <StatCard label="Today" value={stats.scheduledToday} tone="slate" icon="📅" />
          <StatCard label="Completed / mo" value={stats.completedMonth} tone="emerald" icon="✓" />
          <StatCard label="No-show rate" value={`${stats.noShowRate}%`} tone="amber" icon="✕" />
          <StatCard label="Active plans" value={stats.activePlans} tone="indigo" icon="📋" />
          <StatCard label="High-risk alerts" value={stats.highRiskAlerts} tone="rose" icon="🚨" />
          <StatCard label="Severe PHQ-9" value={stats.severeDepression} tone="orange" icon="⚠" />
          <StatCard label="Severe GAD-7" value={stats.severeAnxiety} tone="fuchsia" icon="❗" />
        </StatGrid>
      )}

      <TabSwitch
        active={tab}
        onSelect={(k) => setTab(k as "sessions" | "plans")}
        tabs={[
          { key: "sessions", label: "Sessions", count: sessions.length },
          { key: "plans", label: "Therapy plans", count: plans.length },
        ]}
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {tab === "sessions" ? (
          sessions.length === 0 ? <Empty label="No sessions." /> : (
            <div className="divide-y divide-slate-100">
              {sessions.map((s) => {
                const highRisk = s.risk && (s.risk.suicidality === "high" || s.risk.suicidality === "imminent" || s.risk.homicidality === "high" || s.risk.homicidality === "imminent");
                return (
                  <div key={s.id} className="flex items-start justify-between p-4 hover:bg-slate-50">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{s.id}</span>
                        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[s.status]}`}>{SESSION_STATUS_LABEL[s.status]}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{s.sessionType}</span>
                        {highRisk && <span className="rounded bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">⚠ HIGH RISK</span>}
                        {s.confidentiality && <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">🔒 Confidential</span>}
                      </div>
                      <div className="mt-1 text-[15px] font-semibold text-slate-900">{s.patientName}</div>
                      <div className="text-sm text-slate-600">{new Date(s.scheduledAt).toLocaleString()} • {s.providerName}{s.durationMin ? ` • ${s.durationMin}min` : ""}</div>
                      {s.scales && s.scales.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.scales.map((sc, ix) => <span key={ix} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono">{sc.name}: {sc.score}{sc.maxScore ? `/${sc.maxScore}` : ""}{sc.severity ? ` (${sc.severity})` : ""}</span>)}
                        </div>
                      )}
                      {s.diagnoses && <div className="mt-1 text-xs text-slate-700"><span className="font-medium">Dx:</span> {s.diagnoses}</div>}
                    </div>
                    <button onClick={() => setEditingSession(s)} className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</button>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          plans.length === 0 ? <Empty label="No therapy plans." /> : (
            <div className="divide-y divide-slate-100">
              {plans.map((p) => (
                <div key={p.id} className="flex items-start justify-between p-4 hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{p.id}</span>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : p.status === "discharged" || p.status === "completed" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{MODALITY_LABEL[p.modality]}</span>
                      {p.frequency && <span className="rounded bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">{p.frequency}</span>}
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-900">{p.patientName}</div>
                    <div className="text-sm text-slate-600">{p.primaryProvider} • since {new Date(p.startedAt).toLocaleDateString()}</div>
                    {p.primaryDiagnosis && <div className="mt-1 text-xs text-slate-700"><span className="font-medium">Dx:</span> {p.primaryDiagnosis}</div>}
                    {p.goals.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {p.goals.slice(0, 3).map((g, ix) => <div key={ix} className="text-xs text-slate-700">• {g.description}{g.status ? ` (${g.status})` : ""}</div>)}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setEditingPlan(p)} className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Manage</button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showSession && <SessionModal patients={patients} onClose={() => setShowSession(false)} onCreated={() => { setShowSession(false); load(); }} />}
      {showPlan && <PlanModal patients={patients} onClose={() => setShowPlan(false)} onCreated={() => { setShowPlan(false); load(); }} />}
      {editingSession && <EditSessionModal s={editingSession} onClose={() => setEditingSession(null)} onSaved={() => { setEditingSession(null); load(); }} />}
      {editingPlan && <EditPlanModal plan={editingPlan} onClose={() => setEditingPlan(null)} onSaved={() => { setEditingPlan(null); load(); }} />}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone: "slate" | "amber" | "rose" | "emerald" }) {
  const tones = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700" };
  return <div className={`rounded-xl border border-slate-200 ${tones[tone]} p-3`}><div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`border-b-2 px-4 py-2 text-sm font-medium transition ${active ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{children}</button>;
}
function Empty({ label }: { label: string }) { return <div className="p-10 text-center text-sm text-slate-400">{label}</div>; }

function SessionModal({ patients, onClose, onCreated }: { patients: Patient[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ patientId: "", patientName: "", providerName: "", scheduledAt: "", sessionType: "initial" as SessionType, chiefComplaint: "", confidentiality: true });
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/psychiatry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) onCreated();
    } finally { setSaving(false); }
  }
  return (
    <Modal title="New psychiatry session" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => { const p = patients.find((x) => x.id === e.target.value); setForm({ ...form, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : "" }); }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </Field>
        <Field label="Provider"><input value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Scheduled at"><input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Session type">
          <select value={form.sessionType} onChange={(e) => setForm({ ...form, sessionType: e.target.value as SessionType })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Chief complaint" full><textarea rows={2} value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.confidentiality} onChange={(e) => setForm({ ...form, confidentiality: e.target.checked })} /> Confidential (locked chart)</label>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} disabled={!form.patientId || !form.providerName || !form.scheduledAt} />
    </Modal>
  );
}

function EditSessionModal({ s, onClose, onSaved }: { s: PsychSession; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<PsychSession>>(s);
  const [scales, setScales] = useState<ScaleScore[]>(s.scales || []);
  const [saving, setSaving] = useState(false);

  function addScale() { setScales([...scales, { name: "PHQ-9", score: 0, maxScore: 27 }]); }
  function updScale(ix: number, patch: Partial<ScaleScore>) {
    setScales(scales.map((sc, i) => {
      if (i !== ix) return sc;
      const merged = { ...sc, ...patch };
      if (merged.name.toUpperCase().includes("PHQ")) merged.severity = phq9Severity(merged.score);
      else if (merged.name.toUpperCase().includes("GAD")) merged.severity = gad7Severity(merged.score);
      return merged;
    }));
  }
  function rmScale(ix: number) { setScales(scales.filter((_, i) => i !== ix)); }

  const mse = form.mse || {};
  const risk = form.risk || { suicidality: "none" as RiskLevel, homicidality: "none" as RiskLevel, selfHarm: "none" as RiskLevel };

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/psychiatry", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: s.id, ...form, mse, risk, scales }) });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  }
  async function destroy() {
    if (!confirm("Delete?")) return;
    await fetch("/api/hospital/psychiatry", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: s.id }) });
    onSaved();
  }

  return (
    <Modal title={`${s.id} — ${s.patientName}`} onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SessionStatus })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {Object.entries(SESSION_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Duration (min)"><input type="number" value={form.durationMin ?? ""} onChange={(e) => setForm({ ...form, durationMin: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Next session"><input type="datetime-local" value={form.nextSession || ""} onChange={(e) => setForm({ ...form, nextSession: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Mental Status Exam</div>
        <div className="grid grid-cols-2 gap-2">
          <Small label="Appearance"><input value={mse.appearance || ""} onChange={(e) => setForm({ ...form, mse: { ...mse, appearance: e.target.value } })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
          <Small label="Behavior"><input value={mse.behavior || ""} onChange={(e) => setForm({ ...form, mse: { ...mse, behavior: e.target.value } })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
          <Small label="Mood (subj)"><input value={mse.mood || ""} onChange={(e) => setForm({ ...form, mse: { ...mse, mood: e.target.value } })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
          <Small label="Affect"><input value={mse.affect || ""} onChange={(e) => setForm({ ...form, mse: { ...mse, affect: e.target.value } })} placeholder="flat / blunted / full / labile" className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
          <Small label="Speech"><input value={mse.speech || ""} onChange={(e) => setForm({ ...form, mse: { ...mse, speech: e.target.value } })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
          <Small label="Thought process"><input value={mse.thoughtProcess || ""} onChange={(e) => setForm({ ...form, mse: { ...mse, thoughtProcess: e.target.value } })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
          <Small label="Thought content" full><input value={mse.thoughtContent || ""} onChange={(e) => setForm({ ...form, mse: { ...mse, thoughtContent: e.target.value } })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
          <Small label="Perception"><input value={mse.perception || ""} onChange={(e) => setForm({ ...form, mse: { ...mse, perception: e.target.value } })} placeholder="AH / VH / none" className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
          <Small label="Cognition"><input value={mse.cognition || ""} onChange={(e) => setForm({ ...form, mse: { ...mse, cognition: e.target.value } })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
          <Small label="Insight"><input value={mse.insight || ""} onChange={(e) => setForm({ ...form, mse: { ...mse, insight: e.target.value } })} placeholder="poor / fair / good" className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
          <Small label="Judgment"><input value={mse.judgment || ""} onChange={(e) => setForm({ ...form, mse: { ...mse, judgment: e.target.value } })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/30 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">Risk assessment</div>
        <div className="grid grid-cols-3 gap-2">
          {(["suicidality", "homicidality", "selfHarm"] as const).map((k) => (
            <Small key={k} label={k}>
              <select value={risk[k]} onChange={(e) => setForm({ ...form, risk: { ...risk, [k]: e.target.value as RiskLevel } })} className={`w-full rounded border border-slate-300 px-2 py-1 text-xs ${RISK_COLOR[risk[k]]}`}>
                {RISK_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Small>
          ))}
          <Small label="Plan / intent" full><input value={risk.planOrIntent || ""} onChange={(e) => setForm({ ...form, risk: { ...risk, planOrIntent: e.target.value } })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
          <Small label="Safety plan" full><input value={risk.safetyPlan || ""} onChange={(e) => setForm({ ...form, risk: { ...risk, safetyPlan: e.target.value } })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Scale scores</div>
          <button onClick={addScale} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">+ Add</button>
        </div>
        <div className="space-y-1">
          {scales.map((sc, ix) => (
            <div key={ix} className="grid grid-cols-[120px_70px_70px_1fr_auto] gap-2">
              <input value={sc.name} onChange={(e) => updScale(ix, { name: e.target.value })} className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <input type="number" value={sc.score} onChange={(e) => updScale(ix, { score: Number(e.target.value) })} className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <input type="number" value={sc.maxScore ?? ""} onChange={(e) => updScale(ix, { maxScore: e.target.value ? Number(e.target.value) : undefined })} placeholder="max" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <div className="rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-600">{sc.severity || "—"}</div>
              <button onClick={() => rmScale(ix)} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Diagnoses (ICD/DSM)" full><input value={form.diagnoses || ""} onChange={(e) => setForm({ ...form, diagnoses: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Formulation" full><textarea rows={2} value={form.formulation || ""} onChange={(e) => setForm({ ...form, formulation: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Interventions" full><textarea rows={2} value={form.interventions || ""} onChange={(e) => setForm({ ...form, interventions: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Medications" full><input value={form.medications || ""} onChange={(e) => setForm({ ...form, medications: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Homework" full><input value={form.homework || ""} onChange={(e) => setForm({ ...form, homework: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button onClick={destroy} className="rounded border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50">Delete</button>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Modal>
  );
}

function PlanModal({ patients, onClose, onCreated }: { patients: Patient[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ patientId: "", patientName: "", primaryProvider: "", modality: "cbt" as TherapyModality, frequency: "weekly", sessionCount: "", primaryDiagnosis: "", medications: "", reviewDate: "", notes: "" });
  const [goals, setGoals] = useState<PlanGoal[]>([]);
  const [saving, setSaving] = useState(false);
  function addGoal() { setGoals([...goals, { description: "", status: "in_progress" }]); }
  function updGoal(ix: number, patch: Partial<PlanGoal>) { setGoals(goals.map((g, i) => i === ix ? { ...g, ...patch } : g)); }
  function rmGoal(ix: number) { setGoals(goals.filter((_, i) => i !== ix)); }
  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/psychiatry", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "plan", ...form, sessionCount: form.sessionCount ? Number(form.sessionCount) : undefined, goals }) });
      if (res.ok) onCreated();
    } finally { setSaving(false); }
  }
  return (
    <Modal title="New therapy plan" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => { const p = patients.find((x) => x.id === e.target.value); setForm({ ...form, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : "" }); }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </Field>
        <Field label="Primary provider"><input value={form.primaryProvider} onChange={(e) => setForm({ ...form, primaryProvider: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Modality">
          <select value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value as TherapyModality })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {MODALITIES.map((m) => <option key={m} value={m}>{MODALITY_LABEL[m]}</option>)}
          </select>
        </Field>
        <Field label="Frequency"><input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="weekly / biweekly" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Session count"><input type="number" value={form.sessionCount} onChange={(e) => setForm({ ...form, sessionCount: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Review date"><input type="date" value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Primary diagnosis" full><input value={form.primaryDiagnosis} onChange={(e) => setForm({ ...form, primaryDiagnosis: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Medications" full><input value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Treatment goals</div>
          <button onClick={addGoal} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">+ Add</button>
        </div>
        <div className="space-y-1">
          {goals.map((g, ix) => (
            <div key={ix} className="grid grid-cols-[1fr_1fr_130px_auto] gap-2">
              <input value={g.description} onChange={(e) => updGoal(ix, { description: e.target.value })} placeholder="Goal" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <input value={g.target || ""} onChange={(e) => updGoal(ix, { target: e.target.value })} placeholder="Target / metric" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <select value={g.status || "in_progress"} onChange={(e) => updGoal(ix, { status: e.target.value as PlanGoal["status"] })} className="rounded border border-slate-300 px-2 py-1.5 text-xs">
                <option value="in_progress">in progress</option><option value="achieved">achieved</option><option value="revised">revised</option><option value="dropped">dropped</option>
              </select>
              <button onClick={() => rmGoal(ix)} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">×</button>
            </div>
          ))}
        </div>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} disabled={!form.patientId || !form.primaryProvider} />
    </Modal>
  );
}

function EditPlanModal({ plan, onClose, onSaved }: { plan: TherapyPlan; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<PlanStatus>(plan.status);
  const [reason, setReason] = useState(plan.dischargeReason || "");
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      await fetch("/api/hospital/psychiatry", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "plan", id: plan.id, status, dischargeReason: reason }) });
      onSaved();
    } finally { setSaving(false); }
  }
  return (
    <Modal title={`Manage ${plan.id}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as PlanStatus)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {PLAN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Discharge reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} />
    </Modal>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className={`${wide ? "max-w-5xl" : "max-w-2xl"} w-full rounded-xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "col-span-full" : ""}><label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>{children}</div>;
}
function Small({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "col-span-2" : ""}><label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</label>{children}</div>;
}
function ModalActions({ onClose, onSave, saving, disabled }: { onClose: () => void; onSave: () => void; saving: boolean; disabled?: boolean }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onClose} className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
      <button onClick={onSave} disabled={saving || disabled} className="rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
    </div>
  );
}
