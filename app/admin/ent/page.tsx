"use client";

import { useEffect, useState } from "react";
import type { EntExam, EntVisitType, EntStatus, EntRegion, EarFinding } from "@/lib/hospital/ent-store";
// Inlined from ent-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const VISIT_LABEL: Record<EntVisitType, string> = {
  routine: "Routine", emergency: "Emergency", post_op: "Post-op",
  follow_up: "Follow-up", screening: "Screening", audiology: "Audiology",
};
const STATUS_LABEL: Record<EntStatus, string> = {
  scheduled: "Scheduled", in_progress: "In progress", completed: "Completed",
  referred: "Referred", cancelled: "Cancelled",
};
const REGION_LABEL: Record<EntRegion, string> = {
  ear: "Ear", nose: "Nose", throat: "Throat", head_neck: "Head/neck", multi: "Multi-region",
};

interface Patient { id: string; firstName: string; lastName: string; }

const VISITS: EntVisitType[] = ["routine", "emergency", "post_op", "follow_up", "screening", "audiology"];
const STATUSES: EntStatus[] = ["scheduled", "in_progress", "completed", "referred", "cancelled"];
const REGIONS: EntRegion[] = ["ear", "nose", "throat", "head_neck", "multi"];
const TYMP: string[] = ["A", "As", "Ad", "B", "C"];

