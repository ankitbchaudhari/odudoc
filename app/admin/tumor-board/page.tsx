"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  TumorBoardMeeting, TumorBoardCase, Attendee,
  CancerSite, CaseIntent, TreatmentModality, MeetingStatus, CaseStatus, PerformanceStatus,
} from "@/lib/hospital/tumor-board-store";
// Inlined from tumor-board-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const SITE_LABEL: Record<CancerSite, string> = {
  breast: "Breast", lung: "Lung", colorectal: "Colorectal", gastric: "Gastric",
  prostate: "Prostate", head_neck: "Head & neck", gynae: "Gynae",
  hepatobiliary: "Hepatobiliary", pancreas: "Pancreas", lymphoma: "Lymphoma",
  leukemia: "Leukemia", sarcoma: "Sarcoma", cns: "CNS", skin: "Skin",
  renal: "Renal", bladder: "Bladder", thyroid: "Thyroid", other: "Other",
};
const INTENT_LABEL: Record<CaseIntent, string> = {
  curative: "Curative", palliative: "Palliative", adjuvant: "Adjuvant",
  neoadjuvant: "Neoadjuvant", salvage: "Salvage", supportive: "Supportive",
};
const MODALITY_LABEL: Record<TreatmentModality, string> = {
  surgery: "Surgery", chemotherapy: "Chemotherapy", radiotherapy: "Radiotherapy",
  immunotherapy: "Immunotherapy", targeted: "Targeted", hormonal: "Hormonal",
  transplant: "Transplant", best_supportive_care: "BSC",
  watch_wait: "Watch & wait", referral_out: "Referral out",
};
const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  scheduled: "Scheduled", in_progress: "In progress",
  completed: "Completed", cancelled: "Cancelled",
};
const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  new: "New", follow_up: "Follow-up", discussed: "Discussed",
  deferred: "Deferred", closed: "Closed",
};

interface Patient { id: string; firstName: string; lastName: string; dateOfBirth?: string; gender?: string; }

const SITES: CancerSite[] = ["breast", "lung", "colorectal", "gastric", "prostate", "head_neck", "gynae", "hepatobiliary", "pancreas", "lymphoma", "leukemia", "sarcoma", "cns", "skin", "renal", "bladder", "thyroid", "other"];
const INTENTS: CaseIntent[] = ["curative", "palliative", "adjuvant", "neoadjuvant", "salvage", "supportive"];
const MODALITIES: TreatmentModality[] = ["surgery", "chemotherapy", "radiotherapy", "immunotherapy", "targeted", "hormonal", "transplant", "best_supportive_care", "watch_wait", "referral_out"];
const MEETING_STATUSES: MeetingStatus[] = ["scheduled", "in_progress", "completed", "cancelled"];
const CASE_STATUSES: CaseStatus[] = ["new", "follow_up", "discussed", "deferred", "closed"];
const ECOG: PerformanceStatus[] = [0, 1, 2, 3, 4, 5];

