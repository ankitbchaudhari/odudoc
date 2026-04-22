"use client";

import { useEffect, useState } from "react";
import type { ChartRecord, TreatmentPlan, ToothFinding, ToothCondition, PlanStatus, PlanProcedure, ProcedureStatus } from "@/lib/hospital/dental-store";
// Inlined from dental-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const CONDITION_LABEL: Record<ToothCondition, string> = {
  healthy: "Healthy", caries: "Caries", filled: "Filled", crown: "Crown",
  rct_done: "RCT done", rct_needed: "RCT needed",
  extracted: "Extracted", missing: "Missing", impacted: "Impacted",
  fractured: "Fractured", mobile: "Mobile", implant: "Implant",
  veneer: "Veneer", bridge_abutment: "Bridge abutment", bridge_pontic: "Bridge pontic",
};
const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  proposed: "Proposed", accepted: "Accepted", in_progress: "In progress",
  completed: "Completed", cancelled: "Cancelled",
};

interface Patient { id: string; firstName: string; lastName: string; }

const PLAN_STATUSES: PlanStatus[] = ["proposed", "accepted", "in_progress", "completed", "cancelled"];
const CONDITIONS: ToothCondition[] = ["healthy", "caries", "filled", "crown", "rct_done", "rct_needed", "extracted", "missing", "impacted", "fractured", "mobile", "implant", "veneer", "bridge_abutment", "bridge_pontic"];

// FDI notation: permanent upper 18-11, 21-28; lower 48-41, 31-38
const UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];
const LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];

const COND_COLOR: Partial<Record<ToothCondition, string>> = {
  healthy: "bg-white border-slate-300",
  caries: "bg-rose-100 border-rose-400 text-rose-700",
  filled: "bg-sky-100 border-sky-400 text-sky-700",
  crown: "bg-amber-100 border-amber-400 text-amber-700",
  rct_done: "bg-indigo-100 border-indigo-400 text-indigo-700",
  rct_needed: "bg-orange-100 border-orange-400 text-orange-700",
  extracted: "bg-slate-200 border-slate-400 text-slate-500 line-through",
  missing: "bg-slate-100 border-slate-300 text-slate-400",
  implant: "bg-emerald-100 border-emerald-400 text-emerald-700",
};

