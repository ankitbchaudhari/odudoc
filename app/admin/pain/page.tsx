"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard, TabSwitch } from "@/components/admin/PageShell";
import type { PainAssessment, PainPlan, PainScale, PainType, PainLocation, WhoStep, PlanStatus, InterventionType, PainIntervention } from "@/lib/hospital/pain-store";
// Inlined from pain-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const SCALE_LABEL: Record<PainScale, string> = {
  nrs: "NRS (0-10)", vas: "VAS", wong_baker: "Wong-Baker", flacc: "FLACC", cpot: "CPOT",
};
const STEP_LABEL: Record<WhoStep, string> = {
  step1_nonopioid: "Step 1 — Non-opioid", step2_weak_opioid: "Step 2 — Weak opioid",
  step3_strong_opioid: "Step 3 — Strong opioid", adjuvant_only: "Adjuvant only",
};

interface Patient { id: string; firstName: string; lastName: string; }

const SCALES: PainScale[] = ["nrs", "vas", "wong_baker", "flacc", "cpot"];
const TYPES: PainType[] = ["acute", "chronic", "post_op", "cancer", "neuropathic", "procedural"];
const LOCATIONS: PainLocation[] = ["head", "neck", "chest", "abdomen", "back", "limb", "pelvis", "generalized", "other"];
const STEPS: WhoStep[] = ["step1_nonopioid", "step2_weak_opioid", "step3_strong_opioid", "adjuvant_only"];
const INT_TYPES: InterventionType[] = ["oral", "iv", "im", "sc", "pca", "epidural", "nerve_block", "patch", "non_pharm"];

