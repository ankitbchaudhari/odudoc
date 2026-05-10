"use client";

import { useEffect, useState } from "react";
import type { Trial, TrialEnrollment, TrialPhase, TrialStatus, EnrollmentStatus, Sponsor } from "@/lib/hospital/ctms-store";
import { PageHero, StatGrid, StatCard, TabSwitch } from "@/components/admin/PageShell";

// Inlined from ctms-store — see documents/page.tsx comment for why.
const PHASE_LABEL: Record<TrialPhase, string> = { preclinical: "Preclinical", phase1: "Phase I", phase2: "Phase II", phase3: "Phase III", phase4: "Phase IV", observational: "Observational", registry: "Registry" };
const TRIAL_STATUS_LABEL: Record<TrialStatus, string> = { planning: "Planning", submitted: "IRB Submitted", approved: "IRB Approved", enrolling: "Enrolling", active: "Active", paused: "Paused", closed: "Closed", terminated: "Terminated", completed: "Completed" };
const ENROLL_STATUS_LABEL: Record<EnrollmentStatus, string> = { screening: "Screening", enrolled: "Enrolled", active: "Active", withdrawn: "Withdrawn", completed: "Completed", screen_failed: "Screen-failed", lost_to_followup: "Lost to F/U" };
const SPONSOR_LABEL: Record<Sponsor, string> = { industry: "Industry", academic: "Academic", government: "Government", investigator: "Investigator", cooperative: "Cooperative" };

interface Patient { id: string; firstName: string; lastName: string; }
const PHASES: TrialPhase[] = ["preclinical", "phase1", "phase2", "phase3", "phase4", "observational", "registry"];
const TRIAL_STATUSES: TrialStatus[] = ["planning", "submitted", "approved", "enrolling", "active", "paused", "closed", "terminated", "completed"];
const ENR_STATUSES: EnrollmentStatus[] = ["screening", "enrolled", "active", "withdrawn", "completed", "screen_failed", "lost_to_followup"];
const SPONSORS: Sponsor[] = ["industry", "academic", "government", "investigator", "cooperative"];

