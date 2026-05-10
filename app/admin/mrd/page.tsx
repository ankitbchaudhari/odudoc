"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard, TabSwitch } from "@/components/admin/PageShell";
import type { ChartRecord, RoiRequest, ChartStatus, RoiStatus, RoiPurpose, IcdCode, DeficiencyType, Deficiency } from "@/lib/hospital/mrd-store";
// Inlined from mrd-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const CHART_STATUS_LABEL: Record<ChartStatus, string> = {
  open: "Open", deficient: "Deficient", coded: "Coded", reviewed: "Reviewed",
  closed: "Closed", amended: "Amended",
};
const ROI_STATUS_LABEL: Record<RoiStatus, string> = {
  requested: "Requested", verifying: "Verifying", approved: "Approved",
  released: "Released", denied: "Denied", cancelled: "Cancelled",
};

interface Patient { id: string; firstName: string; lastName: string; }

const CHART_STATUSES: ChartStatus[] = ["open", "deficient", "coded", "reviewed", "closed", "amended"];
const ROI_STATUSES: RoiStatus[] = ["requested", "verifying", "approved", "released", "denied", "cancelled"];
const ROI_PURPOSES: RoiPurpose[] = ["patient_copy", "insurance", "legal", "continuing_care", "employer", "research", "other"];
const DEFICIENCY_TYPES: DeficiencyType[] = ["missing_discharge_summary", "missing_op_note", "missing_signature", "missing_consent", "missing_pathology", "incomplete_history", "other"];

