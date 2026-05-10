"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard, FilterChip } from "@/components/admin/PageShell";
import type {
  MortalityAudit, AuditStatus, AuditType, Preventability, CareQuality, RCAStatus, ActionItem,
} from "@/lib/hospital/mortality-audit-store";
// Inlined from mortality-audit-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const AUDIT_TYPE_LABEL: Record<AuditType, string> = {
  mortality: "Mortality", morbidity: "Morbidity", sentinel_event: "Sentinel event",
  near_miss: "Near miss", readmission: "Unplanned readmission", return_to_ot: "Return to OT",
  unexpected_icu: "Unexpected ICU escalation", perinatal: "Perinatal", maternal: "Maternal", other: "Other",
};
const STATUS_LABEL: Record<AuditStatus, string> = {
  draft: "Draft", under_review: "Under review", committee_review: "Committee review",
  closed: "Closed", reopened: "Reopened",
};
const PREVENTABILITY_LABEL: Record<Preventability, string> = {
  not_preventable: "Not preventable", possibly_preventable: "Possibly preventable",
  probably_preventable: "Probably preventable", definitely_preventable: "Definitely preventable",
  unknown: "Unknown",
};
const CARE_QUALITY_LABEL: Record<CareQuality, string> = {
  appropriate: "Appropriate", suboptimal_no_harm: "Suboptimal (no harm)",
  suboptimal_harm: "Suboptimal (harm)", unknown: "Unknown",
};
const RCA_STATUS_LABEL: Record<RCAStatus, string> = {
  not_started: "Not started", in_progress: "In progress",
  complete: "Complete", not_applicable: "N/A",
};

interface Patient { id: string; firstName: string; lastName: string; gender?: string; dateOfBirth?: string; }

const TYPES: AuditType[] = ["mortality", "morbidity", "sentinel_event", "near_miss", "readmission", "return_to_ot", "unexpected_icu", "perinatal", "maternal", "other"];
const STATUSES: AuditStatus[] = ["draft", "under_review", "committee_review", "closed", "reopened"];
const PREV: Preventability[] = ["not_preventable", "possibly_preventable", "probably_preventable", "definitely_preventable", "unknown"];
const QUAL: CareQuality[] = ["appropriate", "suboptimal_no_harm", "suboptimal_harm", "unknown"];
const RCAS: RCAStatus[] = ["not_started", "in_progress", "complete", "not_applicable"];
const ACTION_STATUSES: ActionItem["status"][] = ["open", "in_progress", "completed", "cancelled"];