export default function CtmsPage() {
  const [tab, setTab] = useState<"trials" | "enrollments">("trials");
  const [trials, setTrials] = useState<Trial[]>([]);
  const [enrolls, setEnrolls] = useState<TrialEnrollment[]>([]);
  const [stats, setStats] = useState<{ totalTrials: number; activeTrials: number; enrolling: number; totalEnrollments: number; activeSubjects: number; saeCount: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showTrial, setShowTrial] = useState(false);
  const [editTrial, setEditTrial] = useState<Trial | null>(null);
  const [showEnr, setShowEnr] = useState(false);
  const [editEnr, setEditEnr] = useState<TrialEnrollment | null>(null);

  async function load() {
    const res = await fetch("/api/hospital/ctms", { cache: "no-store" });
    const data = await res.json();
    setTrials(data.trials || []); setEnrolls(data.enrollments || []); setStats(data.stats || null);
  }
  async function loadPatients() { try { const r = await fetch("/api/patients", { cache: "no-store" }); const d = await r.json(); setPatients(d.patients || []); } catch {} }
  useEffect(() => { load(); loadPatients(); }, []);

  async function delTrial(id: string) { if (!confirm("Delete trial and all its enrollments?")) return; await fetch("/api/hospital/ctms", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind: "trial" }) }); load(); }
  async function delEnr(id: string) { if (!confirm("Delete?")) return; await fetch("/api/hospital/ctms", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind: "enrollment" }) }); load(); }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon="🧪"
        eyebrow="Research"
        title="Clinical Trials (CTMS)"
        subtitle="Protocols · IRB · Subject enrollments · SAEs"
        tone="violet"
        primaryAction={
          tab === "trials"
            ? { label: "+ Trial", onClick: () => { setEditTrial(null); setShowTrial(true); } }
            : { label: "+ Enrollment", onClick: () => { setEditEnr(null); setShowEnr(true); } }
        }
      />
      {stats && (
        <StatGrid cols={6}>
          <StatCard label="Trials" value={stats.totalTrials} tone="slate" icon="🧪" />
          <StatCard label="Active" value={stats.activeTrials} tone="emerald" icon="✓" />
          <StatCard label="Enrolling" value={stats.enrolling} tone="indigo" icon="↑" />
          <StatCard label="Subjects" value={stats.totalEnrollments} tone="sky" icon="👥" />
          <StatCard label="Active subj." value={stats.activeSubjects} tone="teal" icon="●" />
          <StatCard label="SAEs" value={stats.saeCount} tone="rose" icon="⚠" />
        </StatGrid>
      )}
      <TabSwitch
        active={tab}
        onSelect={(k) => setTab(k as "trials" | "enrollments")}
        tabs={[
          { key: "trials", label: "Trials", count: trials.length },
          { key: "enrollments", label: "Enrollments", count: enrolls.length },
        ]}
      />
      {tab === "trials" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr><th className="px-4 py-3">Protocol</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Phase</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">PI</th><th className="px-4 py-3">Sponsor</th><th className="px-4 py-3">Enroll</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trials.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs"><div>{t.id}</div><div className="text-slate-500">{t.protocolNumber}</div></td>
                  <td className="px-4 py-3 text-xs"><div className="font-semibold max-w-md truncate">{t.title}</div>{t.indication && <div className="text-slate-500">{t.indication}</div>}</td>
                  <td className="px-4 py-3 text-xs">{PHASE_LABEL[t.phase]}</td>
                  <td className="px-4 py-3 text-xs">{TRIAL_STATUS_LABEL[t.status]}</td>
                  <td className="px-4 py-3 text-xs">{t.principalInvestigator}</td>
                  <td className="px-4 py-3 text-xs"><div>{SPONSOR_LABEL[t.sponsorType]}</div>{t.sponsorName && <div className="text-slate-500">{t.sponsorName}</div>}</td>
                  <td className="px-4 py-3 text-xs">{t.currentEnrollment}/{t.targetEnrollment}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => { setEditTrial(t); setShowTrial(true); }} className="mr-2 text-xs font-semibold text-primary-600">Edit</button><button onClick={() => delTrial(t.id)} className="text-xs font-semibold text-rose-600">Delete</button></td>
                </tr>
              ))}
              {trials.length === 0 && <tr><td colSpan={8}><Empty>No trials.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {tab === "enrollments" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Trial</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Arm</th><th className="px-4 py-3">Enrolled</th><th className="px-4 py-3">SAE</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrolls.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs"><div>{e.id}</div><div className="text-slate-500">{e.subjectNumber}</div></td>
                  <td className="px-4 py-3 text-xs">{e.trialProtocol}</td>
                  <td className="px-4 py-3 text-xs">{e.patientName || "-"}</td>
                  <td className="px-4 py-3 text-xs">{ENROLL_STATUS_LABEL[e.status]}</td>
                  <td className="px-4 py-3 text-xs">{e.arm || "-"}</td>
                  <td className="px-4 py-3 text-xs">{e.enrollmentDate ? new Date(e.enrollmentDate).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3 text-xs">{e.saeReported ? <span className="text-rose-600 font-semibold">{e.saeCount}</span> : "-"}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => { setEditEnr(e); setShowEnr(true); }} className="mr-2 text-xs font-semibold text-primary-600">Edit</button><button onClick={() => delEnr(e.id)} className="text-xs font-semibold text-rose-600">Delete</button></td>
                </tr>
              ))}
              {enrolls.length === 0 && <tr><td colSpan={8}><Empty>No enrollments.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showTrial && <TrialModal initial={editTrial} onClose={() => { setShowTrial(false); setEditTrial(null); }} onSaved={() => { setShowTrial(false); setEditTrial(null); load(); }} />}
      {showEnr && <EnrollmentModal trials={trials} patients={patients} initial={editEnr} onClose={() => { setShowEnr(false); setEditEnr(null); }} onSaved={() => { setShowEnr(false); setEditEnr(null); load(); }} />}
    </div>
  );
}