const STATUS_COLOR: Record<ChartStatus, string> = {
  open: "bg-slate-100 text-slate-700",
  deficient: "bg-rose-100 text-rose-700",
  coded: "bg-sky-100 text-sky-700",
  reviewed: "bg-indigo-100 text-indigo-700",
  closed: "bg-emerald-100 text-emerald-700",
  amended: "bg-amber-100 text-amber-700",
};
const ROI_COLOR: Record<RoiStatus, string> = {
  requested: "bg-slate-100 text-slate-700",
  verifying: "bg-amber-100 text-amber-700",
  approved: "bg-sky-100 text-sky-700",
  released: "bg-emerald-100 text-emerald-700",
  denied: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function MrdPage() {
  const [tab, setTab] = useState<"charts" | "roi">("charts");
  const [charts, setCharts] = useState<ChartRecord[]>([]);
  const [roi, setRoi] = useState<RoiRequest[]>([]);
  const [stats, setStats] = useState<{ openCharts: number; deficientCharts: number; codedThisWeek: number; overdueCoding: number; roiPending: number; roiReleasedMonth: number; roiDeniedMonth: number; avgLosMonth: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [showRoi, setShowRoi] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartRecord | null>(null);
  const [editingRoi, setEditingRoi] = useState<RoiRequest | null>(null);

  async function load() {
    const res = await fetch("/api/hospital/mrd", { cache: "no-store" });
    const data = await res.json();
    setCharts(data.charts || []);
    setRoi(data.roi || []);
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
        icon="📁"
        eyebrow="Health Information"
        title="Medical Records (MRD)"
        subtitle="ICD coding, chart deficiency tracking, release-of-information requests"
        tone="indigo"
        primaryAction={{ label: "+ ROI request", onClick: () => setShowRoi(true) }}
        secondaryAction={{ label: "+ Chart", onClick: () => setShowChart(true) }}
      />

      {stats && (
        <StatGrid cols={4}>
          <StatCard label="Open charts" value={stats.openCharts} tone="slate" icon="📂" />
          <StatCard label="Deficient" value={stats.deficientCharts} tone="rose" icon="⚠️" />
          <StatCard label="Coded / week" value={stats.codedThisWeek} tone="emerald" icon="✓" />
          <StatCard label="Overdue >30d" value={stats.overdueCoding} tone="rose" icon="⏰" />
          <StatCard label="ROI pending" value={stats.roiPending} tone="amber" icon="📨" />
          <StatCard label="Released / mo" value={stats.roiReleasedMonth} tone="emerald" icon="📤" />
          <StatCard label="Denied / mo" value={stats.roiDeniedMonth} tone="rose" icon="🚫" />
          <StatCard label="Avg LOS (d)" value={stats.avgLosMonth} tone="indigo" icon="📊" />
        </StatGrid>
      )}

      <div className="mb-4">
        <TabSwitch
          active={tab}
          onSelect={(k) => setTab(k as "charts" | "roi")}
          tabs={[
            { key: "charts", label: "Charts", count: charts.length },
            { key: "roi", label: "ROI requests", count: roi.length },
          ]}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {tab === "charts" ? (
          charts.length === 0 ? <Empty label="No charts." /> : (
            <div className="divide-y divide-slate-100">
              {charts.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{c.id}</span>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[c.status]}`}>{CHART_STATUS_LABEL[c.status]}</span>
                      {c.codingSystem && <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">{c.codingSystem}</span>}
                      {c.lengthOfStayDays != null && <span className="rounded bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">LOS {c.lengthOfStayDays}d</span>}
                      {c.deficiencies.filter((d) => !d.resolvedAt).length > 0 && <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{c.deficiencies.filter((d) => !d.resolvedAt).length} deficiency</span>}
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-900">{c.patientName}</div>
                    {c.principalDiagnosis && <div className="text-sm text-slate-600">{c.principalDiagnosis}</div>}
                    <div className="text-xs text-slate-500">{c.admissionDate ? `Admit ${new Date(c.admissionDate).toLocaleDateString()}` : ""}{c.dischargeDate ? ` • DC ${new Date(c.dischargeDate).toLocaleDateString()}` : ""}{c.primaryDoctor ? ` • ${c.primaryDoctor}` : ""}{c.department ? ` • ${c.department}` : ""}</div>
                    {c.codes.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.codes.slice(0, 6).map((k, ix) => <span key={ix} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-700">{k.code}</span>)}
                        {c.codes.length > 6 && <span className="text-[11px] text-slate-500">+{c.codes.length - 6}</span>}
                      </div>
                    )}
                    {c.physicalLocation && <div className="mt-1 text-xs text-slate-500">📁 {c.physicalLocation}</div>}
                  </div>
                  <button onClick={() => setEditingChart(c)} className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Code / Review</button>
                </div>
              ))}
            </div>
          )
        ) : (
          roi.length === 0 ? <Empty label="No ROI requests." /> : (
            <div className="divide-y divide-slate-100">
              {roi.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{r.id}</span>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${ROI_COLOR[r.status]}`}>{ROI_STATUS_LABEL[r.status]}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{r.purpose}</span>
                      {r.idVerified && <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">ID ✓</span>}
                      {r.consentVerified && <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">Consent ✓</span>}
                    </div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-900">{r.patientName}</div>
                    <div className="text-sm text-slate-600">Requested by {r.requesterName}{r.requesterRelation ? ` (${r.requesterRelation})` : ""}{r.deliveryMethod ? ` • via ${r.deliveryMethod}` : ""}</div>
                    {r.recordsRequested && <div className="mt-1 text-xs text-slate-600">📄 {r.recordsRequested}</div>}
                    {r.deniedReason && <div className="mt-1 text-xs text-rose-700"><span className="font-medium">Denied:</span> {r.deniedReason}</div>}
                  </div>
                  <button onClick={() => setEditingRoi(r)} className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Manage</button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showChart && <ChartModal patients={patients} onClose={() => setShowChart(false)} onCreated={() => { setShowChart(false); load(); }} />}
      {showRoi && <RoiModal patients={patients} onClose={() => setShowRoi(false)} onCreated={() => { setShowRoi(false); load(); }} />}
      {editingChart && <EditChartModal c={editingChart} onClose={() => setEditingChart(null)} onSaved={() => { setEditingChart(null); load(); }} />}
      {editingRoi && <EditRoiModal r={editingRoi} onClose={() => setEditingRoi(null)} onSaved={() => { setEditingRoi(null); load(); }} />}
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

function ChartModal({ patients, onClose, onCreated }: { patients: Patient[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ patientId: "", patientName: "", admissionDate: "", dischargeDate: "", primaryDoctor: "", department: "", principalDiagnosis: "", physicalLocation: "" });
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/mrd", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) onCreated();
    } finally { setSaving(false); }
  }
  return (
    <Modal title="New chart record" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => { const p = patients.find((x) => x.id === e.target.value); setForm({ ...form, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : "" }); }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </Field>
        <Field label="Primary doctor"><input value={form.primaryDoctor} onChange={(e) => setForm({ ...form, primaryDoctor: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Admission date"><input type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Discharge date"><input type="date" value={form.dischargeDate} onChange={(e) => setForm({ ...form, dischargeDate: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Department"><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Physical location"><input value={form.physicalLocation} onChange={(e) => setForm({ ...form, physicalLocation: e.target.value })} placeholder="Shelf A3 / Rack 12" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Principal diagnosis" full><input value={form.principalDiagnosis} onChange={(e) => setForm({ ...form, principalDiagnosis: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} disabled={!form.patientId} />
    </Modal>
  );
}

function EditChartModal({ c, onClose, onSaved }: { c: ChartRecord; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<ChartRecord>>(c);
  const [codes, setCodes] = useState<IcdCode[]>(c.codes || []);
  const [defs, setDefs] = useState<Deficiency[]>(c.deficiencies || []);
  const [saving, setSaving] = useState(false);

  function addCode() { setCodes([...codes, { code: "", description: "", type: "secondary" }]); }
  function updCode(ix: number, patch: Partial<IcdCode>) { setCodes(codes.map((x, i) => i === ix ? { ...x, ...patch } : x)); }
  function rmCode(ix: number) { setCodes(codes.filter((_, i) => i !== ix)); }
  function addDef() { setDefs([...defs, { type: "other", detail: "" }]); }
  function updDef(ix: number, patch: Partial<Deficiency>) { setDefs(defs.map((x, i) => i === ix ? { ...x, ...patch } : x)); }
  function rmDef(ix: number) { setDefs(defs.filter((_, i) => i !== ix)); }

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/mrd", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: c.id, ...form, codes, deficiencies: defs }) });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  }
  async function destroy() {
    if (!confirm("Delete this chart?")) return;
    await fetch("/api/hospital/mrd", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: c.id }) });
    onSaved();
  }

  return (
    <Modal title={`${c.id} — ${c.patientName}`} onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ChartStatus })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {CHART_STATUSES.map((s) => <option key={s} value={s}>{CHART_STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Coding system">
          <select value={form.codingSystem || ""} onChange={(e) => setForm({ ...form, codingSystem: (e.target.value || undefined) as ChartRecord["codingSystem"] })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option><option value="ICD-10">ICD-10</option><option value="ICD-10-CM">ICD-10-CM</option><option value="ICD-11">ICD-11</option>
          </select>
        </Field>
        <Field label="DRG"><input value={form.drgCode || ""} onChange={(e) => setForm({ ...form, drgCode: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Principal diagnosis" full><input value={form.principalDiagnosis || ""} onChange={(e) => setForm({ ...form, principalDiagnosis: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Coder"><input value={form.coderName || ""} onChange={(e) => setForm({ ...form, coderName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Reviewer"><input value={form.reviewerName || ""} onChange={(e) => setForm({ ...form, reviewerName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Physical loc"><input value={form.physicalLocation || ""} onChange={(e) => setForm({ ...form, physicalLocation: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">ICD codes ({codes.length})</div>
          <button onClick={addCode} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">+ Add</button>
        </div>
        <div className="space-y-1">
          {codes.map((k, ix) => (
            <div key={ix} className="grid grid-cols-[110px_1fr_130px_auto] gap-2">
              <input value={k.code} onChange={(e) => updCode(ix, { code: e.target.value })} placeholder="J18.9" className="rounded border border-slate-300 px-2 py-1.5 font-mono text-xs" />
              <input value={k.description} onChange={(e) => updCode(ix, { description: e.target.value })} placeholder="description" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <select value={k.type || "secondary"} onChange={(e) => updCode(ix, { type: e.target.value as IcdCode["type"] })} className="rounded border border-slate-300 px-2 py-1.5 text-xs">
                <option value="principal">principal</option><option value="secondary">secondary</option><option value="procedure">procedure</option>
              </select>
              <button onClick={() => rmCode(ix)} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Deficiencies ({defs.filter((d) => !d.resolvedAt).length} open)</div>
          <button onClick={addDef} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">+ Add</button>
        </div>
        <div className="space-y-1">
          {defs.map((d, ix) => (
            <div key={ix} className="grid grid-cols-[200px_1fr_100px_auto] gap-2">
              <select value={d.type} onChange={(e) => updDef(ix, { type: e.target.value as DeficiencyType })} className="rounded border border-slate-300 px-2 py-1.5 text-xs">
                {DEFICIENCY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={d.detail || ""} onChange={(e) => updDef(ix, { detail: e.target.value })} className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!d.resolvedAt} onChange={(e) => updDef(ix, { resolvedAt: e.target.checked ? new Date().toISOString() : undefined })} /> resolved</label>
              <button onClick={() => rmDef(ix)} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">×</button>
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

function RoiModal({ patients, onClose, onCreated }: { patients: Patient[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ patientId: "", patientName: "", requesterName: "", requesterRelation: "", purpose: "patient_copy" as RoiPurpose, purposeDetail: "", recordsRequested: "", deliveryMethod: "pickup" as "pickup" | "email" | "courier" | "fax", deliveryTo: "", feeAmount: "" });
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/mrd", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "roi", ...form, feeAmount: form.feeAmount ? Number(form.feeAmount) : undefined }) });
      if (res.ok) onCreated();
    } finally { setSaving(false); }
  }
  return (
    <Modal title="New ROI request" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select value={form.patientId} onChange={(e) => { const p = patients.find((x) => x.id === e.target.value); setForm({ ...form, patientId: e.target.value, patientName: p ? `${p.firstName} ${p.lastName}` : "" }); }} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
          </select>
        </Field>
        <Field label="Requester name"><input value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Relation to patient"><input value={form.requesterRelation} onChange={(e) => setForm({ ...form, requesterRelation: e.target.value })} placeholder="self / spouse / attorney" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Purpose">
          <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value as RoiPurpose })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {ROI_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Delivery method">
          <select value={form.deliveryMethod} onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value as typeof form.deliveryMethod })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="pickup">Pickup</option><option value="email">Email</option><option value="courier">Courier</option><option value="fax">Fax</option>
          </select>
        </Field>
        <Field label="Deliver to"><input value={form.deliveryTo} onChange={(e) => setForm({ ...form, deliveryTo: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Records requested" full><textarea rows={2} value={form.recordsRequested} onChange={(e) => setForm({ ...form, recordsRequested: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <Field label="Fee amount"><input type="number" value={form.feeAmount} onChange={(e) => setForm({ ...form, feeAmount: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} disabled={!form.patientId || !form.requesterName} />
    </Modal>
  );
}

function EditRoiModal({ r, onClose, onSaved }: { r: RoiRequest; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<RoiRequest>>(r);
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/hospital/mrd", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "roi", id: r.id, ...form }) });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  }
  return (
    <Modal title={`${r.id} — ${r.patientName}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RoiStatus })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {ROI_STATUSES.map((s) => <option key={s} value={s}>{ROI_STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Released by"><input value={form.releasedBy || ""} onChange={(e) => setForm({ ...form, releasedBy: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.idVerified} onChange={(e) => setForm({ ...form, idVerified: e.target.checked })} /> ID verified</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.consentVerified} onChange={(e) => setForm({ ...form, consentVerified: e.target.checked })} /> Consent verified</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.feePaid} onChange={(e) => setForm({ ...form, feePaid: e.target.checked })} /> Fee paid</label>
        <Field label="Denied reason" full><input value={form.deniedReason || ""} onChange={(e) => setForm({ ...form, deniedReason: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></Field>
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
