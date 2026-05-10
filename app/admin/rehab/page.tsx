"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard, TabSwitch } from "@/components/admin/PageShell";
import type {
  RehabEpisode, RehabSession, RehabDiscipline, EpisodeCategory,
  EpisodeStatus, SessionStatus, FunctionalGoal, FimScore,
} from "@/lib/hospital/rehab-store";
// Inlined from rehab-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const DISCIPLINE_LABEL: Record<RehabDiscipline, string> = {
  pt: "Physical therapy", ot: "Occupational therapy", st: "Speech therapy",
  pm_r: "Physiatry (PM&R)", prosthetics: "Prosthetics", orthotics: "Orthotics",
  vocational: "Vocational", recreational: "Recreational",
};
const CATEGORY_LABEL: Record<EpisodeCategory, string> = {
  neuro: "Neurological", ortho: "Orthopedic", cardiac: "Cardiac",
  pulmonary: "Pulmonary", pediatric: "Pediatric", geriatric: "Geriatric",
  spinal_cord: "Spinal cord injury", amputee: "Amputee", post_op: "Post-op", other: "Other",
};
const EP_STATUS_LABEL: Record<EpisodeStatus, string> = {
  referred: "Referred", intake: "Intake", active: "Active",
  on_hold: "On hold", discharged: "Discharged", cancelled: "Cancelled",
};
const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: "Scheduled", completed: "Completed", missed: "Missed", cancelled: "Cancelled",
};
function fimTotal(f?: FimScore): number {
  if (!f) return 0;
  const ks: (keyof FimScore)[] = [
    "eating", "grooming", "bathing", "upperBodyDressing", "lowerBodyDressing",
    "toileting", "bladder", "bowel", "bedToChairTransfer", "toiletTransfer",
    "tubTransfer", "walkWheelchair", "stairs", "comprehension", "expression",
    "socialInteraction", "problemSolving", "memory",
  ];
  return ks.reduce((s, k) => s + (Number(f[k]) || 0), 0);
}

interface Patient { id: string; firstName: string; lastName: string; }

const DISCIPLINES: RehabDiscipline[] = ["pt", "ot", "st", "pm_r", "prosthetics", "orthotics", "vocational", "recreational"];
const CATEGORIES: EpisodeCategory[] = ["neuro", "ortho", "cardiac", "pulmonary", "pediatric", "geriatric", "spinal_cord", "amputee", "post_op", "other"];
const EP_STATUSES: EpisodeStatus[] = ["referred", "intake", "active", "on_hold", "discharged", "cancelled"];
const SN_STATUSES: SessionStatus[] = ["scheduled", "completed", "missed", "cancelled"];

