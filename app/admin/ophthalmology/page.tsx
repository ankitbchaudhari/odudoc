"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard, FilterChip } from "@/components/admin/PageShell";
import type { OphthExam, ExamStatus, ExamType, EyeMetrics, LensType } from "@/lib/hospital/ophthalmology-store";
// Inlined from ophthalmology-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  routine: "Routine", refraction: "Refraction", pre_op: "Pre-op",
  post_op: "Post-op", emergency: "Emergency", follow_up: "Follow-up", screening: "Screening",
};
const STATUS_LABEL: Record<ExamStatus, string> = {
  scheduled: "Scheduled", in_progress: "In progress", completed: "Completed",
  referred: "Referred", cancelled: "Cancelled",
};

interface Patient { id: string; firstName: string; lastName: string; }

const STATUSES: ExamStatus[] = ["scheduled", "in_progress", "completed", "referred", "cancelled"];
const EXAM_TYPES: ExamType[] = ["routine", "refraction", "pre_op", "post_op", "emergency", "follow_up", "screening"];
const LENS_TYPES: LensType[] = ["none", "glasses", "rgp", "soft_cl", "toric_cl", "iol_pseudo", "aphakic"];

const STATUS_COLOR: Record<ExamStatus, string> = {
  scheduled: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  referred: "bg-indigo-100 text-indigo-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function OphthPage() {
  const [rows, setRows] = useState<OphthExam[]>([]);
  const [stats, setStats] = useState<{ scheduledToday: number; inProgress: number; completedMonth: number; referralsMonth: number; highIopAlerts: number; suspiciousCdr: number; refractionMonth: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [statusFilter, setStatusFilter] = useState<ExamStatus | "">("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OphthExam | null>(null);

  async function load() {
    const url = statusFilter ? `/api/hospital/ophthalmology?status=${statusFilter}` : "/api/hospital/ophthalmology";
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    setRows(data.exams || []);
    setStats(data.stats || null);
  }
  async function loadPatients() {
    try { const r = await fetch("/api/patients", { cache: "no-store" }); const d = await r.json(); setPatients(d.patients || []); } catch {}
  }
  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { loadPatients(); }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon="👁"
        eyebrow="Vision"
        title="Ophthalmology"
        subtitle="Refraction, IOP, fundus — per-eye exam records"
        tone="indigo"
        primaryAction={{ label: "+ New exam", onClick: () => setShowCreate(true) }}
      />

      {stats && (
        <StatGrid cols={7}>
          <StatCard label="Today" value={stats.scheduledToday} tone="slate" icon="📅" />
          <StatCard label="In progress" value={stats.inProgress} tone="amber" icon="●" />
          <StatCard label="Completed / mo" value={stats.completedMonth} tone="emerald" icon="✓" />
          <StatCard label="Referrals / mo" value={stats.referralsMonth} tone="indigo" icon="↗" />
          <StatCard label="IOP ≥22 alerts" value={stats.highIopAlerts} tone="rose" icon="🚨" />
          <StatCard label="CDR ≥0.6" value={stats.suspiciousCdr} tone="orange" icon="⚠" />
          <StatCard label="Refractions / mo" value={stats.refractionMonth} tone="violet" icon="🔍" />
        </StatGrid>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={statusFilter === ""} onClick={() => setStatusFilter("")}>All</FilterChip>
        {STATUSES.map((s) => <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{STATUS_LABEL[s]}</FilterChip>)}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No exams.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => <ExamRow key={r.id} r={r} onEdit={() => setEditing(r)} />)}
          </div>
        )}
      </div>

      {showCreate && <CreateModal patients={patients} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {editing && <EditModal r={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const tones = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700" };
  return (
    <div className={`rounded-xl border border-slate-200 ${tones[tone]} p-3`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-medium transition ${active ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{children}</button>;
}

function ExamRow({ r, onEdit }: { r: OphthExam; onEdit: () => void }) {
  const iopAlert = (r.od.iopMmhg && r.od.iopMmhg >= 22) || (r.os.iopMmhg && r.os.iopMmhg >= 22);
  return (
    <div className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-slate-500">{r.id}</span>
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{EXAM_TYPE_LABEL[r.examType]}</span>
          {iopAlert && <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">IOP alert</span>}
        </div>
        <div className="mt-1 text-[15px] font-semibold text-slate-900">{r.patientName}</div>
        <div className="text-sm text-slate-600">{new Date(r.examDate).toLocaleString()} • Dr {r.providerName}</div>
        {r.chiefComplaint && <div className="mt-1 text-xs text-slate-600"><span className="font-medium">CC:</span> {r.chiefComplaint}</div>}
        {(r.od.bcva || r.os.bcva || r.od.iopMmhg || r.os.iopMmhg) && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <EyeCard side="OD" m={r.od} />
            <EyeCard side="OS" m={r.os} />
          </div>
        )}
        {r.impression && <div className="mt-1 text-xs text-slate-700"><span className="font-medium">Impression:</span> {r.impression}</div>}
        {r.prescription && <div className="mt-1 font-mono text-xs text-slate-700">Rx: {r.prescription}</div>}
      </div>
      <button onClick={onEdit} className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</button>
    </div>
  );
}

function EyeCard({ side, m }: { side: string; m: EyeMetrics }) {
  const rxParts: string[] = [];
  if (m.sphere != null) rxParts.push(`${m.sphere > 0 ? "+" : ""}${m.sphere}`);
  if (m.cylinder != null) rxParts.push(`${m.cylinder > 0 ? "+" : ""}${m.cylinder} × ${m.axis ?? "?"}`);
  const iopHigh = (m.iopMmhg || 0) >= 22;
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1.5">
      <div className="font-semibold text-slate-700">{side}</div>
      <div className="text-slate-600">
        {m.bcva && <span>BCVA {m.bcva} </span>}
        {rxParts.length > 0 && <span className="font-mono">{rxParts.join(" ")}</span>}
        {m.iopMmhg != null && <span className={iopHigh ? "ml-2 font-semibold text-rose-700" : "ml-2"}>IOP {m.iopMmhg}</span>}
        {m.cupDiscRatio && <span className="ml-2">CDR {m.cupDiscRatio}</span>}
      </div>
    </div>
  );
}

function CreateModal({ patients, onClose, onCreated }: { patients: Patient[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ patientId: "", patientName: "", providerName: "", examDate: "", examType: "routine" as ExamType, chiefComplaint: "", currentLens: "" as LensType | "" });
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/ophthalmology", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, currentLens: form.currentLens || undefined, examDate: form.examDate || undefined }) });
      if (res.ok) onCreated();
    } finally { setSaving(false); }
  }
  return (
    <Modal title="New ophth exam" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => { const p = patients.find((x) => x.id === e.target.value); setForm({ ...form, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : "" }); }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </Field>
        <Field label="Provider"><input value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Exam date"><input type="datetime-local" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Exam type">
          <select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value as ExamType })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {EXAM_TYPES.map((t) => <option key={t} value={t}>{EXAM_TYPE_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="Current lens">
          <select value={form.currentLens} onChange={(e) => setForm({ ...form, currentLens: e.target.value as LensType | "" })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {LENS_TYPES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Chief complaint" full><input value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} disabled={!form.patientId || !form.providerName} />
    </Modal>
  );
}

function EditModal({ r, onClose, onSaved }: { r: OphthExam; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<OphthExam>>(r);
  const [od, setOd] = useState<EyeMetrics>(r.od || {});
  const [os, setOs] = useState<EyeMetrics>(r.os || {});
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/ophthalmology", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: r.id, ...form, od, os }) });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  }
  async function destroy() {
    if (!confirm("Delete this exam?")) return;
    await fetch("/api/hospital/ophthalmology", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: r.id }) });
    onSaved();
  }

  return (
    <Modal title={`${r.id} — ${r.patientName}`} onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ExamStatus })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Exam type">
          <select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value as ExamType })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {EXAM_TYPES.map((t) => <option key={t} value={t}>{EXAM_TYPE_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="Current lens">
          <select value={form.currentLens || ""} onChange={(e) => setForm({ ...form, currentLens: (e.target.value || undefined) as LensType })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {LENS_TYPES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <EyeEditor label="OD (right)" m={od} onChange={setOd} />
        <EyeEditor label="OS (left)" m={os} onChange={setOs} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Pupils / PERRLA"><input value={form.pupils || ""} onChange={(e) => setForm({ ...form, pupils: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Motility (EOM)"><input value={form.motility || ""} onChange={(e) => setForm({ ...form, motility: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Color vision"><input value={form.colorVision || ""} onChange={(e) => setForm({ ...form, colorVision: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Stereopsis"><input value={form.stereopsis || ""} onChange={(e) => setForm({ ...form, stereopsis: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Impression" full><textarea rows={2} value={form.impression || ""} onChange={(e) => setForm({ ...form, impression: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Plan" full><textarea rows={2} value={form.plan || ""} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Spectacle Rx" full><input value={form.prescription || ""} onChange={(e) => setForm({ ...form, prescription: e.target.value })} placeholder="OD -2.00 / -0.50 × 180   OS -1.75 / -0.25 × 170   Add +1.00" className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm" /></Field>
        <Field label="Next review"><input type="date" value={form.nextReviewDate || ""} onChange={(e) => setForm({ ...form, nextReviewDate: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Referral to"><input value={form.referralTo || ""} onChange={(e) => setForm({ ...form, referralTo: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
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

function EyeEditor({ label, m, onChange }: { label: string; m: EyeMetrics; onChange: (m: EyeMetrics) => void }) {
  function set<K extends keyof EyeMetrics>(k: K, v: EyeMetrics[K]) { onChange({ ...m, [k]: v }); }
  function setNum(k: keyof EyeMetrics, v: string) { onChange({ ...m, [k]: v === "" ? undefined : Number(v) } as EyeMetrics); }
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <Small label="UCVA"><input value={m.uncorrectedVa || ""} onChange={(e) => set("uncorrectedVa", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        <Small label="BCVA"><input value={m.bcva || ""} onChange={(e) => set("bcva", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        <Small label="Sphere"><input type="number" step="0.25" value={m.sphere ?? ""} onChange={(e) => setNum("sphere", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        <Small label="Cyl"><input type="number" step="0.25" value={m.cylinder ?? ""} onChange={(e) => setNum("cylinder", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        <Small label="Axis"><input type="number" min={0} max={180} value={m.axis ?? ""} onChange={(e) => setNum("axis", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        <Small label="Add"><input type="number" step="0.25" value={m.add ?? ""} onChange={(e) => setNum("add", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        <Small label="IOP (mmHg)"><input type="number" value={m.iopMmhg ?? ""} onChange={(e) => setNum("iopMmhg", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        <Small label="CDR"><input value={m.cupDiscRatio || ""} onChange={(e) => set("cupDiscRatio", e.target.value)} placeholder="0.4" className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        <Small label="Anterior segment" full><input value={m.anteriorSegment || ""} onChange={(e) => set("anteriorSegment", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        <Small label="Lens / cataract" full><input value={m.lens || ""} onChange={(e) => set("lens", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        <Small label="Fundus" full><input value={m.fundus || ""} onChange={(e) => set("fundus", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
        <Small label="Macula" full><input value={m.macula || ""} onChange={(e) => set("macula", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Small>
      </div>
    </div>
  );
}

function Small({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "col-span-2" : ""}><label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</label>{children}</div>;
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