export default function EntPage() {
  const [exams, setExams] = useState<EntExam[]>([]);
  const [stats, setStats] = useState<{ scheduledToday: number; inProgress: number; completedMonth: number; audiologyMonth: number; referralsMonth: number; hearingLossFlags: number; emergencyMonth: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EntExam | null>(null);
  const [filterStatus, setFilterStatus] = useState<EntStatus | "">("");
  const [filterRegion, setFilterRegion] = useState<EntRegion | "">("");

  async function load() {
    const qs = new URLSearchParams();
    if (filterStatus) qs.set("status", filterStatus);
    if (filterRegion) qs.set("region", filterRegion);
    const res = await fetch(`/api/hospital/ent?${qs.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setExams(data.exams || []);
    setStats(data.stats || null);
  }
  async function loadPatients() {
    try {
      const res = await fetch("/api/patients", { cache: "no-store" });
      const data = await res.json();
      setPatients(data.patients || []);
    } catch {}
  }
  useEffect(() => { load(); }, [filterStatus, filterRegion]);
  useEffect(() => { loadPatients(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete exam?")) return;
    await fetch("/api/hospital/ent", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ENT / Otolaryngology</h1>
          <p className="text-sm text-slate-500">Ear, Nose, Throat, Head & Neck + Audiology (PTA / Tympanometry)</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ New ENT exam</button>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <StatTile label="Scheduled today" value={stats.scheduledToday} tone="slate" />
          <StatTile label="In progress" value={stats.inProgress} tone="amber" />
          <StatTile label="Completed (month)" value={stats.completedMonth} tone="emerald" />
          <StatTile label="Audiology (month)" value={stats.audiologyMonth} tone="indigo" />
          <StatTile label="Referrals (month)" value={stats.referralsMonth} tone="slate" />
          <StatTile label="Hearing loss flags" value={stats.hearingLossFlags} tone="rose" />
          <StatTile label="Emergency (month)" value={stats.emergencyMonth} tone="rose" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPill active={filterStatus === ""} onClick={() => setFilterStatus("")}>All status</FilterPill>
        {STATUSES.map((s) => <FilterPill key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}>{STATUS_LABEL[s]}</FilterPill>)}
        <span className="mx-2 h-4 w-px bg-slate-300" />
        <FilterPill active={filterRegion === ""} onClick={() => setFilterRegion("")}>All regions</FilterPill>
        {REGIONS.map((r) => <FilterPill key={r} active={filterRegion === r} onClick={() => setFilterRegion(r)}>{REGION_LABEL[r]}</FilterPill>)}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {exams.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No exams.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Visit</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">PTA R/L</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {exams.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{e.id}</td>
                    <td className="px-4 py-3 font-medium">{e.patientName}</td>
                    <td className="px-4 py-3">{e.providerName}</td>
                    <td className="px-4 py-3">{VISIT_LABEL[e.visitType]}</td>
                    <td className="px-4 py-3">{REGION_LABEL[e.region]}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(e.visitDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs">{e.rightPtaDb ?? "-"} / {e.leftPtaDb ?? "-"}</td>
                    <td className="px-4 py-3"><Pill tone={e.status === "completed" ? "emerald" : e.status === "cancelled" ? "slate" : e.status === "referred" ? "indigo" : "amber"}>{STATUS_LABEL[e.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditing(e); setShowModal(true); }} className="text-xs font-semibold text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => remove(e.id)} className="ml-3 text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ExamModal
          patients={patients}
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function ExamModal({ patients, editing, onClose, onSaved }: { patients: Patient[]; editing: EntExam | null; onClose: () => void; onSaved: () => void; }) {
  const [patientId, setPatientId] = useState(editing?.patientId || "");
  const [providerName, setProviderName] = useState(editing?.providerName || "");
  const [visitType, setVisitType] = useState<EntVisitType>(editing?.visitType || "routine");
  const [region, setRegion] = useState<EntRegion>(editing?.region || "multi");
  const [status, setStatus] = useState<EntStatus>(editing?.status || "scheduled");
  const [visitDate, setVisitDate] = useState(editing?.visitDate?.slice(0, 16) || new Date().toISOString().slice(0, 16));
  const [chiefComplaint, setChiefComplaint] = useState(editing?.chiefComplaint || "");
  const [historyNote, setHistoryNote] = useState(editing?.historyNote || "");
  const [rightEar, setRightEar] = useState<EarFinding>(editing?.rightEar || {});
  const [leftEar, setLeftEar] = useState<EarFinding>(editing?.leftEar || {});
  const [noseFindings, setNoseFindings] = useState(editing?.noseFindings || "");
  const [throatFindings, setThroatFindings] = useState(editing?.throatFindings || "");
  const [neckFindings, setNeckFindings] = useState(editing?.neckFindings || "");
  const [rightPtaDb, setRightPtaDb] = useState<number | "">(editing?.rightPtaDb ?? "");
  const [leftPtaDb, setLeftPtaDb] = useState<number | "">(editing?.leftPtaDb ?? "");
  const [tympanometryRight, setTympanometryRight] = useState(editing?.tympanometryRight || "");
  const [tympanometryLeft, setTympanometryLeft] = useState(editing?.tympanometryLeft || "");
  const [scopeFindings, setScopeFindings] = useState(editing?.scopeFindings || "");
  const [impression, setImpression] = useState(editing?.impression || "");
  const [plan, setPlan] = useState(editing?.plan || "");
  const [prescriptionNote, setPrescriptionNote] = useState(editing?.prescriptionNote || "");
  const [referralTo, setReferralTo] = useState(editing?.referralTo || "");
  const [nextReviewDate, setNextReviewDate] = useState(editing?.nextReviewDate?.slice(0, 10) || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!patientId || !providerName) return;
    const p = patients.find((x) => x.id === patientId);
    if (!p) return;
    setSaving(true);
    const payload = {
      id: editing?.id,
      patientId,
      patientName: `${p.firstName} ${p.lastName}`,
      providerName,
      visitType,
      region,
      status,
      visitDate: new Date(visitDate).toISOString(),
      chiefComplaint: chiefComplaint || undefined,
      historyNote: historyNote || undefined,
      rightEar, leftEar,
      noseFindings: noseFindings || undefined,
      throatFindings: throatFindings || undefined,
      neckFindings: neckFindings || undefined,
      rightPtaDb: rightPtaDb === "" ? undefined : Number(rightPtaDb),
      leftPtaDb: leftPtaDb === "" ? undefined : Number(leftPtaDb),
      tympanometryRight: tympanometryRight || undefined,
      tympanometryLeft: tympanometryLeft || undefined,
      scopeFindings: scopeFindings || undefined,
      impression: impression || undefined,
      plan: plan || undefined,
      prescriptionNote: prescriptionNote || undefined,
      referralTo: referralTo || undefined,
      nextReviewDate: nextReviewDate ? new Date(nextReviewDate).toISOString() : undefined,
    };
    await fetch("/api/hospital/ent", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 border-b border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editing ? "Edit ENT exam" : "New ENT exam"}</h2>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient">
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select...</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
            </Field>
            <Field label="Provider"><input value={providerName} onChange={(e) => setProviderName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Visit date">
              <input type="datetime-local" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </Field>
            <Field label="Visit type">
              <select value={visitType} onChange={(e) => setVisitType(e.target.value as EntVisitType)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {VISITS.map((v) => <option key={v} value={v}>{VISIT_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="Region">
              <select value={region} onChange={(e) => setRegion(e.target.value as EntRegion)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {REGIONS.map((r) => <option key={r} value={r}>{REGION_LABEL[r]}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as EntStatus)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Chief complaint"><input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="History"><textarea value={historyNote} onChange={(e) => setHistoryNote(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <EarCard label="Right ear" v={rightEar} set={setRightEar} />
            <EarCard label="Left ear" v={leftEar} set={setLeftEar} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Nose"><textarea value={noseFindings} onChange={(e) => setNoseFindings(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Throat"><textarea value={throatFindings} onChange={(e) => setThroatFindings(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Head & neck"><textarea value={neckFindings} onChange={(e) => setNeckFindings(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-600">Audiology</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Right PTA (dB HL)"><input type="number" value={rightPtaDb} onChange={(e) => setRightPtaDb(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
              <Field label="Left PTA (dB HL)"><input type="number" value={leftPtaDb} onChange={(e) => setLeftPtaDb(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
              <Field label="Tympanometry R">
                <select value={tympanometryRight} onChange={(e) => setTympanometryRight(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">—</option>{TYMP.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Tympanometry L">
                <select value={tympanometryLeft} onChange={(e) => setTympanometryLeft(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">—</option>{TYMP.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            {(Number(rightPtaDb) > 25 || Number(leftPtaDb) > 25) && (
              <div className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">Hearing loss flag: PTA &gt; 25 dB HL.</div>
            )}
          </div>

          <Field label="Endoscopy / scope findings"><textarea value={scopeFindings} onChange={(e) => setScopeFindings(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Impression / diagnosis"><textarea value={impression} onChange={(e) => setImpression(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <Field label="Plan"><textarea value={plan} onChange={(e) => setPlan(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Prescription"><input value={prescriptionNote} onChange={(e) => setPrescriptionNote(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Referral to"><input value={referralTo} onChange={(e) => setReferralTo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
            <Field label="Next review"><input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Field>
          </div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function EarCard({ label, v, set }: { label: string; v: EarFinding; set: (x: EarFinding) => void; }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 text-xs font-semibold uppercase text-slate-600">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Canal"><input value={v.canal || ""} onChange={(e) => set({ ...v, canal: e.target.value })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Field>
        <Field label="TM"><input value={v.tympanicMembrane || ""} onChange={(e) => set({ ...v, tympanicMembrane: e.target.value })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Field>
        <Field label="Mobility"><input value={v.mobility || ""} onChange={(e) => set({ ...v, mobility: e.target.value })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Field>
        <Field label="Hearing (gross)"><input value={v.hearingGross || ""} onChange={(e) => set({ ...v, hearingGross: e.target.value })} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /></Field>
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
  return (
    <div className={`rounded-lg p-3 ring-1 ${map[tone]}`}>
      <div className="text-xs">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; }) {
  return <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-primary-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{children}</button>;
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
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