export default function DentalPage() {
  const [tab, setTab] = useState<"charts" | "plans">("charts");
  const [charts, setCharts] = useState<ChartRecord[]>([]);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [stats, setStats] = useState<{ chartsMonth: number; activePlans: number; proposedPlans: number; completedMonth: number; revenueMonth: number; cariesFindings: number; extractions: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartRecord | null>(null);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlan | null>(null);

  async function load() {
    const res = await fetch("/api/hospital/dental", { cache: "no-store" });
    const d = await res.json();
    setCharts(d.charts || []);
    setPlans(d.plans || []);
    setStats(d.stats || null);
  }
  async function loadPatients() { try { const r = await fetch("/api/patients", { cache: "no-store" }); const d = await r.json(); setPatients(d.patients || []); } catch {} }
  useEffect(() => { load(); loadPatients(); }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dental</h1>
          <p className="text-sm text-slate-500">FDI tooth chart • treatment plans with per-tooth procedures</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowChart(true)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Chart exam</button>
          <button onClick={() => setShowPlan(true)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Treatment plan</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <StatTile label="Charts / mo" value={stats.chartsMonth} tone="slate" />
          <StatTile label="Proposed" value={stats.proposedPlans} tone="amber" />
          <StatTile label="Active plans" value={stats.activePlans} tone="emerald" />
          <StatTile label="Completed / mo" value={stats.completedMonth} tone="emerald" />
          <StatTile label="Revenue / mo" value={`₹${stats.revenueMonth.toLocaleString()}`} tone="indigo" />
          <StatTile label="Caries + RCT needed" value={stats.cariesFindings} tone="rose" />
          <StatTile label="Extractions" value={stats.extractions} tone="slate" />
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 border-b border-slate-200">
        <TabBtn active={tab === "charts"} onClick={() => setTab("charts")}>Chart exams ({charts.length})</TabBtn>
        <TabBtn active={tab === "plans"} onClick={() => setTab("plans")}>Treatment plans ({plans.length})</TabBtn>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {tab === "charts" ? (
          charts.length === 0 ? <Empty label="No chart exams." /> : (
            <div className="divide-y divide-slate-100">
              {charts.map((c) => (
                <div key={c.id} className="flex items-start justify-between p-4 hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{c.id}</span>
                      {c.ohi && <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${c.ohi === "good" ? "bg-emerald-100 text-emerald-700" : c.ohi === "fair" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>OHI {c.ohi}</span>}
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{c.findings.length} findings</span>
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-900">{c.patientName}</div>
                    <div className="text-sm text-slate-600">{new Date(c.examDate).toLocaleDateString()} • Dr {c.dentistName}</div>
                    {c.chiefComplaint && <div className="mt-1 text-xs text-slate-600"><span className="font-medium">CC:</span> {c.chiefComplaint}</div>}
                    {c.diagnosis && <div className="mt-1 text-xs text-slate-700"><span className="font-medium">Dx:</span> {c.diagnosis}</div>}
                    {c.findings.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.findings.slice(0, 10).map((f, ix) => (
                          <span key={ix} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]"><span className="font-mono font-semibold">{f.fdi}</span> {CONDITION_LABEL[f.condition]}</span>
                        ))}
                        {c.findings.length > 10 && <span className="text-[11px] text-slate-500">+{c.findings.length - 10}</span>}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setEditingChart(c)} className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Chart</button>
                </div>
              ))}
            </div>
          )
        ) : (
          plans.length === 0 ? <Empty label="No treatment plans." /> : (
            <div className="divide-y divide-slate-100">
              {plans.map((p) => (
                <div key={p.id} className="flex items-start justify-between p-4 hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{p.id}</span>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${p.status === "accepted" || p.status === "in_progress" ? "bg-emerald-100 text-emerald-700" : p.status === "completed" ? "bg-sky-100 text-sky-700" : p.status === "cancelled" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{PLAN_STATUS_LABEL[p.status]}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{p.procedures.length} procedures</span>
                      {p.consentSigned && <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">Consent ✓</span>}
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-900">{p.patientName}</div>
                    <div className="text-sm text-slate-600">Dr {p.dentistName} • {new Date(p.createdDate).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-500">Est ₹{(p.estimatedCost || 0).toLocaleString()} • Actual ₹{(p.actualCost || 0).toLocaleString()}</div>
                    {p.procedures.slice(0, 4).map((pr, ix) => (
                      <div key={ix} className="mt-0.5 text-xs"><span className={`font-medium ${pr.status === "done" ? "text-emerald-700" : pr.status === "cancelled" ? "text-slate-400 line-through" : "text-slate-700"}`}>{pr.toothFdi ? `#${pr.toothFdi} ` : ""}{pr.name}</span>{pr.cost ? ` • ₹${pr.cost}` : ""} • {pr.status}</div>
                    ))}
                    {p.procedures.length > 4 && <div className="text-xs text-slate-500">+{p.procedures.length - 4} more</div>}
                  </div>
                  <button onClick={() => setEditingPlan(p)} className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Manage</button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showChart && <ChartModal patients={patients} onClose={() => setShowChart(false)} onCreated={() => { setShowChart(false); load(); }} />}
      {showPlan && <PlanModal patients={patients} onClose={() => setShowPlan(false)} onCreated={() => { setShowPlan(false); load(); }} />}
      {editingChart && <EditChartModal c={editingChart} onClose={() => setEditingChart(null)} onSaved={() => { setEditingChart(null); load(); }} />}
      {editingPlan && <EditPlanModal plan={editingPlan} onClose={() => setEditingPlan(null)} onSaved={() => { setEditingPlan(null); load(); }} />}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const tones = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className={`rounded-xl border border-slate-200 ${tones[tone]} p-3`}><div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`border-b-2 px-4 py-2 text-sm font-medium transition ${active ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{children}</button>;
}
function Empty({ label }: { label: string }) { return <div className="p-10 text-center text-sm text-slate-400">{label}</div>; }

function ChartModal({ patients, onClose, onCreated }: { patients: Patient[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ patientId: "", patientName: "", dentistName: "", examDate: "", chiefComplaint: "" });
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/dental", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) onCreated();
    } finally { setSaving(false); }
  }
  return (
    <Modal title="New chart exam" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => { const p = patients.find((x) => x.id === e.target.value); setForm({ ...form, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : "" }); }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </Field>
        <Field label="Dentist"><input value={form.dentistName} onChange={(e) => setForm({ ...form, dentistName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Exam date"><input type="datetime-local" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Chief complaint" full><input value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} disabled={!form.patientId || !form.dentistName} />
    </Modal>
  );
}

function EditChartModal({ c, onClose, onSaved }: { c: ChartRecord; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<ChartRecord>>(c);
  const [findings, setFindings] = useState<ToothFinding[]>(c.findings || []);
  const [saving, setSaving] = useState(false);

  function setTooth(fdi: string, condition: ToothCondition) {
    const ix = findings.findIndex((f) => f.fdi === fdi);
    if (condition === "healthy" && ix >= 0) setFindings(findings.filter((_, i) => i !== ix));
    else if (ix >= 0) setFindings(findings.map((f, i) => i === ix ? { ...f, condition } : f));
    else setFindings([...findings, { fdi, condition }]);
  }
  function getTooth(fdi: string): ToothCondition {
    return findings.find((f) => f.fdi === fdi)?.condition || "healthy";
  }

  const [cycleCondition, setCycleCondition] = useState<ToothCondition>("caries");
  function click(fdi: string) {
    const cur = getTooth(fdi);
    if (cur === cycleCondition) setTooth(fdi, "healthy");
    else setTooth(fdi, cycleCondition);
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/dental", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: c.id, ...form, findings }) });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  }
  async function destroy() {
    if (!confirm("Delete this chart?")) return;
    await fetch("/api/hospital/dental", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: c.id }) });
    onSaved();
  }

  return (
    <Modal title={`${c.id} — ${c.patientName}`} onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600">Click tooth to mark:</span>
        <select value={cycleCondition} onChange={(e) => setCycleCondition(e.target.value as ToothCondition)} className="rounded border border-slate-300 px-2 py-1 text-xs">
          {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Upper</div>
        <div className="mt-1 flex justify-center gap-0.5">
          {[...UPPER_RIGHT, ...UPPER_LEFT].map((fdi) => {
            const cond = getTooth(fdi);
            return (
              <button key={fdi} onClick={() => click(fdi)} className={`flex h-10 w-10 flex-col items-center justify-center rounded border-2 text-[10px] font-mono transition ${COND_COLOR[cond] || "bg-slate-100 border-slate-300"}`} title={`${fdi} — ${CONDITION_LABEL[cond]}`}>
                <span className="font-semibold">{fdi}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-center text-[10px] text-slate-400">— midline —</div>
        <div className="mt-1 flex justify-center gap-0.5">
          {[...LOWER_RIGHT, ...LOWER_LEFT].map((fdi) => {
            const cond = getTooth(fdi);
            return (
              <button key={fdi} onClick={() => click(fdi)} className={`flex h-10 w-10 flex-col items-center justify-center rounded border-2 text-[10px] font-mono transition ${COND_COLOR[cond] || "bg-slate-100 border-slate-300"}`} title={`${fdi} — ${CONDITION_LABEL[cond]}`}>
                <span className="font-semibold">{fdi}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">Lower</div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Field label="Oral hygiene">
          <select value={form.ohi || ""} onChange={(e) => setForm({ ...form, ohi: (e.target.value || undefined) as ChartRecord["ohi"] })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option>
          </select>
        </Field>
        <Field label="Plaque index (0-3)"><input type="number" step="0.1" value={form.plaqueIndex ?? ""} onChange={(e) => setForm({ ...form, plaqueIndex: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="BOP (%)"><input type="number" value={form.bleedingOnProbing ?? ""} onChange={(e) => setForm({ ...form, bleedingOnProbing: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Occlusion"><input value={form.occlusion || ""} onChange={(e) => setForm({ ...form, occlusion: e.target.value })} placeholder="Angle Class I" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Imaging"><input value={form.imaging || ""} onChange={(e) => setForm({ ...form, imaging: e.target.value })} placeholder="OPG / IOPA" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Diagnosis" full><input value={form.diagnosis || ""} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Notes" full><textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
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
  const [form, setForm] = useState({ patientId: "", patientName: "", dentistName: "", phases: "", consentSigned: false, notes: "" });
  const [procs, setProcs] = useState<PlanProcedure[]>([]);
  const [saving, setSaving] = useState(false);
  function addP() { setProcs([...procs, { name: "", toothFdi: "", cost: 0, status: "planned" }]); }
  function updP(ix: number, patch: Partial<PlanProcedure>) { setProcs(procs.map((p, i) => i === ix ? { ...p, ...patch } : p)); }
  function rmP(ix: number) { setProcs(procs.filter((_, i) => i !== ix)); }
  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/dental", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "plan", ...form, procedures: procs }) });
      if (res.ok) onCreated();
    } finally { setSaving(false); }
  }
  return (
    <Modal title="New treatment plan" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => { const p = patients.find((x) => x.id === e.target.value); setForm({ ...form, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : "" }); }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </Field>
        <Field label="Dentist"><input value={form.dentistName} onChange={(e) => setForm({ ...form, dentistName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Phases" full><input value={form.phases} onChange={(e) => setForm({ ...form, phases: e.target.value })} placeholder="Phase 1: Restorative • Phase 2: Ortho" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Procedures</div>
          <button onClick={addP} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">+ Add</button>
        </div>
        <div className="space-y-2">
          {procs.map((pr, ix) => (
            <div key={ix} className="grid grid-cols-[80px_1fr_90px_110px_auto] gap-2">
              <input value={pr.toothFdi || ""} onChange={(e) => updP(ix, { toothFdi: e.target.value })} placeholder="#36" className="rounded border border-slate-300 px-2 py-1.5 font-mono text-xs" />
              <input value={pr.name} onChange={(e) => updP(ix, { name: e.target.value })} placeholder="Composite restoration" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <input type="number" value={pr.cost ?? ""} onChange={(e) => updP(ix, { cost: e.target.value ? Number(e.target.value) : 0 })} placeholder="₹" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <select value={pr.status} onChange={(e) => updP(ix, { status: e.target.value as ProcedureStatus })} className="rounded border border-slate-300 px-2 py-1.5 text-xs">
                <option value="planned">Planned</option><option value="done">Done</option><option value="cancelled">Cancelled</option>
              </select>
              <button onClick={() => rmP(ix)} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.consentSigned} onChange={(e) => setForm({ ...form, consentSigned: e.target.checked })} /> Consent signed</label>
        <Field label="Notes" full><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} disabled={!form.patientId || !form.dentistName} />
    </Modal>
  );
}

function EditPlanModal({ plan, onClose, onSaved }: { plan: TreatmentPlan; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<TreatmentPlan>>(plan);
  const [procs, setProcs] = useState<PlanProcedure[]>(plan.procedures || []);
  const [saving, setSaving] = useState(false);
  function updP(ix: number, patch: Partial<PlanProcedure>) { setProcs(procs.map((p, i) => i === ix ? { ...p, ...patch } : p)); }
  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/dental", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "plan", id: plan.id, ...form, procedures: procs }) });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  }
  async function destroy() {
    if (!confirm("Delete?")) return;
    await fetch("/api/hospital/dental", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "plan", id: plan.id }) });
    onSaved();
  }
  return (
    <Modal title={`${plan.id} — ${plan.patientName}`} onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PlanStatus })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {PLAN_STATUSES.map((s) => <option key={s} value={s}>{PLAN_STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Estimated"><div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">₹{(form.estimatedCost || 0).toLocaleString()}</div></Field>
        <Field label="Actual (auto)"><div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">₹{(form.actualCost || 0).toLocaleString()}</div></Field>
      </div>
      <div className="mt-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Procedures</div>
        <div className="space-y-1">
          {procs.map((pr, ix) => (
            <div key={ix} className="grid grid-cols-[70px_1fr_90px_110px] gap-2">
              <input value={pr.toothFdi || ""} onChange={(e) => updP(ix, { toothFdi: e.target.value })} className="rounded border border-slate-300 px-2 py-1.5 font-mono text-xs" />
              <input value={pr.name} onChange={(e) => updP(ix, { name: e.target.value })} className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <input type="number" value={pr.cost ?? 0} onChange={(e) => updP(ix, { cost: Number(e.target.value) })} className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <select value={pr.status} onChange={(e) => updP(ix, { status: e.target.value as ProcedureStatus })} className="rounded border border-slate-300 px-2 py-1.5 text-xs">
                <option value="planned">Planned</option><option value="done">Done</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
          ))}
        </div>
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
function ModalActions({ onClose, onSave, saving, disabled }: { onClose: () => void; onSave: () => void; saving: boolean; disabled?: boolean }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onClose} className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
      <button onClick={onSave} disabled={saving || disabled} className="rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
    </div>
  );
}