export default function TumorBoardPage() {
  const [tab, setTab] = useState<"meetings" | "cases">("meetings");
  const [meetings, setMeetings] = useState<TumorBoardMeeting[]>([]);
  const [cases, setCases] = useState<TumorBoardCase[]>([]);
  const [stats, setStats] = useState<{ upcomingMeetings: number; completedMeetingsMonth: number; newCases: number; deferred: number; casesDiscussedMonth: number; siteCounts: Record<string, number>; trialReferralsMonth: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showMeet, setShowMeet] = useState(false);
  const [showCase, setShowCase] = useState(false);
  const [editMeet, setEditMeet] = useState<TumorBoardMeeting | null>(null);
  const [editCase, setEditCase] = useState<TumorBoardCase | null>(null);
  const [fSite, setFSite] = useState<CancerSite | "">("");
  const [fCaseStatus, setFCaseStatus] = useState<CaseStatus | "">("");

  async function load() {
    const res = await fetch("/api/hospital/tumor-board", { cache: "no-store" });
    const data = await res.json();
    setMeetings(data.meetings || []);
    setCases(data.cases || []);
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
    await fetch("/api/hospital/tumor-board", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind }) });
    load();
  }

  const filteredCases = useMemo(() => cases
    .filter((c) => (fSite ? c.primarySite === fSite : true))
    .filter((c) => (fCaseStatus ? c.caseStatus === fCaseStatus : true)),
    [cases, fSite, fCaseStatus]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tumor Board / MDT</h1>
          <p className="text-sm text-slate-500">Multidisciplinary case review · Cancer staging · Treatment planning</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditMeet(null); setShowMeet(true); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Meeting</button>
          <button onClick={() => { setEditCase(null); setShowCase(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Case</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Upcoming meetings" value={stats.upcomingMeetings} tone="indigo" />
          <StatTile label="Completed (month)" value={stats.completedMeetingsMonth} tone="emerald" />
          <StatTile label="New cases" value={stats.newCases} tone="amber" />
          <StatTile label="Discussed (month)" value={stats.casesDiscussedMonth} tone="emerald" />
          <StatTile label="Deferred" value={stats.deferred} tone="rose" />
          <StatTile label="Trial referrals" value={stats.trialReferralsMonth} tone="slate" />
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <TabBtn active={tab === "meetings"} onClick={() => setTab("meetings")}>Meetings ({meetings.length})</TabBtn>
        <TabBtn active={tab === "cases"} onClick={() => setTab("cases")}>Cases ({cases.length})</TabBtn>
      </div>

      {tab === "meetings" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Meeting</th>
                <th className="px-4 py-3">Board</th>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Chair</th>
                <th className="px-4 py-3">Attendees</th>
                <th className="px-4 py-3">Cases</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meetings.map((m) => {
                const count = cases.filter((c) => c.meetingId === m.id).length;
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{m.title}</div>
                      <div className="text-xs text-slate-500">{m.id}{m.venue ? ` · ${m.venue}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{SITE_LABEL[m.boardType]}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{new Date(m.meetingDate).toLocaleDateString()}{m.startTime ? ` · ${m.startTime}${m.endTime ? `-${m.endTime}` : ""}` : ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{m.chair}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{m.attendees.length}{m.quorumMet ? " ✓" : ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{count}</td>
                    <td className="px-4 py-3"><Pill status={m.status}>{MEETING_STATUS_LABEL[m.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditMeet(m); setShowMeet(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => del(m.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                );
              })}
              {meetings.length === 0 && <tr><td colSpan={8}><Empty>No meetings yet.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "cases" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterPill active={fSite === ""} onClick={() => setFSite("")}>All sites</FilterPill>
            {SITES.map((s) => <FilterPill key={s} active={fSite === s} onClick={() => setFSite(s)}>{SITE_LABEL[s]}</FilterPill>)}
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterPill active={fCaseStatus === ""} onClick={() => setFCaseStatus("")}>All status</FilterPill>
            {CASE_STATUSES.map((s) => <FilterPill key={s} active={fCaseStatus === s} onClick={() => setFCaseStatus(s)}>{CASE_STATUS_LABEL[s]}</FilterPill>)}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Stage / Grade</th>
                  <th className="px-4 py-3">ECOG</th>
                  <th className="px-4 py-3">Meeting</th>
                  <th className="px-4 py-3">Intent</th>
                  <th className="px-4 py-3">Modalities</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.patientName}</div>
                      <div className="text-xs text-slate-500">{c.id}{c.patientAge ? ` · ${c.patientAge}y` : ""}{c.patientGender ? ` ${c.patientGender}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div className="font-semibold">{SITE_LABEL[c.primarySite]}</div>
                      {c.histology && <div className="text-slate-500">{c.histology}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{c.stageTnm || "-"}{c.grade ? ` / ${c.grade}` : ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{c.ecog !== undefined ? c.ecog : "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.meetingTitle || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{c.intent ? INTENT_LABEL[c.intent] : "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{c.plannedModalities.map((m) => MODALITY_LABEL[m]).join(", ") || "-"}</td>
                    <td className="px-4 py-3"><Pill status={c.caseStatus}>{CASE_STATUS_LABEL[c.caseStatus]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditCase(c); setShowCase(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => del(c.id, "case")} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredCases.length === 0 && <tr><td colSpan={9}><Empty>No cases.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showMeet && <MeetingModal initial={editMeet} onClose={() => { setShowMeet(false); setEditMeet(null); }} onSaved={() => { setShowMeet(false); setEditMeet(null); load(); }} />}
      {showCase && <CaseModal meetings={meetings} patients={patients} initial={editCase} onClose={() => { setShowCase(false); setEditCase(null); }} onSaved={() => { setShowCase(false); setEditCase(null); load(); }} />}
    </div>
  );
}

function MeetingModal({ initial, onClose, onSaved }: { initial: TumorBoardMeeting | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<TumorBoardMeeting>>(
    initial ?? {
      boardType: "other", status: "scheduled",
      meetingDate: new Date().toISOString().slice(0, 10),
      attendees: [],
    },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function addAtt() {
    const a: Attendee = { id: `att-${Date.now()}-${(form.attendees || []).length}`, name: "", specialty: "", role: "member" };
    setForm({ ...form, attendees: [...(form.attendees || []), a] });
  }
  function updAtt(i: number, patch: Partial<Attendee>) {
    const list = [...(form.attendees || [])];
    list[i] = { ...list[i], ...patch };
    setForm({ ...form, attendees: list });
  }
  function rmAtt(i: number) {
    const list = [...(form.attendees || [])];
    list.splice(i, 1);
    setForm({ ...form, attendees: list });
  }

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/tumor-board", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit meeting" : "New tumor board meeting"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Title *" full><input className="inp" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Board focus"><select className="inp" value={form.boardType || "other"} onChange={(e) => setForm({ ...form, boardType: e.target.value as CancerSite })}>{SITES.map((s) => <option key={s} value={s}>{SITE_LABEL[s]}</option>)}</select></Field>
          <Field label="Date *"><input type="date" className="inp" value={(form.meetingDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} /></Field>
          <Field label="Start"><input type="time" className="inp" value={form.startTime || ""} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
          <Field label="End"><input type="time" className="inp" value={form.endTime || ""} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
          <Field label="Venue"><input className="inp" value={form.venue || ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></Field>
          <Field label="Virtual link"><input className="inp" value={form.virtualLink || ""} onChange={(e) => setForm({ ...form, virtualLink: e.target.value })} /></Field>
          <Field label="Chair *"><input className="inp" value={form.chair || ""} onChange={(e) => setForm({ ...form, chair: e.target.value })} /></Field>
          <Field label="Status"><select className="inp" value={form.status || "scheduled"} onChange={(e) => setForm({ ...form, status: e.target.value as MeetingStatus })}>{MEETING_STATUSES.map((s) => <option key={s} value={s}>{MEETING_STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Minutes URL"><input className="inp" value={form.minutesUrl || ""} onChange={(e) => setForm({ ...form, minutesUrl: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.quorumMet} onChange={(e) => setForm({ ...form, quorumMet: e.target.checked })} /> Quorum met</label>
          <Field label="Agenda notes" full><textarea className="inp" rows={2} value={form.agendaNotes || ""} onChange={(e) => setForm({ ...form, agendaNotes: e.target.value })} /></Field>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Attendees</div>
            <button onClick={addAtt} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">+ Add</button>
          </div>
          {(form.attendees || []).length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">No attendees recorded.</div>}
          {(form.attendees || []).map((a, i) => (
            <div key={a.id} className="mb-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 md:grid-cols-12">
              <input className="inp md:col-span-4" placeholder="Name" value={a.name} onChange={(e) => updAtt(i, { name: e.target.value })} />
              <input className="inp md:col-span-4" placeholder="Specialty" value={a.specialty} onChange={(e) => updAtt(i, { specialty: e.target.value })} />
              <select className="inp md:col-span-3" value={a.role || "member"} onChange={(e) => updAtt(i, { role: e.target.value as Attendee["role"] })}>
                <option value="chair">Chair</option><option value="member">Member</option><option value="presenter">Presenter</option><option value="observer">Observer</option>
              </select>
              <button onClick={() => rmAtt(i)} className="rounded-lg bg-rose-50 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 md:col-span-1">×</button>
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

function CaseModal({ meetings, patients, initial, onClose, onSaved }: { meetings: TumorBoardMeeting[]; patients: Patient[]; initial: TumorBoardCase | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<TumorBoardCase>>(
    initial ?? { primarySite: "other", caseStatus: "new", plannedModalities: [], secondOpinionRequested: false, consentObtained: false },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function onPatient(id: string) {
    const p = patients.find((x) => x.id === id);
    if (!p) { setForm({ ...form, patientId: id }); return; }
    const age = p.dateOfBirth ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)) : undefined;
    setForm({ ...form, patientId: id, patientName: `${p.firstName} ${p.lastName}`, patientAge: age, patientGender: (p.gender as TumorBoardCase["patientGender"]) });
  }

  function toggleMod(m: TreatmentModality) {
    const list = new Set(form.plannedModalities || []);
    if (list.has(m)) list.delete(m); else list.add(m);
    setForm({ ...form, plannedModalities: Array.from(list) });
  }

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form, kind: "case" };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/tumor-board", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit case" : "New tumor board case"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Patient *">
            <select className="inp" value={form.patientId || ""} onChange={(e) => onPatient(e.target.value)}>
              <option value="">-- Select --</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.id})</option>)}
            </select>
          </Field>
          <Field label="Meeting">
            <select className="inp" value={form.meetingId || ""} onChange={(e) => setForm({ ...form, meetingId: e.target.value || undefined })}>
              <option value="">-- None --</option>
              {meetings.map((m) => <option key={m.id} value={m.id}>{m.title} ({new Date(m.meetingDate).toLocaleDateString()})</option>)}
            </select>
          </Field>
          <Field label="Presented by *"><input className="inp" value={form.presentedBy || ""} onChange={(e) => setForm({ ...form, presentedBy: e.target.value })} /></Field>

          <Field label="Primary site"><select className="inp" value={form.primarySite || "other"} onChange={(e) => setForm({ ...form, primarySite: e.target.value as CancerSite })}>{SITES.map((s) => <option key={s} value={s}>{SITE_LABEL[s]}</option>)}</select></Field>
          <Field label="Histology"><input className="inp" value={form.histology || ""} onChange={(e) => setForm({ ...form, histology: e.target.value })} /></Field>
          <Field label="Stage (TNM)"><input className="inp" placeholder="cT2N1M0" value={form.stageTnm || ""} onChange={(e) => setForm({ ...form, stageTnm: e.target.value })} /></Field>
          <Field label="Grade"><input className="inp" placeholder="G2" value={form.grade || ""} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></Field>
          <Field label="Biomarkers"><input className="inp" placeholder="ER+/PR+/HER2-" value={form.biomarkers || ""} onChange={(e) => setForm({ ...form, biomarkers: e.target.value })} /></Field>
          <Field label="ECOG"><select className="inp" value={form.ecog ?? ""} onChange={(e) => setForm({ ...form, ecog: e.target.value === "" ? undefined : Number(e.target.value) as PerformanceStatus })}><option value="">-</option>{ECOG.map((e) => <option key={e} value={e}>{e}</option>)}</select></Field>

          <Field label="Prior treatment" full><textarea className="inp" rows={2} value={form.priorTreatment || ""} onChange={(e) => setForm({ ...form, priorTreatment: e.target.value })} /></Field>
          <Field label="Presenting concern *" full><textarea className="inp" rows={2} value={form.presentingConcern || ""} onChange={(e) => setForm({ ...form, presentingConcern: e.target.value })} /></Field>
          <Field label="Imaging summary" full><textarea className="inp" rows={2} value={form.imagingSummary || ""} onChange={(e) => setForm({ ...form, imagingSummary: e.target.value })} /></Field>
          <Field label="Pathology summary" full><textarea className="inp" rows={2} value={form.pathologySummary || ""} onChange={(e) => setForm({ ...form, pathologySummary: e.target.value })} /></Field>
          <Field label="Lab summary" full><textarea className="inp" rows={2} value={form.labSummary || ""} onChange={(e) => setForm({ ...form, labSummary: e.target.value })} /></Field>

          <Field label="Intent"><select className="inp" value={form.intent || ""} onChange={(e) => setForm({ ...form, intent: (e.target.value || undefined) as CaseIntent })}><option value="">-</option>{INTENTS.map((i) => <option key={i} value={i}>{INTENT_LABEL[i]}</option>)}</select></Field>
          <Field label="Case status"><select className="inp" value={form.caseStatus || "new"} onChange={(e) => setForm({ ...form, caseStatus: e.target.value as CaseStatus })}>{CASE_STATUSES.map((s) => <option key={s} value={s}>{CASE_STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Next review date"><input type="date" className="inp" value={(form.nextReviewDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, nextReviewDate: e.target.value })} /></Field>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold text-slate-800">Planned modalities</div>
          <div className="flex flex-wrap gap-2">
            {MODALITIES.map((m) => {
              const active = (form.plannedModalities || []).includes(m);
              return <button key={m} onClick={() => toggleMod(m)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{MODALITY_LABEL[m]}</button>;
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Discussion" full><textarea className="inp" rows={3} value={form.discussion || ""} onChange={(e) => setForm({ ...form, discussion: e.target.value })} /></Field>
          <Field label="MDT recommendation" full><textarea className="inp" rows={3} value={form.recommendation || ""} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} /></Field>
          <Field label="Next step" full><input className="inp" value={form.nextStep || ""} onChange={(e) => setForm({ ...form, nextStep: e.target.value })} /></Field>
          <Field label="Clinical trial eligibility" full><input className="inp" value={form.trialEligibility || ""} onChange={(e) => setForm({ ...form, trialEligibility: e.target.value })} /></Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.secondOpinionRequested} onChange={(e) => setForm({ ...form, secondOpinionRequested: e.target.checked })} /> Second opinion requested</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.consentObtained} onChange={(e) => setForm({ ...form, consentObtained: e.target.checked })} /> Consent obtained</label>
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
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{children}</button>;
}
function Pill({ status, children }: { status: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    scheduled: "bg-indigo-100 text-indigo-700", in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-rose-100 text-rose-700",
    new: "bg-amber-100 text-amber-700", follow_up: "bg-slate-100 text-slate-700",
    discussed: "bg-emerald-100 text-emerald-700", deferred: "bg-rose-100 text-rose-700",
    closed: "bg-slate-100 text-slate-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`block ${full ? "md:col-span-3" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-8 text-center text-sm text-slate-500">{children}</div>;
}
