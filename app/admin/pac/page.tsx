"use client";

import { useEffect, useState } from "react";
import type { PacAssessment, PacStatus, AsaClass, Mallampati, AnesthesiaPlan } from "@/lib/hospital/pac-store";
// Inlined from pac-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const ASA_LABEL: Record<AsaClass, string> = {
  I: "I — Healthy", II: "II — Mild systemic", III: "III — Severe systemic",
  IV: "IV — Severe / life-threat", V: "V — Moribund", VI: "VI — Brain dead", E: "E — Emergency",
};
const STATUS_LABEL: Record<PacStatus, string> = {
  pending: "Pending", in_review: "In review", cleared: "Cleared",
  deferred: "Deferred", rejected: "Rejected",
};

interface Patient { id: string; firstName: string; lastName: string; }

const STATUSES: PacStatus[] = ["pending", "in_review", "cleared", "deferred", "rejected"];
const ASA_CLASSES: AsaClass[] = ["I", "II", "III", "IV", "V", "VI", "E"];
const MALLAMPATI: Mallampati[] = ["I", "II", "III", "IV"];
const PLANS: AnesthesiaPlan[] = ["general", "regional", "spinal", "epidural", "mac", "local", "combined"];

const STATUS_COLOR: Record<PacStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  in_review: "bg-amber-100 text-amber-700",
  cleared: "bg-emerald-100 text-emerald-700",
  deferred: "bg-orange-100 text-orange-700",
  rejected: "bg-rose-100 text-rose-700",
};

