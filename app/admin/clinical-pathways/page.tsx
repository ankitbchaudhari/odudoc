"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard, TabSwitch } from "@/components/admin/PageShell";
import type {
  PathwayDefinition, PathwayEnrollment, PathwayStep, StepProgress,
  PathwayCategory, PathwayStatus, EnrollmentStatus, StepStatus,
} from "@/lib/hospital/clinical-pathways-store";
// Inlined from clinical-pathways-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const CATEGORY_LABEL: Record<PathwayCategory, string> = {
  cardiac: "Cardiac", stroke: "Stroke", sepsis: "Sepsis", trauma: "Trauma",
  obstetric: "Obstetric", neonatal: "Neonatal", oncology: "Oncology",
  surgical: "Surgical", ortho: "Ortho", respiratory: "Respiratory",
  renal: "Renal", mental_health: "Mental health", palliative: "Palliative", other: "Other",
};
const STATUS_LABEL: Record<PathwayStatus, string> = {
  draft: "Draft", active: "Active", retired: "Retired",
};
const ENROLL_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  enrolled: "Enrolled", in_progress: "In progress", completed: "Completed",
  deviated: "Deviated", exited: "Exited", cancelled: "Cancelled",
};
const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  pending: "Pending", done: "Done", skipped: "Skipped",
  not_applicable: "N/A", failed: "Failed",
};

interface Patient { id: string; firstName: string; lastName: string; }

const CATEGORIES: PathwayCategory[] = ["cardiac", "stroke", "sepsis", "trauma", "obstetric", "neonatal", "oncology", "surgical", "ortho", "respiratory", "renal", "mental_health", "palliative", "other"];
const STATUSES: PathwayStatus[] = ["draft", "active", "retired"];
const ENROLL_STATUSES: EnrollmentStatus[] = ["enrolled", "in_progress", "completed", "deviated", "exited", "cancelled"];
const STEP_STATUSES: StepStatus[] = ["pending", "done", "skipped", "not_applicable", "failed"];