export default function MortalityAuditPage() {
  const [audits, setAudits] = useState<MortalityAudit[]>([]);
  const [stats, setStats] = useState<{ totalAudits: number; mortalityMonth: number; sentinelYtd: number; preventableYtd: number; openActions: number; pendingReview: number; awaitingCommittee: number; closedMonth: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<MortalityAudit | null>(null);
  const [fStatus, setFStatus] = useState<AuditStatus | "">("");
  const [fType, setFType] = useState<AuditType | "">("");

  async function load() {
    const res = await fetch("/api/hospital/mortality-audit", { cache: "no-store" });
    const data = await res.json();
    setAudits(data.audits || []);
    setStats(data.stats || null);
  }
  async function loadPatients() {
    try { const res = await fetch("/api/patients", { cache: "no-store" }); const data = await res.json(); setPatients(data.patients || []); } catch {}
  }
  useEffect(() => { load(); loadPatients(); }, []);

  async function del(id: string) {
    if (!confirm("Delete audit? This is usually not recommended.")) return;
    await fetch("/api/hospital/mortality-audit", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  const filtered = useMemo(
    () => audits.filter((a) => (fStatus ? a.status === fStatus : true)).filter((a) => (fType ? a.auditType === fType : true)),
    [audits, fStatus, fType],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon="⚕️"
        eyebrow="Quality"
        title="Morbidity & Mortality Audit"
        subtitle="Death reviews · Sentinel events · RCA · CAPA (privileged)"
        tone="rose"
        primaryAction={{ label: "+ New audit", onClick: () => { setEdit(null); setShow(true); } }}
      />

      {stats && (
        <StatGrid cols={7}>
          <StatCard label="Total" value={stats.totalAudits} tone="slate" icon="∑" />
          <StatCard label="Mortality (mo)" value={stats.mortalityMonth} tone="rose" icon="💀" />
          <StatCard label="Sentinel (YTD)" value={stats.sentinelYtd} tone="orange" icon="🚨" />
          <StatCard label="Preventable (YTD)" value={stats.preventableYtd} tone="amber" icon="⚠" />
          <StatCard label="Open actions" value={stats.openActions} tone="indigo" icon="○" />
          <StatCard label="Pending review" value={stats.pendingReview} tone="violet" icon="⏳" />
          <StatCard label="Committee queue" value={stats.awaitingCommittee} tone="fuchsia" icon="👥" />
          <StatCard label="Closed (mo)" value={stats.closedMonth} tone="emerald" icon="✓" />
        </StatGrid>
      )}

      <div className="flex flex-wrap gap-2">
        <FilterChip active={fStatus === ""} onClick={() => setFStatus("")}>All status</FilterChip>
        {STATUSES.map((s) => <FilterChip key={s} active={fStatus === s} onClick={() => setFStatus(s)}>{STATUS_LABEL[s]}</FilterChip>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterChip active={fType === ""} onClick={() => setFType("")}>All types</FilterChip>
        {TYPES.map((t) => <FilterChip key={t} active={fType === t} onClick={() => setFType(t)}>{AUDIT_TYPE_LABEL[t]}</FilterChip>)}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Audit</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Event date</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Preventability</th>
              <th className="px-4 py-3">Care quality</th>
              <th className="px-4 py-3">RCA</th>
              <th className="px-4 py-3">Actions</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((a) => {
              const openA = a.actions.filter((x) => x.status === "open" || x.status === "in_progress").length;
              return (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-semibold text-slate-900">{a.id}</div>
                    <div className="text-xs text-slate-500">{a.diagnosisFinal}</div>
                  </td>
                  <td className="px-4 py-3 text-xs"><span className={`rounded px-2 py-0.5 font-semibold ${a.auditType === "sentinel_event" ? "bg-rose-100 text-rose-700" : a.auditType === "mortality" ? "bg-slate-100 text-slate-700" : "bg-indigo-100 text-indigo-700"}`}>{AUDIT_TYPE_LABEL[a.auditType]}</span></td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-semibold text-slate-900">{a.patientName}</div>
                    <div className="text-slate-500">{a.patientAge ? `${a.patientAge}y` : ""}{a.patientGender ? ` / ${a.patientGender[0].toUpperCase()}` : ""}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{new Date(a.eventDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{a.department}<div className="text-slate-500">{a.attendingConsultant}</div></td>
                  <td className="px-4 py-3 text-xs">{a.preventability ? <span className={`rounded px-2 py-0.5 ${a.preventability === "definitely_preventable" || a.preventability === "probably_preventable" ? "bg-rose-100 text-rose-700 font-semibold" : "bg-slate-100 text-slate-700"}`}>{PREVENTABILITY_LABEL[a.preventability]}</span> : "-"}</td>
                  <td className="px-4 py-3 text-xs">{a.careQuality ? <span className={`rounded px-2 py-0.5 ${a.careQuality === "suboptimal_harm" ? "bg-rose-100 text-rose-700 font-semibold" : a.careQuality === "suboptimal_no_harm" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{CARE_QUALITY_LABEL[a.careQuality]}</span> : "-"}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{RCA_STATUS_LABEL[a.rcaStatus]}</td>
                  <td className="px-4 py-3 text-xs"><span className={openA > 0 ? "font-semibold text-amber-700" : "text-slate-500"}>{openA}/{a.actions.length}</span></td>
                  <td className="px-4 py-3"><Pill status={a.status}>{STATUS_LABEL[a.status]}</Pill></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEdit(a); setShow(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                    <button onClick={() => del(a.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={11}><Empty>No audits yet.</Empty></td></tr>}
          </tbody>
        </table>
      </div>

      {show && <AuditModal patients={patients} initial={edit} onClose={() => { setShow(false); setEdit(null); }} onSaved={() => { setShow(false); setEdit(null); load(); }} />}
    </div>
  );
}

function AuditModal({ patients, initial, onClose, onSaved }: { patients: Patient[]; initial: MortalityAudit | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<MortalityAudit>>(
    initial ?? {
      auditType: "mortality", status: "draft", rcaStatus: "not_started",
      confidential: true, eventDate: new Date().toISOString().slice(0, 10),
      actions: [],
    },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function onPatient(id: string) {
    const p = patients.find((x) => x.id === id);
    let age: number | undefined;
    if (p?.dateOfBirth) { age = Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 86400000)); }
    setForm({
      ...form,
      patientId: id,
      patientName: p ? `${p.firstName} ${p.lastName}` : form.patientName,
      patientGender: (p?.gender as MortalityAudit["patientGender"]) || form.patientGender,
      patientAge: age ?? form.patientAge,
    });
  }

  function addAction() {
    const actions = [...(form.actions || [])];
    actions.push({ id: `ac-${Date.now()}-${actions.length}`, action: "", owner: "", status: "open" });
    setForm({ ...form, actions });
  }
  function updAction(i: number, patch: Partial<ActionItem>) {
    const actions = [...(form.actions || [])];
    actions[i] = { ...actions[i], ...patch };
    setForm({ ...form, actions });
  }
  function rmAction(i: number) {
    const actions = [...(form.actions || [])];
    actions.splice(i, 1);
    setForm({ ...form, actions });
  }

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/mortality-audit", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-slate-900">{initial ? "Edit audit" : "New M&M audit"}</h2>
        <p className="mb-4 text-xs text-rose-700">⚠ Privileged peer-review document — confidentiality applies</p>

        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-800">Subject</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Type"><select className="inp" value={form.auditType || "mortality"} onChange={(e) => setForm({ ...form, auditType: e.target.value as AuditType })}>{TYPES.map((t) => <option key={t} value={t}>{AUDIT_TYPE_LABEL[t]}</option>)}</select></Field>
            <Field label="Status"><select className="inp" value={form.status || "draft"} onChange={(e) => setForm({ ...form, status: e.target.value as AuditStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
            <Field label="Event date *"><input type="date" className="inp" value={(form.eventDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} /></Field>
            <Field label="Patient *">
              <select className="inp" value={form.patientId || ""} onChange={(e) => onPatient(e.target.value)}>
                <option value="">-- Select --</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.id})</option>)}
              </select>
            </Field>
            <Field label="Age"><input type="number" className="inp" value={form.patientAge ?? ""} onChange={(e) => setForm({ ...form, patientAge: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
            <Field label="Gender"><select className="inp" value={form.patientGender || ""} onChange={(e) => setForm({ ...form, patientGender: e.target.value as MortalityAudit["patientGender"] })}><option value="">-</option><option>male</option><option>female</option><option>other</option><option>unspecified</option></select></Field>
            <Field label="Admission ID"><input className="inp" value={form.admissionId || ""} onChange={(e) => setForm({ ...form, admissionId: e.target.value })} /></Field>
            <Field label="Admission date"><input type="date" className="inp" value={(form.admissionDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} /></Field>
            <Field label="Department *"><input className="inp" value={form.department || ""} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
            <Field label="Attending consultant *"><input className="inp" value={form.attendingConsultant || ""} onChange={(e) => setForm({ ...form, attendingConsultant: e.target.value })} /></Field>
            <Field label="Final diagnosis *" full><input className="inp" value={form.diagnosisFinal || ""} onChange={(e) => setForm({ ...form, diagnosisFinal: e.target.value })} /></Field>
            <Field label="ICD-10 codes"><input className="inp" value={form.icd10Codes || ""} onChange={(e) => setForm({ ...form, icd10Codes: e.target.value })} /></Field>
            <Field label="Procedure performed"><input className="inp" value={form.procedurePerformed || ""} onChange={(e) => setForm({ ...form, procedurePerformed: e.target.value })} /></Field>
            <Field label="Cause of death"><input className="inp" value={form.causeOfDeath || ""} onChange={(e) => setForm({ ...form, causeOfDeath: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.autopsyPerformed} onChange={(e) => setForm({ ...form, autopsyPerformed: e.target.checked })} /> Autopsy performed</label>
            <Field label="Autopsy findings" full><textarea className="inp" rows={2} value={form.autopsyFindings || ""} onChange={(e) => setForm({ ...form, autopsyFindings: e.target.value })} /></Field>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-800">Committee review</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Committee date"><input type="date" className="inp" value={(form.committeeMeetingDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, committeeMeetingDate: e.target.value })} /></Field>
            <Field label="Chairperson"><input className="inp" value={form.chairperson || ""} onChange={(e) => setForm({ ...form, chairperson: e.target.value })} /></Field>
            <Field label="Reviewed by"><input className="inp" value={form.reviewedBy || ""} onChange={(e) => setForm({ ...form, reviewedBy: e.target.value })} /></Field>
            <Field label="Attendees" full><input className="inp" value={form.attendees || ""} onChange={(e) => setForm({ ...form, attendees: e.target.value })} /></Field>
            <Field label="Preventability"><select className="inp" value={form.preventability || ""} onChange={(e) => setForm({ ...form, preventability: (e.target.value || undefined) as Preventability | undefined })}><option value="">-</option>{PREV.map((p) => <option key={p} value={p}>{PREVENTABILITY_LABEL[p]}</option>)}</select></Field>
            <Field label="Care quality"><select className="inp" value={form.careQuality || ""} onChange={(e) => setForm({ ...form, careQuality: (e.target.value || undefined) as CareQuality | undefined })}><option value="">-</option>{QUAL.map((q) => <option key={q} value={q}>{CARE_QUALITY_LABEL[q]}</option>)}</select></Field>
            <Field label="RCA status"><select className="inp" value={form.rcaStatus || "not_started"} onChange={(e) => setForm({ ...form, rcaStatus: e.target.value as RCAStatus })}>{RCAS.map((r) => <option key={r} value={r}>{RCA_STATUS_LABEL[r]}</option>)}</select></Field>
            <Field label="Contributing factors" full><textarea className="inp" rows={2} value={form.contributingFactors || ""} onChange={(e) => setForm({ ...form, contributingFactors: e.target.value })} /></Field>
            <Field label="Clinical issues" full><textarea className="inp" rows={2} value={form.clinicalIssuesIdentified || ""} onChange={(e) => setForm({ ...form, clinicalIssuesIdentified: e.target.value })} /></Field>
            <Field label="System issues" full><textarea className="inp" rows={2} value={form.systemIssuesIdentified || ""} onChange={(e) => setForm({ ...form, systemIssuesIdentified: e.target.value })} /></Field>
            <Field label="Commendations" full><textarea className="inp" rows={2} value={form.commendations || ""} onChange={(e) => setForm({ ...form, commendations: e.target.value })} /></Field>
            <Field label="Lessons learned" full><textarea className="inp" rows={2} value={form.lessonsLearned || ""} onChange={(e) => setForm({ ...form, lessonsLearned: e.target.value })} /></Field>
            <Field label="Literature reviewed" full><textarea className="inp" rows={2} value={form.literatureReviewed || ""} onChange={(e) => setForm({ ...form, literatureReviewed: e.target.value })} /></Field>
            <Field label="RCA summary" full><textarea className="inp" rows={3} value={form.rcaSummary || ""} onChange={(e) => setForm({ ...form, rcaSummary: e.target.value })} /></Field>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">CAPA / Action items</div>
            <button onClick={addAction} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">+ Add</button>
          </div>
          {(form.actions || []).length === 0 && <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-center text-xs text-slate-500">No actions yet.</div>}
          {(form.actions || []).map((a, i) => (
            <div key={a.id} className="mb-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-white p-2 md:grid-cols-12">
              <input className="inp md:col-span-5" placeholder="Action" value={a.action} onChange={(e) => updAction(i, { action: e.target.value })} />
              <input className="inp md:col-span-2" placeholder="Owner" value={a.owner} onChange={(e) => updAction(i, { owner: e.target.value })} />
              <input type="date" className="inp md:col-span-2" value={a.targetDate || ""} onChange={(e) => updAction(i, { targetDate: e.target.value })} />
              <select className="inp md:col-span-2" value={a.status} onChange={(e) => updAction(i, { status: e.target.value as ActionItem["status"] })}>{ACTION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <button onClick={() => rmAction(i)} className="rounded-lg bg-rose-50 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 md:col-span-1">×</button>
            </div>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.reportableToRegulator} onChange={(e) => setForm({ ...form, reportableToRegulator: e.target.checked })} /> Reportable to regulator</label>
          <Field label="Regulator report ref"><input className="inp" value={form.regulatorReportRef || ""} onChange={(e) => setForm({ ...form, regulatorReportRef: e.target.value })} /></Field>
          <Field label="Reported at"><input type="datetime-local" className="inp" value={(form.reportedToRegulatorAt || "").slice(0, 16)} onChange={(e) => setForm({ ...form, reportedToRegulatorAt: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.familyDebriefed} onChange={(e) => setForm({ ...form, familyDebriefed: e.target.checked })} /> Family debriefed</label>
          <Field label="Family debrief date"><input type="date" className="inp" value={(form.familyDebriefDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, familyDebriefDate: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.confidential} onChange={(e) => setForm({ ...form, confidential: e.target.checked })} /> Confidential (privileged)</label>
          <Field label="Closure remarks" full><textarea className="inp" rows={2} value={form.closureRemarks || ""} onChange={(e) => setForm({ ...form, closureRemarks: e.target.value })} /></Field>
        </div>

        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const t: Record<string, string> = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className={`rounded-xl p-4 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{children}</button>;
}
function Pill({ status, children }: { status: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700", under_review: "bg-amber-100 text-amber-700",
    committee_review: "bg-indigo-100 text-indigo-700", closed: "bg-emerald-100 text-emerald-700",
    reopened: "bg-rose-100 text-rose-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`block ${full ? "md:col-span-3" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-8 text-center text-sm text-slate-500">{children}</div>;
}