const ASA_COLOR: Record<AsaClass, string> = {
  I: "bg-emerald-50 text-emerald-700",
  II: "bg-sky-50 text-sky-700",
  III: "bg-amber-50 text-amber-700",
  IV: "bg-orange-50 text-orange-700",
  V: "bg-rose-50 text-rose-700",
  VI: "bg-slate-900 text-white",
  E: "bg-rose-600 text-white",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function PacPage() {
  const [rows, setRows] = useState<PacAssessment[]>([]);
  const [stats, setStats] = useState<{ pending: number; inReview: number; clearedMonth: number; deferredMonth: number; rejectedMonth: number; highRisk: number; difficultAirway: number; avgClearHours: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [statusFilter, setStatusFilter] = useState<PacStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<PacAssessment | null>(null);

  async function load() {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/hospital/pac?status=${statusFilter}` : "/api/hospital/pac";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      setRows(data.assessments || []);
      setStats(data.stats || null);
    } finally { setLoading(false); }
  }

  async function loadPatients() {
    try {
      const res = await fetch("/api/patients", { cache: "no-store" });
      const data = await res.json();
      setPatients(data.patients || []);
    } catch {}
  }

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { loadPatients(); }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pre-Anesthesia Check</h1>
          <p className="text-sm text-slate-500">ASA classification, Mallampati airway, NPO + consent gating</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">+ New PAC</button>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <StatTile label="Pending" value={stats.pending} tone="slate" />
          <StatTile label="In review" value={stats.inReview} tone="amber" />
          <StatTile label="Cleared / mo" value={stats.clearedMonth} tone="emerald" />
          <StatTile label="Deferred / mo" value={stats.deferredMonth} tone="amber" />
          <StatTile label="Rejected / mo" value={stats.rejectedMonth} tone="rose" />
          <StatTile label="High risk (ASA III-V)" value={stats.highRisk} tone="rose" />
          <StatTile label="Difficult airway" value={stats.difficultAirway} tone="amber" />
          <StatTile label="Avg clear (h)" value={stats.avgClearHours} tone="slate" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPill active={statusFilter === ""} onClick={() => setStatusFilter("")}>All</FilterPill>
        {STATUSES.map((s) => (
          <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{STATUS_LABEL[s]}</FilterPill>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No PAC assessments.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => (
              <PacRow key={r.id} r={r} onEdit={() => setEditing(r)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateModal patients={patients} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {editing && <EditModal r={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone: "slate" | "amber" | "rose" | "emerald" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className={`rounded-xl border border-slate-200 ${tones[tone]} p-3`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-medium transition ${active ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
      {children}
    </button>
  );
}

function PacRow({ r, onEdit }: { r: PacAssessment; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-500">{r.id}</span>
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
          {r.asaClass && <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${ASA_COLOR[r.asaClass]}`}>ASA {r.asaClass}</span>}
          {r.mallampati && <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">MP {r.mallampati}</span>}
          {r.bmi && <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${r.bmi >= 35 || r.bmi < 18.5 ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-700"}`}>BMI {r.bmi}</span>}
        </div>
        <div className="mt-1 text-[15px] font-semibold text-slate-900">{r.patientName}</div>
        <div className="text-sm text-slate-600">{r.procedureName}{r.surgeryDate ? ` • Surgery: ${fmtDate(r.surgeryDate)}` : ""}</div>
        {r.plannedAnesthesia && <div className="mt-1 text-xs text-slate-500">Plan: {r.plannedAnesthesia.toUpperCase()}{r.anesthetistName ? ` • ${r.anesthetistName}` : ""}</div>}
        {r.recommendation && <div className="mt-1 text-xs text-slate-600"><span className="font-medium">Rec:</span> {r.recommendation}</div>}
        {r.deferReason && <div className="mt-1 text-xs text-orange-700"><span className="font-medium">Deferred:</span> {r.deferReason}</div>}
      </div>
      <button onClick={onEdit} className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Edit / Review</button>
    </div>
  );
}

function CreateModal({ patients, onClose, onCreated }: { patients: Patient[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    patientId: "", patientName: "", procedureName: "", surgeryDate: "",
    anesthetistName: "", heightCm: "", weightKg: "",
    allergies: "", currentMedications: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/pac", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          heightCm: form.heightCm ? Number(form.heightCm) : undefined,
          weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        }),
      });
      if (res.ok) onCreated();
    } finally { setSaving(false); }
  }

  return (
    <Modal title="New PAC assessment" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => {
            const p = patients.find((x) => x.id === e.target.value);
            setForm({ ...form, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : "" });
          }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select patient…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </Field>
        <Field label="Procedure"><input value={form.procedureName} onChange={(e) => setForm({ ...form, procedureName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Surgery date/time"><input type="datetime-local" value={form.surgeryDate} onChange={(e) => setForm({ ...form, surgeryDate: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Anesthetist"><input value={form.anesthetistName} onChange={(e) => setForm({ ...form, anesthetistName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Height (cm)"><input type="number" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Weight (kg)"><input type="number" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Allergies" full><input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Current medications" full><input value={form.currentMedications} onChange={(e) => setForm({ ...form, currentMedications: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} disabled={!form.patientId || !form.procedureName} />
    </Modal>
  );
}

function EditModal({ r, onClose, onSaved }: { r: PacAssessment; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<PacAssessment>>(r);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/pac", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: r.id, ...form }),
      });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  }

  async function destroy() {
    if (!confirm("Delete this PAC assessment?")) return;
    setSaving(true);
    try {
      await fetch("/api/hospital/pac", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: r.id }) });
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <Modal title={`PAC ${r.id} — ${r.patientName}`} onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PacStatus })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="ASA class">
          <select value={form.asaClass || ""} onChange={(e) => setForm({ ...form, asaClass: (e.target.value || undefined) as AsaClass })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {ASA_CLASSES.map((a) => <option key={a} value={a}>{ASA_LABEL[a]}</option>)}
          </select>
        </Field>
        <Field label="Mallampati">
          <select value={form.mallampati || ""} onChange={(e) => setForm({ ...form, mallampati: (e.target.value || undefined) as Mallampati })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {MALLAMPATI.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Planned anesthesia">
          <select value={form.plannedAnesthesia || ""} onChange={(e) => setForm({ ...form, plannedAnesthesia: (e.target.value || undefined) as AnesthesiaPlan })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Mouth opening (cm)"><input type="number" step="0.1" value={form.mouthOpeningCm || ""} onChange={(e) => setForm({ ...form, mouthOpeningCm: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Thyromental (cm)"><input type="number" step="0.1" value={form.thyromentalCm || ""} onChange={(e) => setForm({ ...form, thyromentalCm: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Neck movement">
          <select value={form.neckMovement || ""} onChange={(e) => setForm({ ...form, neckMovement: (e.target.value || undefined) as PacAssessment["neckMovement"] })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option><option value="normal">Normal</option><option value="restricted">Restricted</option>
          </select>
        </Field>
        <Field label="BP systolic"><input type="number" value={form.bpSystolic || ""} onChange={(e) => setForm({ ...form, bpSystolic: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="BP diastolic"><input type="number" value={form.bpDiastolic || ""} onChange={(e) => setForm({ ...form, bpDiastolic: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="HR"><input type="number" value={form.heartRate || ""} onChange={(e) => setForm({ ...form, heartRate: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="SpO₂"><input type="number" value={form.spo2 || ""} onChange={(e) => setForm({ ...form, spo2: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="BMI"><div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{form.bmi ?? "—"}</div></Field>
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Comorbidities</div>
        <div className="grid grid-cols-3 gap-2">
          {(["hypertension", "diabetes", "ihd", "copd", "asthma", "osa", "ckd", "hepaticDisease", "pregnancy"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
              {k}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="NPO solids (h)"><input type="number" value={form.npoSolidsHours || ""} onChange={(e) => setForm({ ...form, npoSolidsHours: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="NPO liquids (h)"><input type="number" value={form.npoLiquidsHours || ""} onChange={(e) => setForm({ ...form, npoLiquidsHours: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.anesthesiaConsent} onChange={(e) => setForm({ ...form, anesthesiaConsent: e.target.checked })} /> Anesthesia consent signed</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.bloodConsent} onChange={(e) => setForm({ ...form, bloodConsent: e.target.checked })} /> Blood product consent</label>
        <Field label="Recommendation" full><textarea rows={2} value={form.recommendation || ""} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Risks" full><textarea rows={2} value={form.risks || ""} onChange={(e) => setForm({ ...form, risks: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Defer reason" full><input value={form.deferReason || ""} onChange={(e) => setForm({ ...form, deferReason: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
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
  return (
    <div className={full ? "col-span-full" : ""}>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onClose, onSave, saving, disabled }: { onClose: () => void; onSave: () => void; saving: boolean; disabled?: boolean }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onClose} className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
      <button onClick={onSave} disabled={saving || disabled} className="rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
    </div>
  );
}