export default function ClinicalPathwaysPage() {
  const [tab, setTab] = useState<"pathways" | "enrollments">("pathways");
  const [defs, setDefs] = useState<PathwayDefinition[]>([]);
  const [enrolls, setEnrolls] = useState<PathwayEnrollment[]>([]);
  const [stats, setStats] = useState<{ activeDefinitions: number; draftDefinitions: number; activeEnrollments: number; completedMonth: number; complianceRate: number; deviationsMonth: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showDef, setShowDef] = useState(false);
  const [showEnr, setShowEnr] = useState(false);
  const [editDef, setEditDef] = useState<PathwayDefinition | null>(null);
  const [editEnr, setEditEnr] = useState<PathwayEnrollment | null>(null);
  const [fStatus, setFStatus] = useState<PathwayStatus | "">("");

  async function load() {
    const res = await fetch("/api/hospital/clinical-pathways", { cache: "no-store" });
    const data = await res.json();
    setDefs(data.definitions || []);
    setEnrolls(data.enrollments || []);
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

  async function del(id: string, kind?: string) {
    if (!confirm("Delete?")) return;
    await fetch("/api/hospital/clinical-pathways", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind }) });
    load();
  }

  const filteredDefs = useMemo(() => defs.filter((d) => (fStatus ? d.status === fStatus : true)), [defs, fStatus]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon="📋"
        eyebrow="Protocols"
        title="Clinical Pathways"
        subtitle="Evidence-based protocols · Enrollment · Step compliance"
        tone="emerald"
        secondaryAction={{ label: "+ Pathway", onClick: () => { setEditDef(null); setShowDef(true); } }}
        primaryAction={{ label: "+ Enrollment", onClick: () => { setEditEnr(null); setShowEnr(true); } }}
      />

      {stats && (
        <StatGrid cols={6}>
          <StatCard label="Active pathways" value={stats.activeDefinitions} tone="emerald" icon="✓" />
          <StatCard label="Drafts" value={stats.draftDefinitions} tone="amber" icon="✎" />
          <StatCard label="Active enrollments" value={stats.activeEnrollments} tone="indigo" icon="●" />
          <StatCard label="Completed (mo)" value={stats.completedMonth} tone="teal" icon="🏁" />
          <StatCard label="Compliance %" value={stats.complianceRate} tone="violet" icon="%" />
          <StatCard label="Deviations (mo)" value={stats.deviationsMonth} tone="rose" icon="⚠" />
        </StatGrid>
      )}

      <TabSwitch
        active={tab}
        onSelect={(k) => setTab(k as "pathways" | "enrollments")}
        tabs={[
          { key: "pathways", label: "Pathways", count: defs.length },
          { key: "enrollments", label: "Enrollments", count: enrolls.length },
        ]}
      />

      {tab === "pathways" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterPill active={fStatus === ""} onClick={() => setFStatus("")}>All</FilterPill>
            {STATUSES.map((s) => <FilterPill key={s} active={fStatus === s} onClick={() => setFStatus(s)}>{STATUS_LABEL[s]}</FilterPill>)}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Pathway</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Effective</th>
                  <th className="px-4 py-3">Steps</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDefs.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{d.title}</div>
                      <div className="text-xs text-slate-500">{d.code} · {d.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{CATEGORY_LABEL[d.category]}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{d.version}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{new Date(d.effectiveFrom).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{d.steps.length} ({d.steps.filter((s) => s.mandatory).length} mand.)</td>
                    <td className="px-4 py-3"><Pill status={d.status}>{STATUS_LABEL[d.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditDef(d); setShowDef(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => del(d.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredDefs.length === 0 && <tr><td colSpan={7}><Empty>No pathways yet.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "enrollments" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Pathway</th>
                <th className="px-4 py-3">Enrolled</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Deviations</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrolls.map((e) => {
                const done = e.steps.filter((s) => s.status === "done").length;
                const total = e.steps.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{e.patientName}</div>
                      <div className="text-xs text-slate-500">{e.id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{e.pathwayTitle}</div>
                      <div className="text-xs text-slate-500">{e.pathwayCode}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{new Date(e.enrolledAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded bg-slate-100"><div className="h-2 rounded bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                        <span className="text-xs text-slate-600">{done}/{total}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs"><span className={e.deviationCount > 0 ? "font-semibold text-rose-700" : "text-slate-500"}>{e.deviationCount}</span></td>
                    <td className="px-4 py-3"><Pill status={e.status}>{ENROLL_STATUS_LABEL[e.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditEnr(e); setShowEnr(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => del(e.id, "enrollment")} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                );
              })}
              {enrolls.length === 0 && <tr><td colSpan={7}><Empty>No enrollments yet.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showDef && <DefModal initial={editDef} onClose={() => { setShowDef(false); setEditDef(null); }} onSaved={() => { setShowDef(false); setEditDef(null); load(); }} />}
      {showEnr && <EnrollModal defs={defs} patients={patients} initial={editEnr} onClose={() => { setShowEnr(false); setEditEnr(null); }} onSaved={() => { setShowEnr(false); setEditEnr(null); load(); }} />}
    </div>
  );
}

function DefModal({ initial, onClose, onSaved }: { initial: PathwayDefinition | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<PathwayDefinition>>(
    initial ?? {
      category: "other", status: "draft", version: "v1.0",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      steps: [],
    },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function addStep() {
    const steps = [...(form.steps || [])];
    steps.push({ id: `st-${Date.now()}-${steps.length}`, order: steps.length + 1, phase: "", title: "", mandatory: true });
    setForm({ ...form, steps });
  }
  function updStep(i: number, patch: Partial<PathwayStep>) {
    const steps = [...(form.steps || [])];
    steps[i] = { ...steps[i], ...patch };
    setForm({ ...form, steps });
  }
  function rmStep(i: number) {
    const steps = [...(form.steps || [])];
    steps.splice(i, 1);
    setForm({ ...form, steps });
  }

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/clinical-pathways", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit pathway" : "New pathway"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Code *"><input className="inp" value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="Title *" full><input className="inp" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Category"><select className="inp" value={form.category || "other"} onChange={(e) => setForm({ ...form, category: e.target.value as PathwayCategory })}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></Field>
          <Field label="Version"><input className="inp" value={form.version || ""} onChange={(e) => setForm({ ...form, version: e.target.value })} /></Field>
          <Field label="Status"><select className="inp" value={form.status || "draft"} onChange={(e) => setForm({ ...form, status: e.target.value as PathwayStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Effective from *"><input type="date" className="inp" value={(form.effectiveFrom || "").slice(0, 10)} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} /></Field>
          <Field label="Indication *" full><input className="inp" value={form.indication || ""} onChange={(e) => setForm({ ...form, indication: e.target.value })} /></Field>
          <Field label="Target population"><input className="inp" value={form.targetPopulation || ""} onChange={(e) => setForm({ ...form, targetPopulation: e.target.value })} /></Field>
          <Field label="Owner committee"><input className="inp" value={form.ownerCommittee || ""} onChange={(e) => setForm({ ...form, ownerCommittee: e.target.value })} /></Field>
          <Field label="Key metrics"><input className="inp" value={form.keyMetrics || ""} onChange={(e) => setForm({ ...form, keyMetrics: e.target.value })} /></Field>
          <Field label="Evidence refs" full><textarea className="inp" rows={2} value={form.evidenceRefs || ""} onChange={(e) => setForm({ ...form, evidenceRefs: e.target.value })} /></Field>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Steps</div>
            <button onClick={addStep} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">+ Add step</button>
          </div>
          {(form.steps || []).length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">No steps yet.</div>}
          {(form.steps || []).map((s, i) => (
            <div key={s.id} className="mb-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 md:grid-cols-12">
              <input type="number" className="inp md:col-span-1" placeholder="#" value={s.order} onChange={(e) => updStep(i, { order: Number(e.target.value) || 0 })} />
              <input className="inp md:col-span-2" placeholder="Phase" value={s.phase} onChange={(e) => updStep(i, { phase: e.target.value })} />
              <input className="inp md:col-span-4" placeholder="Title" value={s.title} onChange={(e) => updStep(i, { title: e.target.value })} />
              <input type="number" className="inp md:col-span-2" placeholder="Target min" value={s.targetMinutesFromStart ?? ""} onChange={(e) => updStep(i, { targetMinutesFromStart: e.target.value === "" ? undefined : Number(e.target.value) })} />
              <label className="flex items-center gap-1 text-xs md:col-span-2"><input type="checkbox" checked={s.mandatory} onChange={(e) => updStep(i, { mandatory: e.target.checked })} /> Mandatory</label>
              <button onClick={() => rmStep(i)} className="rounded-lg bg-rose-50 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 md:col-span-1">×</button>
            </div>
          ))}
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

function EnrollModal({ defs, patients, initial, onClose, onSaved }: { defs: PathwayDefinition[]; patients: Patient[]; initial: PathwayEnrollment | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<PathwayEnrollment>>(
    initial ?? { status: "enrolled", steps: [] },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const selectedDef = defs.find((d) => d.id === form.pathwayId);

  function onPatient(id: string) {
    const p = patients.find((x) => x.id === id);
    setForm({ ...form, patientId: id, patientName: p ? `${p.firstName} ${p.lastName}` : form.patientName });
  }
  function updStep(i: number, patch: Partial<StepProgress>) {
    const steps = [...(form.steps || [])];
    steps[i] = { ...steps[i], ...patch };
    setForm({ ...form, steps });
  }

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form, kind: "enrollment" };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/clinical-pathways", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit enrollment" : "New enrollment"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Pathway *">
            <select className="inp" value={form.pathwayId || ""} disabled={!!initial} onChange={(e) => setForm({ ...form, pathwayId: e.target.value, steps: [] })}>
              <option value="">-- Select --</option>
              {defs.filter((d) => d.status === "active" || initial).map((d) => <option key={d.id} value={d.id}>{d.code} · {d.title}</option>)}
            </select>
          </Field>
          <Field label="Patient *">
            <select className="inp" value={form.patientId || ""} onChange={(e) => onPatient(e.target.value)}>
              <option value="">-- Select --</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.id})</option>)}
            </select>
          </Field>
          <Field label="Admission ID"><input className="inp" value={form.admissionId || ""} onChange={(e) => setForm({ ...form, admissionId: e.target.value })} /></Field>
          <Field label="Enrolled by *"><input className="inp" value={form.enrolledBy || ""} onChange={(e) => setForm({ ...form, enrolledBy: e.target.value })} /></Field>
          <Field label="Status"><select className="inp" value={form.status || "enrolled"} onChange={(e) => setForm({ ...form, status: e.target.value as EnrollmentStatus })}>{ENROLL_STATUSES.map((s) => <option key={s} value={s}>{ENROLL_STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Exit reason"><input className="inp" value={form.exitReason || ""} onChange={(e) => setForm({ ...form, exitReason: e.target.value })} /></Field>
          <Field label="Deviation notes" full><textarea className="inp" rows={2} value={form.deviationNotes || ""} onChange={(e) => setForm({ ...form, deviationNotes: e.target.value })} /></Field>
          <Field label="Outcome summary" full><textarea className="inp" rows={2} value={form.outcomeSummary || ""} onChange={(e) => setForm({ ...form, outcomeSummary: e.target.value })} /></Field>
        </div>

        {selectedDef && initial && (form.steps || []).length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-sm font-semibold text-slate-800">Step progress</div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr><th className="px-2 py-2">#</th><th className="px-2 py-2">Step</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Performed at</th><th className="px-2 py-2">By</th><th className="px-2 py-2">Notes</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(form.steps || []).map((sp, i) => {
                    const def = selectedDef.steps.find((x) => x.id === sp.stepId);
                    return (
                      <tr key={sp.stepId}>
                        <td className="px-2 py-1">{def?.order ?? "-"}</td>
                        <td className="px-2 py-1"><div className="font-semibold">{def?.title || sp.stepId}</div><div className="text-slate-500">{def?.phase}{def?.mandatory ? " · MAND" : ""}</div></td>
                        <td className="px-2 py-1"><select className="inp" value={sp.status} onChange={(e) => updStep(i, { status: e.target.value as StepStatus })}>{STEP_STATUSES.map((s) => <option key={s} value={s}>{STEP_STATUS_LABEL[s]}</option>)}</select></td>
                        <td className="px-2 py-1"><input type="datetime-local" className="inp" value={(sp.performedAt || "").slice(0, 16)} onChange={(e) => updStep(i, { performedAt: e.target.value })} /></td>
                        <td className="px-2 py-1"><input className="inp" value={sp.performedBy || ""} onChange={(e) => updStep(i, { performedBy: e.target.value })} /></td>
                        <td className="px-2 py-1"><input className="inp" value={sp.notes || ""} onChange={(e) => updStep(i, { notes: e.target.value })} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{children}</button>;
}
function Pill({ status, children }: { status: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700", active: "bg-emerald-100 text-emerald-700",
    retired: "bg-rose-100 text-rose-700",
    enrolled: "bg-slate-100 text-slate-700", in_progress: "bg-indigo-100 text-indigo-700",
    completed: "bg-emerald-100 text-emerald-700", deviated: "bg-amber-100 text-amber-700",
    exited: "bg-slate-100 text-slate-700", cancelled: "bg-rose-100 text-rose-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-8 text-center text-sm text-slate-500">{children}</div>;
}