function scoreColor(score: number): string {
  if (score >= 7) return "bg-rose-100 text-rose-700";
  if (score >= 4) return "bg-amber-100 text-amber-700";
  if (score >= 1) return "bg-sky-100 text-sky-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function PainPage() {
  const [tab, setTab] = useState<"assessments" | "plans">("assessments");
  const [assessments, setAssessments] = useState<PainAssessment[]>([]);
  const [plans, setPlans] = useState<PainPlan[]>([]);
  const [stats, setStats] = useState<{ assessedToday: number; severeWeek: number; avgScoreWeek: number; activePlans: number; strongOpioidPlans: number; overdueReview: number; highSedation: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showAssessment, setShowAssessment] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PainPlan | null>(null);

  async function load() {
    const res = await fetch("/api/hospital/pain", { cache: "no-store" });
    const data = await res.json();
    setAssessments(data.assessments || []);
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
  useEffect(() => { load(); loadPatients(); }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon="🩹"
        eyebrow="Comfort & Care"
        title="Pain Management"
        subtitle="NRS / VAS / Wong-Baker / FLACC / CPOT + WHO analgesic ladder"
        tone="rose"
        primaryAction={{ label: "+ Pain plan", onClick: () => setShowPlan(true) }}
        secondaryAction={{ label: "+ Assessment", onClick: () => setShowAssessment(true) }}
      />

      {stats && (
        <StatGrid cols={7}>
          <StatCard label="Assessed today" value={stats.assessedToday} tone="slate" icon="📋" />
          <StatCard label="Severe / week (≥7)" value={stats.severeWeek} tone="rose" icon="🔥" />
          <StatCard label="Avg score / week" value={stats.avgScoreWeek} tone="amber" icon="📊" />
          <StatCard label="Active plans" value={stats.activePlans} tone="emerald" icon="✓" />
          <StatCard label="Strong opioid" value={stats.strongOpioidPlans} tone="rose" icon="💊" />
          <StatCard label="Overdue review" value={stats.overdueReview} tone="amber" icon="⏰" />
          <StatCard label="High sedation" value={stats.highSedation} tone="fuchsia" icon="⚠️" />
        </StatGrid>
      )}

      <div>
        <TabSwitch
          active={tab}
          onSelect={(k) => setTab(k as "assessments" | "plans")}
          tabs={[
            { key: "assessments", label: "Assessments", count: assessments.length },
            { key: "plans", label: "Pain plans", count: plans.length },
          ]}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {tab === "assessments" ? (
          assessments.length === 0 ? <Empty label="No assessments." /> : (
            <div className="divide-y divide-slate-100">
              {assessments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{a.id}</span>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${scoreColor(a.score)}`}>{SCALE_LABEL[a.scale]} {a.score}</span>
                      {a.painType && <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{a.painType}</span>}
                      {a.location && <span className="rounded bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">{a.location}</span>}
                      {a.sedationScore != null && a.sedationScore >= 3 && <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">SED {a.sedationScore}</span>}
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-900">{a.patientName}</div>
                    <div className="text-sm text-slate-600">{new Date(a.assessedAt).toLocaleString()}{a.assessorName ? ` • by ${a.assessorName}` : ""}</div>
                    {a.quality && <div className="mt-1 text-xs text-slate-500">Quality: {a.quality}{a.radiation ? ` • Radiates to ${a.radiation}` : ""}</div>}
                    {a.notes && <div className="mt-1 text-xs text-slate-600">{a.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          plans.length === 0 ? <Empty label="No pain plans." /> : (
            <div className="divide-y divide-slate-100">
              {plans.map((p) => (
                <div key={p.id} className="flex items-start justify-between p-4 hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{p.id}</span>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : p.status === "completed" ? "bg-slate-100 text-slate-600" : "bg-rose-100 text-rose-700"}`}>{p.status}</span>
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{STEP_LABEL[p.whoStep]}</span>
                      <span className="rounded bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">{p.painType}</span>
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-900">{p.patientName}</div>
                    <div className="text-sm text-slate-600">Rx by {p.prescriberName} • Started {new Date(p.startedAt).toLocaleDateString()}{p.goalScore != null ? ` • Goal ≤ ${p.goalScore}` : ""}</div>
                    {p.interventions.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {p.interventions.map((i, ix) => (
                          <div key={ix} className="text-xs text-slate-700"><span className="font-medium uppercase">{i.type}:</span> {i.detail}{i.frequency ? ` • ${i.frequency}` : ""}</div>
                        ))}
                      </div>
                    )}
                    {p.rescueOrders && <div className="mt-1 text-xs text-slate-600"><span className="font-medium">Rescue:</span> {p.rescueOrders}</div>}
                  </div>
                  <button onClick={() => setEditingPlan(p)} className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Manage</button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showAssessment && <AssessmentModal patients={patients} onClose={() => setShowAssessment(false)} onCreated={() => { setShowAssessment(false); load(); }} />}
      {showPlan && <PlanModal patients={patients} onClose={() => setShowPlan(false)} onCreated={() => { setShowPlan(false); load(); }} />}
      {editingPlan && <EditPlanModal plan={editingPlan} onClose={() => setEditingPlan(null)} onSaved={() => { setEditingPlan(null); load(); }} />}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone: "slate" | "amber" | "rose" | "emerald" }) {
  const tones = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700" };
  return (
    <div className={`rounded-xl border border-slate-200 ${tones[tone]} p-3`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`border-b-2 px-4 py-2 text-sm font-medium transition ${active ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{children}</button>;
}
function Empty({ label }: { label: string }) { return <div className="p-10 text-center text-sm text-slate-400">{label}</div>; }

function AssessmentModal({ patients, onClose, onCreated }: { patients: Patient[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ patientId: "", patientName: "", scale: "nrs" as PainScale, score: 0, location: "" as PainLocation | "", painType: "" as PainType | "", quality: "", assessorName: "", sedationScore: "", notes: "" });
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/pain", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, score: Number(form.score), sedationScore: form.sedationScore ? Number(form.sedationScore) : undefined, location: form.location || undefined, painType: form.painType || undefined }),
      });
      if (res.ok) onCreated();
    } finally { setSaving(false); }
  }
  return (
    <Modal title="New pain assessment" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => { const p = patients.find((x) => x.id === e.target.value); setForm({ ...form, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : "" }); }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </Field>
        <Field label="Assessor"><input value={form.assessorName} onChange={(e) => setForm({ ...form, assessorName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Scale">
          <select value={form.scale} onChange={(e) => setForm({ ...form, scale: e.target.value as PainScale })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {SCALES.map((s) => <option key={s} value={s}>{SCALE_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Score"><input type="number" min={0} max={10} value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Location">
          <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value as PainLocation | "" })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select value={form.painType} onChange={(e) => setForm({ ...form, painType: e.target.value as PainType | "" })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Quality"><input value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })} placeholder="burning / stabbing / throbbing" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Sedation (0-4)"><input type="number" min={0} max={4} value={form.sedationScore} onChange={(e) => setForm({ ...form, sedationScore: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Notes" full><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} disabled={!form.patientId} />
    </Modal>
  );
}

function PlanModal({ patients, onClose, onCreated }: { patients: Patient[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ patientId: "", patientName: "", prescriberName: "", painType: "post_op" as PainType, whoStep: "step1_nonopioid" as WhoStep, goalScore: "", rescueOrders: "", reviewDate: "", notes: "" });
  const [interventions, setInterventions] = useState<PainIntervention[]>([]);
  const [saving, setSaving] = useState(false);

  function addInt() { setInterventions([...interventions, { type: "oral", detail: "", frequency: "" }]); }
  function upd(ix: number, patch: Partial<PainIntervention>) { setInterventions(interventions.map((i, x) => x === ix ? { ...i, ...patch } : i)); }
  function rm(ix: number) { setInterventions(interventions.filter((_, x) => x !== ix)); }

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/pain", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "plan", ...form, goalScore: form.goalScore ? Number(form.goalScore) : undefined, interventions }),
      });
      if (res.ok) onCreated();
    } finally { setSaving(false); }
  }
  return (
    <Modal title="New pain plan" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => { const p = patients.find((x) => x.id === e.target.value); setForm({ ...form, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : "" }); }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </Field>
        <Field label="Prescriber"><input value={form.prescriberName} onChange={(e) => setForm({ ...form, prescriberName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Pain type">
          <select value={form.painType} onChange={(e) => setForm({ ...form, painType: e.target.value as PainType })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="WHO step">
          <select value={form.whoStep} onChange={(e) => setForm({ ...form, whoStep: e.target.value as WhoStep })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {STEPS.map((s) => <option key={s} value={s}>{STEP_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Goal score"><input type="number" value={form.goalScore} onChange={(e) => setForm({ ...form, goalScore: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Review date"><input type="date" value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Interventions</div>
          <button onClick={addInt} className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">+ Add</button>
        </div>
        <div className="space-y-2">
          {interventions.map((i, ix) => (
            <div key={ix} className="grid grid-cols-[120px_1fr_180px_auto] gap-2">
              <select value={i.type} onChange={(e) => upd(ix, { type: e.target.value as InterventionType })} className="rounded border border-slate-300 px-2 py-1.5 text-xs">
                {INT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={i.detail} onChange={(e) => upd(ix, { detail: e.target.value })} placeholder="Paracetamol 1g" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <input value={i.frequency || ""} onChange={(e) => upd(ix, { frequency: e.target.value })} placeholder="q6h PO" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <button onClick={() => rm(ix)} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Rescue orders" full><input value={form.rescueOrders} onChange={(e) => setForm({ ...form, rescueOrders: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} disabled={!form.patientId || !form.prescriberName} />
    </Modal>
  );
}

function EditPlanModal({ plan, onClose, onSaved }: { plan: PainPlan; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<PlanStatus>(plan.status);
  const [reason, setReason] = useState(plan.discontinueReason || "");
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/pain", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: plan.id, status, discontinueReason: reason }) });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  }
  return (
    <Modal title={`Manage ${plan.id}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as PlanStatus)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="active">Active</option><option value="completed">Completed</option><option value="discontinued">Discontinued</option>
          </select>
        </Field>
        <Field label="Reason (if discontinued)"><input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} />
    </Modal>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className={`${wide ? "max-w-4xl" : "max-w-2xl"} w-full rounded-xl bg-white shadow-2xl`}>
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
function ModalActions({ onClose, onSave, saving, disabled }: { onClose: () => void; onSave: () => void; saving: boolean; disabled?: boolean }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onClose} className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
      <button onClick={onSave} disabled={saving || disabled} className="rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
    </div>
  );
}