export default function RehabPage() {
  const [tab, setTab] = useState<"episodes" | "sessions">("episodes");
  const [episodes, setEpisodes] = useState<RehabEpisode[]>([]);
  const [sessions, setSessions] = useState<RehabSession[]>([]);
  const [stats, setStats] = useState<{ activeEpisodes: number; pendingIntake: number; onHold: number; dischargedMonth: number; sessionsToday: number; completedWeek: number; missedWeek: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showEp, setShowEp] = useState(false);
  const [showSn, setShowSn] = useState(false);
  const [editEp, setEditEp] = useState<RehabEpisode | null>(null);
  const [editSn, setEditSn] = useState<RehabSession | null>(null);

  async function load() {
    const res = await fetch("/api/hospital/rehab", { cache: "no-store" });
    const data = await res.json();
    setEpisodes(data.episodes || []);
    setSessions(data.sessions || []);
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

  async function removeEp(id: string) {
    if (!confirm("Delete episode and all its sessions?")) return;
    await fetch("/api/hospital/rehab", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  async function removeSn(id: string) {
    if (!confirm("Delete session?")) return;
    await fetch("/api/hospital/rehab", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind: "session" }) });
    load();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon="🏃"
        eyebrow="Therapy"
        title="Rehabilitation (PM&R)"
        subtitle="PT / OT / ST episodes, FIM tracking, functional goals, sessions"
        tone="emerald"
        secondaryAction={{ label: "+ Episode", onClick: () => { setEditEp(null); setShowEp(true); } }}
        primaryAction={{ label: "+ Session", onClick: () => { setEditSn(null); setShowSn(true); } }}
      />

      {stats && (
        <StatGrid cols={7}>
          <StatCard label="Active" value={stats.activeEpisodes} tone="emerald" icon="●" />
          <StatCard label="Pending intake" value={stats.pendingIntake} tone="amber" icon="📝" />
          <StatCard label="On hold" value={stats.onHold} tone="slate" icon="⏸" />
          <StatCard label="Discharged (mo)" value={stats.dischargedMonth} tone="teal" icon="✓" />
          <StatCard label="Sessions today" value={stats.sessionsToday} tone="indigo" icon="📅" />
          <StatCard label="Completed (wk)" value={stats.completedWeek} tone="violet" icon="🏁" />
          <StatCard label="Missed (wk)" value={stats.missedWeek} tone="rose" icon="✕" />
        </StatGrid>
      )}

      <TabSwitch
        active={tab}
        onSelect={(k) => setTab(k as "episodes" | "sessions")}
        tabs={[
          { key: "episodes", label: "Episodes", count: episodes.length },
          { key: "sessions", label: "Sessions", count: sessions.length },
        ]}
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {tab === "episodes" ? (
          episodes.length === 0 ? <Empty label="No episodes." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Discipline</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">FIM adm → dis</th>
                    <th className="px-4 py-3">Sessions</th>
                    <th className="px-4 py-3">Referred</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {episodes.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{e.id}</td>
                      <td className="px-4 py-3 font-medium">{e.patientName}</td>
                      <td className="px-4 py-3">{DISCIPLINE_LABEL[e.discipline]}</td>
                      <td className="px-4 py-3">{CATEGORY_LABEL[e.category]}</td>
                      <td className="px-4 py-3">{e.rehabProvider}</td>
                      <td className="px-4 py-3 text-xs">{fimTotal(e.fimAdmission) || "-"} → {fimTotal(e.fimDischarge) || "-"}</td>
                      <td className="px-4 py-3 text-xs">{e.sessionsCompleted ?? 0} / {e.totalSessionsAuthorized ?? "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(e.referralDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><Pill tone={e.status === "active" ? "emerald" : e.status === "discharged" ? "slate" : e.status === "cancelled" ? "slate" : e.status === "on_hold" ? "rose" : "amber"}>{EP_STATUS_LABEL[e.status]}</Pill></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setEditEp(e); setShowEp(true); }} className="text-xs font-semibold text-primary-600 hover:underline">Edit</button>
                        <button onClick={() => removeEp(e.id)} className="ml-3 text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : sessions.length === 0 ? <Empty label="No sessions." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Episode</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Therapist</th>
                  <th className="px-4 py-3">Discipline</th>
                  <th className="px-4 py-3">Pain pre→post</th>
                  <th className="px-4 py-3">Scheduled</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.id}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.episodeId}</td>
                    <td className="px-4 py-3 font-medium">{s.patientName}</td>
                    <td className="px-4 py-3">{s.therapistName}</td>
                    <td className="px-4 py-3">{DISCIPLINE_LABEL[s.discipline]}</td>
                    <td className="px-4 py-3 text-xs">{s.painPreNrs ?? "-"} → {s.painPostNrs ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(s.scheduledAt).toLocaleString()}</td>
                    <td className="px-4 py-3"><Pill tone={s.status === "completed" ? "emerald" : s.status === "missed" ? "rose" : s.status === "cancelled" ? "slate" : "amber"}>{SESSION_STATUS_LABEL[s.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditSn(s); setShowSn(true); }} className="text-xs font-semibold text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => removeSn(s.id)} className="ml-3 text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEp && <EpisodeModal patients={patients} editing={editEp} onClose={() => setShowEp(false)} onSaved={() => { setShowEp(false); load(); }} />}
      {showSn && <SessionModal patients={patients} episodes={episodes} editing={editSn} onClose={() => setShowSn(false)} onSaved={() => { setShowSn(false); load(); }} />}
    </div>
  );
}

function EpisodeModal({ patients, editing, onClose, onSaved }: { patients: Patient[]; editing: RehabEpisode | null; onClose: () => void; onSaved: () => void; }) {
  const [patientId, setPatientId] = useState(editing?.patientId || "");
  const [rehabProvider, setRehabProvider] = useState(editing?.rehabProvider || "");
  const [referringProvider, setReferringProvider] = useState(editing?.referringProvider || "");
  const [discipline, setDiscipline] = useState<RehabDiscipline>(editing?.discipline || "pt");
  const [category, setCategory] = useState<EpisodeCategory>(editing?.category || "ortho");
  const [status, setStatus] = useState<EpisodeStatus>(editing?.status || "referred");
  const [referralDate, setReferralDate] = useState(editing?.referralDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState(editing?.primaryDiagnosis || "");
  const [admissionType, setAdmissionType] = useState<"inpatient" | "outpatient" | "day_care">(editing?.admissionType || "outpatient");
  const [initialAssessmentNote, setIni] = useState(editing?.initialAssessmentNote || "");
  const [precautions, setPrecautions] = useState(editing?.precautions || "");
  const [equipmentNeeded, setEquipment] = useState(editing?.equipmentNeeded || "");
  const [caregiverName, setCg] = useState(editing?.caregiverName || "");
  const [caregiverPhone, setCgPh] = useState(editing?.caregiverPhone || "");
  const [prescribedSessionsPerWeek, setPSPW] = useState<number | "">(editing?.prescribedSessionsPerWeek ?? "");
  const [totalSessionsAuthorized, setTot] = useState<number | "">(editing?.totalSessionsAuthorized ?? "");
  const [goals, setGoals] = useState<FunctionalGoal[]>(editing?.goals || []);
  const [dischargeSummary, setDS] = useState(editing?.dischargeSummary || "");
  const [dischargeDestination, setDD] = useState<"home" | "home_with_caregiver" | "snf" | "inpatient_rehab" | "expired" | "other" | "">(editing?.dischargeDestination || "");
  const [saving, setSaving] = useState(false);

  function addGoal() {
    setGoals([...goals, { id: `g-${Date.now()}`, text: "", achieved: false }]);
  }
  function updGoal(i: number, patch: Partial<FunctionalGoal>) {
    setGoals(goals.map((g, idx) => idx === i ? { ...g, ...patch } : g));
  }
  function delGoal(i: number) {
    setGoals(goals.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!patientId || !rehabProvider) return;
    const p = patients.find((x) => x.id === patientId);
    if (!p) return;
    setSaving(true);
    const payload = {
      id: editing?.id,
      patientId, patientName: `${p.firstName} ${p.lastName}`,
      rehabProvider, referringProvider: referringProvider || undefined,
      discipline, category, status,
      referralDate: new Date(referralDate).toISOString(),
      primaryDiagnosis: primaryDiagnosis || undefined,
      admissionType,
      initialAssessmentNote: initialAssessmentNote || undefined,
      precautions: precautions || undefined,
      equipmentNeeded: equipmentNeeded || undefined,
      caregiverName: caregiverName || undefined,
      caregiverPhone: caregiverPhone || undefined,
      prescribedSessionsPerWeek: prescribedSessionsPerWeek === "" ? undefined : Number(prescribedSessionsPerWeek),
      totalSessionsAuthorized: totalSessionsAuthorized === "" ? undefined : Number(totalSessionsAuthorized),
      goals,
      dischargeSummary: dischargeSummary || undefined,
      dischargeDestination: dischargeDestination || undefined,
    };
    await fetch("/api/hospital/rehab", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit episode" : "New rehab episode"}</h2>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient">
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
            </Field>
            <Field label="Rehab provider"><input value={rehabProvider} onChange={(e) => setRehabProvider(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Referring provider"><input value={referringProvider} onChange={(e) => setReferringProvider(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Discipline">
              <select value={discipline} onChange={(e) => setDiscipline(e.target.value as RehabDiscipline)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {DISCIPLINES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABEL[d]}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value as EpisodeCategory)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as EpisodeStatus)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {EP_STATUSES.map((s) => <option key={s} value={s}>{EP_STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Referral date"><input type="date" value={referralDate} onChange={(e) => setReferralDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Admission type">
              <select value={admissionType} onChange={(e) => setAdmissionType(e.target.value as "inpatient" | "outpatient" | "day_care")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="outpatient">Outpatient</option>
                <option value="inpatient">Inpatient</option>
                <option value="day_care">Day care</option>
              </select>
            </Field>
            <Field label="Primary diagnosis"><input value={primaryDiagnosis} onChange={(e) => setPrimaryDiagnosis(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>

          <Field label="Initial assessment"><textarea value={initialAssessmentNote} onChange={(e) => setIni(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Precautions"><input value={precautions} onChange={(e) => setPrecautions(e.target.value)} placeholder="NWB, fall, swallow..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Equipment needed"><input value={equipmentNeeded} onChange={(e) => setEquipment(e.target.value)} placeholder="walker, AFO..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Caregiver name"><input value={caregiverName} onChange={(e) => setCg(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Caregiver phone"><input value={caregiverPhone} onChange={(e) => setCgPh(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Sessions / week"><input type="number" value={prescribedSessionsPerWeek} onChange={(e) => setPSPW(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Total authorized"><input type="number" value={totalSessionsAuthorized} onChange={(e) => setTot(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase text-slate-600">Functional goals</div>
              <button type="button" onClick={addGoal} className="text-xs font-semibold text-primary-600">+ Add goal</button>
            </div>
            {goals.length === 0 ? <div className="text-xs text-slate-400">No goals.</div> : (
              <div className="space-y-2">
                {goals.map((g, i) => (
                  <div key={g.id} className="grid grid-cols-12 gap-2 rounded border border-slate-200 bg-white p-2">
                    <input value={g.text} onChange={(e) => updGoal(i, { text: e.target.value })} placeholder="Goal..." className="col-span-4 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={g.baseline || ""} onChange={(e) => updGoal(i, { baseline: e.target.value })} placeholder="Baseline" className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input value={g.current || ""} onChange={(e) => updGoal(i, { current: e.target.value })} placeholder="Current" className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <input type="date" value={g.targetDate?.slice(0, 10) || ""} onChange={(e) => updGoal(i, { targetDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <label className="col-span-1 flex items-center gap-1 text-xs"><input type="checkbox" checked={g.achieved} onChange={(e) => updGoal(i, { achieved: e.target.checked })} />Done</label>
                    <button type="button" onClick={() => delGoal(i)} className="col-span-1 text-xs text-rose-600">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="Discharge summary"><textarea value={dischargeSummary} onChange={(e) => setDS(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Discharge destination">
            <select value={dischargeDestination} onChange={(e) => setDD(e.target.value as "home" | "home_with_caregiver" | "snf" | "inpatient_rehab" | "expired" | "other" | "")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">—</option>
              <option value="home">Home</option>
              <option value="home_with_caregiver">Home w/ caregiver</option>
              <option value="snf">SNF</option>
              <option value="inpatient_rehab">Inpatient rehab</option>
              <option value="expired">Expired</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function SessionModal({ patients, episodes, editing, onClose, onSaved }: { patients: Patient[]; episodes: RehabEpisode[]; editing: RehabSession | null; onClose: () => void; onSaved: () => void; }) {
  const [episodeId, setEpisodeId] = useState(editing?.episodeId || "");
  const [therapistName, setTherapist] = useState(editing?.therapistName || "");
  const [status, setStatus] = useState<SessionStatus>(editing?.status || "scheduled");
  const [scheduledAt, setScheduledAt] = useState(editing?.scheduledAt?.slice(0, 16) || new Date().toISOString().slice(0, 16));
  const [durationMin, setDuration] = useState<number | "">(editing?.durationMin ?? "");
  const [interventions, setInterv] = useState(editing?.interventions || "");
  const [painPreNrs, setPre] = useState<number | "">(editing?.painPreNrs ?? "");
  const [painPostNrs, setPost] = useState<number | "">(editing?.painPostNrs ?? "");
  const [tolerance, setTolerance] = useState<"excellent" | "good" | "fair" | "poor" | "">(editing?.tolerance || "");
  const [progressNote, setPN] = useState(editing?.progressNote || "");
  const [homeProgram, setHP] = useState(editing?.homeProgram || "");
  const [cancelReason, setCR] = useState(editing?.cancelReason || "");
  const [saving, setSaving] = useState(false);

  const ep = episodes.find((e) => e.id === episodeId);

  async function submit() {
    if (!episodeId || !therapistName || !ep) return;
    setSaving(true);
    const payload = {
      kind: "session",
      id: editing?.id,
      episodeId,
      patientId: ep.patientId,
      patientName: ep.patientName,
      therapistName,
      discipline: ep.discipline,
      status,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMin: durationMin === "" ? undefined : Number(durationMin),
      interventions: interventions || undefined,
      painPreNrs: painPreNrs === "" ? undefined : Number(painPreNrs),
      painPostNrs: painPostNrs === "" ? undefined : Number(painPostNrs),
      tolerance: tolerance || undefined,
      progressNote: progressNote || undefined,
      homeProgram: homeProgram || undefined,
      cancelReason: cancelReason || undefined,
    };
    await fetch("/api/hospital/rehab", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit session" : "New session"}</h2>
        </div>
        <div className="space-y-4 p-4">
          <Field label="Episode">
            <select value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select...</option>
              {episodes.filter((e) => e.status === "active" || e.status === "intake" || editing?.episodeId === e.id).map((e) => (
                <option key={e.id} value={e.id}>{e.id} — {e.patientName} ({DISCIPLINE_LABEL[e.discipline]})</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Therapist"><input value={therapistName} onChange={(e) => setTherapist(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Scheduled at"><input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as SessionStatus)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {SN_STATUSES.map((s) => <option key={s} value={s}>{SESSION_STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Duration (min)"><input type="number" value={durationMin} onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Pain pre (0-10)"><input type="number" min={0} max={10} value={painPreNrs} onChange={(e) => setPre(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Pain post (0-10)"><input type="number" min={0} max={10} value={painPostNrs} onChange={(e) => setPost(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Tolerance">
              <select value={tolerance} onChange={(e) => setTolerance(e.target.value as "excellent" | "good" | "fair" | "poor" | "")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">—</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </Field>
          </div>
          <Field label="Interventions"><textarea value={interventions} onChange={(e) => setInterv(e.target.value)} rows={2} placeholder="gait training, PROM, e-stim..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Progress note"><textarea value={progressNote} onChange={(e) => setPN(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Home program"><textarea value={homeProgram} onChange={(e) => setHP(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          {(status === "cancelled" || status === "missed") && <Field label="Cancel / missed reason"><input value={cancelReason} onChange={(e) => setCR(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
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
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; }) {
  return <button onClick={onClick} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${active ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{children}</button>;
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