function TrialModal({ initial, onClose, onSaved }: { initial: Trial | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Trial>>(initial ?? { kind: "trial", phase: "phase2", status: "planning", sponsorType: "industry", targetEnrollment: 0 });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form, kind: "trial" };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/ctms", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit trial" : "New trial"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Protocol # *"><input className="inp" value={form.protocolNumber || ""} onChange={(e) => setForm({ ...form, protocolNumber: e.target.value })} /></Field>
          <Field label="Short title"><input className="inp" value={form.shortTitle || ""} onChange={(e) => setForm({ ...form, shortTitle: e.target.value })} /></Field>
          <Field label="Title *" full><input className="inp" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Phase"><select className="inp" value={form.phase || "phase2"} onChange={(e) => setForm({ ...form, phase: e.target.value as TrialPhase })}>{PHASES.map((p) => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}</select></Field>
          <Field label="Status"><select className="inp" value={form.status || "planning"} onChange={(e) => setForm({ ...form, status: e.target.value as TrialStatus })}>{TRIAL_STATUSES.map((s) => <option key={s} value={s}>{TRIAL_STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Sponsor type"><select className="inp" value={form.sponsorType || "industry"} onChange={(e) => setForm({ ...form, sponsorType: e.target.value as Sponsor })}>{SPONSORS.map((s) => <option key={s} value={s}>{SPONSOR_LABEL[s]}</option>)}</select></Field>
          <Field label="Sponsor name"><input className="inp" value={form.sponsorName || ""} onChange={(e) => setForm({ ...form, sponsorName: e.target.value })} /></Field>
          <Field label="Principal investigator *"><input className="inp" value={form.principalInvestigator || ""} onChange={(e) => setForm({ ...form, principalInvestigator: e.target.value })} /></Field>
          <Field label="Coordinator"><input className="inp" value={form.coordinator || ""} onChange={(e) => setForm({ ...form, coordinator: e.target.value })} /></Field>
          <Field label="Therapeutic area"><input className="inp" value={form.therapeuticArea || ""} onChange={(e) => setForm({ ...form, therapeuticArea: e.target.value })} /></Field>
          <Field label="Indication"><input className="inp" value={form.indication || ""} onChange={(e) => setForm({ ...form, indication: e.target.value })} /></Field>
          <Field label="Target enrollment"><input type="number" className="inp" value={form.targetEnrollment ?? 0} onChange={(e) => setForm({ ...form, targetEnrollment: Number(e.target.value) || 0 })} /></Field>
          <Field label="IRB number"><input className="inp" value={form.irbNumber || ""} onChange={(e) => setForm({ ...form, irbNumber: e.target.value })} /></Field>
          <Field label="IRB approval"><input type="date" className="inp" value={(form.irbApprovalDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, irbApprovalDate: e.target.value })} /></Field>
          <Field label="IRB expiry"><input type="date" className="inp" value={(form.irbExpiryDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, irbExpiryDate: e.target.value })} /></Field>
          <Field label="Start date"><input type="date" className="inp" value={(form.startDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="End date"><input type="date" className="inp" value={(form.endDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
          <Field label="ClinicalTrials.gov ID"><input className="inp" value={form.ctgovId || ""} onChange={(e) => setForm({ ...form, ctgovId: e.target.value })} /></Field>
          <Field label="EU-CTR #"><input className="inp" value={form.euCtrNumber || ""} onChange={(e) => setForm({ ...form, euCtrNumber: e.target.value })} /></Field>
          <Field label="Budget total"><input type="number" step="0.01" className="inp" value={form.budgetTotal ?? ""} onChange={(e) => setForm({ ...form, budgetTotal: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Budget spent"><input type="number" step="0.01" className="inp" value={form.budgetSpent ?? ""} onChange={(e) => setForm({ ...form, budgetSpent: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Next monitoring visit"><input type="date" className="inp" value={(form.nextMonitoringVisit || "").slice(0, 10)} onChange={(e) => setForm({ ...form, nextMonitoringVisit: e.target.value })} /></Field>
          <Field label="Notes" full><textarea className="inp" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function EnrollmentModal({ trials, patients, initial, onClose, onSaved }: { trials: Trial[]; patients: Patient[]; initial: TrialEnrollment | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<TrialEnrollment>>(initial ?? { kind: "enrollment", status: "screening", saeReported: false, saeCount: 0, deviationCount: 0 });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  function onPatient(id: string) { const p = patients.find((x) => x.id === id); setForm({ ...form, patientId: id || undefined, patientName: p ? `${p.firstName} ${p.lastName}` : form.patientName }); }
  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form, kind: "enrollment" };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/ctms", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit enrollment" : "New enrollment"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Trial *"><select className="inp" value={form.trialId || ""} onChange={(e) => setForm({ ...form, trialId: e.target.value })} disabled={!!initial}><option value="">-- Select --</option>{trials.map((t) => <option key={t.id} value={t.id}>{t.protocolNumber} - {t.shortTitle || t.title.slice(0, 40)}</option>)}</select></Field>
          <Field label="Subject # *"><input className="inp" value={form.subjectNumber || ""} onChange={(e) => setForm({ ...form, subjectNumber: e.target.value })} /></Field>
          <Field label="Patient"><select className="inp" value={form.patientId || ""} onChange={(e) => onPatient(e.target.value)}><option value="">-- None --</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select></Field>
          <Field label="Status"><select className="inp" value={form.status || "screening"} onChange={(e) => setForm({ ...form, status: e.target.value as EnrollmentStatus })}>{ENR_STATUSES.map((s) => <option key={s} value={s}>{ENROLL_STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Arm / cohort"><input className="inp" value={form.arm || ""} onChange={(e) => setForm({ ...form, arm: e.target.value })} /></Field>
          <Field label="Randomization code"><input className="inp" value={form.randomizationCode || ""} onChange={(e) => setForm({ ...form, randomizationCode: e.target.value })} /></Field>
          <Field label="Screening date"><input type="date" className="inp" value={(form.screeningDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, screeningDate: e.target.value })} /></Field>
          <Field label="Consent date"><input type="date" className="inp" value={(form.consentDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, consentDate: e.target.value })} /></Field>
          <Field label="Enrollment date"><input type="date" className="inp" value={(form.enrollmentDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, enrollmentDate: e.target.value })} /></Field>
          <Field label="Randomization date"><input type="date" className="inp" value={(form.randomizationDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, randomizationDate: e.target.value })} /></Field>
          <Field label="First dose"><input type="date" className="inp" value={(form.firstDoseDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, firstDoseDate: e.target.value })} /></Field>
          <Field label="Last dose"><input type="date" className="inp" value={(form.lastDoseDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, lastDoseDate: e.target.value })} /></Field>
          <Field label="Withdrawal date"><input type="date" className="inp" value={(form.withdrawalDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, withdrawalDate: e.target.value })} /></Field>
          <Field label="Withdrawal reason"><input className="inp" value={form.withdrawalReason || ""} onChange={(e) => setForm({ ...form, withdrawalReason: e.target.value })} /></Field>
          <Field label="Last visit"><input type="date" className="inp" value={(form.lastVisitDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, lastVisitDate: e.target.value })} /></Field>
          <Field label="Next visit"><input type="date" className="inp" value={(form.nextVisitDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, nextVisitDate: e.target.value })} /></Field>
          <Field label="SAE count"><input type="number" className="inp" value={form.saeCount ?? 0} onChange={(e) => setForm({ ...form, saeCount: Number(e.target.value) || 0, saeReported: (Number(e.target.value) || 0) > 0 })} /></Field>
          <Field label="Deviations"><input type="number" className="inp" value={form.deviationCount ?? 0} onChange={(e) => setForm({ ...form, deviationCount: Number(e.target.value) || 0 })} /></Field>
          <Field label="Notes" full><textarea className="inp" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
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
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-primary-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}>{children}</button>; }
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="p-8 text-center text-sm text-slate-500">{children}</div>; }
