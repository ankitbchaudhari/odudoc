"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type { CardiologyStudy, StudyType, StudyStatus, Rhythm, Urgency } from "@/lib/hospital/cardiology-store";
// Inlined from cardiology-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const STUDY_LABEL: Record<StudyType, string> = {
  ecg_12lead: "ECG (12-lead)", echo_tte: "Echo (TTE)", echo_tee: "Echo (TEE)",
  stress_tmt: "Stress / TMT", stress_echo: "Stress echo",
  holter_24h: "Holter 24h", holter_48h: "Holter 48h", event_monitor: "Event monitor",
  abpm: "ABPM", tilt_table: "Tilt table", cpet: "CPET", other: "Other",
};
const RHYTHM_LABEL: Record<Rhythm, string> = {
  sinus: "NSR", sinus_brady: "Sinus brady", sinus_tachy: "Sinus tachy",
  afib: "AFib", aflutter: "AFlutter", svt: "SVT", vt: "VT", vf: "VF",
  paced: "Paced", avb_1: "1° AVB", avb_2: "2° AVB", avb_3: "3° AVB (CHB)", other: "Other",
};
function qtcBazett(qtMs: number, hr: number): number | null {
  if (!qtMs || !hr || hr <= 0) return null;
  const rr = 60 / hr;
  return Math.round(qtMs / Math.sqrt(rr));
}

interface Patient { id: string; firstName: string; lastName: string; mrn?: string }

const TYPES: StudyType[] = ["ecg_12lead","echo_tte","echo_tee","stress_tmt","stress_echo","holter_24h","holter_48h","event_monitor","abpm","tilt_table","cpet","other"];
const STATUSES: StudyStatus[] = ["requested","in_progress","reported","amended","cancelled"];
const RHYTHMS: Rhythm[] = ["sinus","sinus_brady","sinus_tachy","afib","aflutter","svt","vt","vf","paced","avb_1","avb_2","avb_3","other"];
const URGENCIES: Urgency[] = ["routine","urgent","stat"];

const STATUS_COLOR: Record<StudyStatus, string> = {
  requested: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  reported: "bg-emerald-100 text-emerald-700",
  amended: "bg-violet-100 text-violet-700",
  cancelled: "bg-slate-100 text-slate-500 line-through",
};
const URGENCY_COLOR: Record<Urgency, string> = {
  routine: "bg-slate-100 text-slate-600", urgent: "bg-amber-100 text-amber-700", stat: "bg-rose-100 text-rose-700",
};
function fmt(iso?: string) { return iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }

export default function CardiologyPage() {
  const [studies, setStudies] = useState<CardiologyStudy[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<StudyStatus | "">("");
  const [filterType, setFilterType] = useState<StudyType | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editStudy, setEditStudy] = useState<CardiologyStudy | null>(null);
  const [reportStudy, setReportStudy] = useState<CardiologyStudy | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    if (filterType) p.set("studyType", filterType);
    const [r, pR] = await Promise.all([
      fetch(`/api/hospital/cardiology?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (r.ok) { const d = await r.json(); setStudies(d.studies || []); setStats(d.stats); }
    if (pR.ok) { const d = await pR.json(); setPatients(d.patients || []); }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterStatus, filterType]);

  async function save(body: Partial<CardiologyStudy>) {
    const method = body.id ? "PATCH" : "POST";
    const r = await fetch("/api/hospital/cardiology", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || "Failed"); return; }
    setShowForm(false); setEditStudy(null); setReportStudy(null); load();
  }
  async function transition(id: string, status: StudyStatus) { await save({ id, status }); }
  async function del(id: string) {
    if (!confirm("Delete this study?")) return;
    await fetch("/api/hospital/cardiology", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="❤️"
        eyebrow="Cardiac Diagnostics"
        title="Cardiology Studies"
        subtitle="ECG, echo, stress, Holter, ABPM with structured findings & auto-QTc (Bazett)"
        tone="rose"
        primaryAction={{ label: "+ Request study", onClick: () => { setEditStudy(null); setShowForm(true); } }}
      />

      {stats && (
        <StatGrid cols={4}>
          <StatCard label="Requested today" value={stats.requestedToday} tone="sky" icon="📥" />
          <StatCard label="Pending reports" value={stats.pendingReports} tone={stats.pendingReports > 0 ? "amber" : "slate"} icon="📝" />
          <StatCard label="STAT pending" value={stats.statPending} tone={stats.statPending > 0 ? "rose" : "slate"} icon="🚨" />
          <StatCard label="Reported (mo)" value={stats.reportedMonth} tone="emerald" icon="✓" />
          <StatCard label="Amended (mo)" value={stats.amendedMonth} tone="violet" icon="✎" />
          <StatCard label="Avg TAT (hrs)" value={stats.avgTatHours} tone="indigo" icon="⏱️" />
          <StatCard label="Low EF<40 (mo)" value={stats.abnormalEfMonth} tone={stats.abnormalEfMonth > 0 ? "rose" : "slate"} icon="💔" />
          <StatCard label="+ Stress (mo)" value={stats.positiveStressMonth} tone={stats.positiveStressMonth > 0 ? "amber" : "slate"} icon="🏃" />
        </StatGrid>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</span>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as StudyStatus | "")} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
          <option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Type</span>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as StudyType | "")} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
          <option value="">All</option>{TYPES.map((t) => <option key={t} value={t}>{STUDY_LABEL[t]}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading…</div>
      ) : studies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No studies yet.</div>
      ) : (
        <div className="space-y-2">
          {studies.map((s) => <StudyCard key={s.id} s={s} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} onEdit={() => { setEditStudy(s); setShowForm(true); }} onReport={() => setReportStudy(s)} onTransition={transition} onDelete={() => del(s.id)} />)}
        </div>
      )}

      {showForm && <StudyFormModal study={editStudy} patients={patients} onClose={() => { setShowForm(false); setEditStudy(null); }} onSave={save} />}
      {reportStudy && <ReportModal study={reportStudy} onClose={() => setReportStudy(null)} onSave={save} />}
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number | string; tone?: "slate" | "amber" | "rose" | "emerald" }) {
  const c = { slate: "text-slate-900", amber: "text-amber-700", rose: "text-rose-700", emerald: "text-emerald-700" }[tone];
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-xs text-slate-500">{label}</div><div className={`mt-0.5 text-xl font-semibold ${c}`}>{value}</div></div>;
}

function StudyCard({ s, expanded, onToggle, onEdit, onReport, onTransition, onDelete }: {
  s: CardiologyStudy; expanded: boolean; onToggle: () => void; onEdit: () => void;
  onReport: () => void; onTransition: (id: string, status: StudyStatus) => void; onDelete: () => void;
}) {
  const abnormalEf = s.ejectionFraction != null && s.ejectionFraction < 40;
  const longQtc = s.qtcMs != null && s.qtcMs > 470;
  return (
    <div className={`rounded-lg border bg-white ${abnormalEf || longQtc ? "border-rose-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start gap-3 p-3">
        <div className="flex-1 min-w-[240px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[s.status]}`}>{s.status.replace(/_/g, " ")}</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{STUDY_LABEL[s.studyType]}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_COLOR[s.urgency]}`}>{s.urgency}</span>
            {s.rhythm && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">{RHYTHM_LABEL[s.rhythm]}</span>}
            {s.ejectionFraction != null && <span className={`rounded-full px-2 py-0.5 text-xs ${abnormalEf ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>EF {s.ejectionFraction}%</span>}
            {longQtc && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">QTc {s.qtcMs}</span>}
            {s.testResult === "positive" && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">Positive stress</span>}
          </div>
          <div className="mt-1 font-semibold text-slate-900">{s.patientName}</div>
          <div className="text-xs text-slate-500">{s.id} · requested {fmt(s.requestedAt)}{s.requestedBy ? ` · by ${s.requestedBy}` : ""}</div>
          <div className="mt-1 text-sm text-slate-700">Indication: {s.indication}</div>
          {s.conclusion && <div className="mt-1 text-sm text-slate-600"><span className="font-medium">Conclusion:</span> {s.conclusion}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {s.status === "requested" && <button onClick={() => onTransition(s.id, "in_progress")} className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700">Start</button>}
          {s.status !== "reported" && s.status !== "cancelled" && <button onClick={onReport} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">Report</button>}
          {s.status === "reported" && <button onClick={onReport} className="rounded-md border border-violet-300 bg-white px-2 py-1 text-xs text-violet-700 hover:bg-violet-50">Amend</button>}
          <button onClick={onEdit} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
          <button onClick={onDelete} className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Delete</button>
          {(s.findings || s.recommendation) && <button onClick={onToggle} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">{expanded ? "Hide" : "Details"}</button>}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-3 text-sm text-slate-700 space-y-2">
          {s.findings && <div><span className="font-medium">Findings:</span> {s.findings}</div>}
          {s.recommendation && <div><span className="font-medium">Recommendation:</span> {s.recommendation}</div>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {s.heartRate && <span>HR {s.heartRate}</span>}
            {s.prMs && <span>PR {s.prMs} ms</span>}
            {s.qrsMs && <span>QRS {s.qrsMs} ms</span>}
            {s.qtMs && <span>QT {s.qtMs} ms</span>}
            {s.qtcMs && <span>QTc {s.qtcMs} ms</span>}
            {s.axis && <span>Axis {s.axis}</span>}
            {s.lvidd && <span>LVIDd {s.lvidd}</span>}
            {s.rvsp && <span>RVSP {s.rvsp}</span>}
            {s.exerciseMin && <span>Ex {s.exerciseMin} min</span>}
            {s.metsAchieved && <span>{s.metsAchieved} METs</span>}
            {s.pvcCount != null && <span>PVCs {s.pvcCount}</span>}
            {s.performedBy && <span>Performed by {s.performedBy}</span>}
            {s.interpretedBy && <span>Read by {s.interpretedBy}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function StudyFormModal({ study, patients, onClose, onSave }: { study: CardiologyStudy | null; patients: Patient[]; onClose: () => void; onSave: (b: Partial<CardiologyStudy>) => void }) {
  const [form, setForm] = useState({
    patientId: study?.patientId || "", patientName: study?.patientName || "",
    studyType: (study?.studyType || "ecg_12lead") as StudyType,
    indication: study?.indication || "",
    urgency: (study?.urgency || "routine") as Urgency,
    requestedBy: study?.requestedBy || "",
  });
  function pick(id: string) {
    const p = patients.find((x) => x.id === id);
    setForm({ ...form, patientId: id, patientName: p ? `${p.firstName} ${p.lastName}` : "" });
  }
  function submit() {
    if (!form.patientId || !form.indication) { alert("Patient & indication required"); return; }
    onSave({ id: study?.id, ...form });
  }
  return (
    <Modal title={study ? `Edit ${study.id}` : "Request study"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient" full>
          <select value={form.patientId} onChange={(e) => pick(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" disabled={!!study}>
            <option value="">Select patient…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.mrn ? ` · ${p.mrn}` : ""}</option>)}
          </select>
        </Field>
        <Field label="Study type">
          <select value={form.studyType} onChange={(e) => setForm({ ...form, studyType: e.target.value as StudyType })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{TYPES.map((t) => <option key={t} value={t}>{STUDY_LABEL[t]}</option>)}</select>
        </Field>
        <Field label="Urgency">
          <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{URGENCIES.map((u) => <option key={u} value={u}>{u}</option>)}</select>
        </Field>
        <Field label="Indication" full><input value={form.indication} onChange={(e) => setForm({ ...form, indication: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Requested by"><input value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
      </div>
      <ModalActions onClose={onClose} onSave={submit} />
    </Modal>
  );
}

function ReportModal({ study, onClose, onSave }: { study: CardiologyStudy; onClose: () => void; onSave: (b: Partial<CardiologyStudy>) => void }) {
  const isEcgLike = study.studyType === "ecg_12lead" || study.studyType === "holter_24h" || study.studyType === "holter_48h" || study.studyType === "event_monitor";
  const isEcho = study.studyType === "echo_tte" || study.studyType === "echo_tee" || study.studyType === "stress_echo";
  const isStress = study.studyType === "stress_tmt" || study.studyType === "stress_echo" || study.studyType === "cpet";
  const isHolter = study.studyType === "holter_24h" || study.studyType === "holter_48h";
  const amending = study.status === "reported";

  const [f, setF] = useState<any>({
    performedBy: study.performedBy || "", interpretedBy: study.interpretedBy || "",
    heartRate: study.heartRate?.toString() || "", rhythm: (study.rhythm || "") as Rhythm | "",
    prMs: study.prMs?.toString() || "", qrsMs: study.qrsMs?.toString() || "", qtMs: study.qtMs?.toString() || "", qtcMs: study.qtcMs?.toString() || "",
    axis: study.axis || "",
    ejectionFraction: study.ejectionFraction?.toString() || "",
    lvidd: study.lvidd?.toString() || "", lvids: study.lvids?.toString() || "",
    ivsd: study.ivsd?.toString() || "", lvpwd: study.lvpwd?.toString() || "",
    laDiameter: study.laDiameter?.toString() || "", aorticRoot: study.aorticRoot?.toString() || "", rvsp: study.rvsp?.toString() || "",
    exerciseMin: study.exerciseMin?.toString() || "", metsAchieved: study.metsAchieved?.toString() || "",
    peakHr: study.peakHr?.toString() || "", peakBp: study.peakBp || "",
    stDepressionMm: study.stDepressionMm?.toString() || "",
    testResult: study.testResult || "",
    totalBeats: study.totalBeats?.toString() || "", pvcCount: study.pvcCount?.toString() || "", pacCount: study.pacCount?.toString() || "",
    pausesCount: study.pausesCount?.toString() || "", longestPauseSec: study.longestPauseSec?.toString() || "",
    findings: study.findings || "", conclusion: study.conclusion || "", recommendation: study.recommendation || "",
  });

  // Auto QTc
  const autoQtc = (() => {
    const hr = Number(f.heartRate), qt = Number(f.qtMs);
    if (!hr || !qt) return null;
    return qtcBazett(qt, hr);
  })();

  function num(v: string): number | undefined { return v !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined; }

  function submit() {
    const body: Partial<CardiologyStudy> = {
      id: study.id,
      status: amending ? "amended" : "reported",
      performedBy: f.performedBy || undefined, interpretedBy: f.interpretedBy || undefined,
      heartRate: num(f.heartRate), rhythm: f.rhythm || undefined,
      prMs: num(f.prMs), qrsMs: num(f.qrsMs), qtMs: num(f.qtMs),
      qtcMs: num(f.qtcMs) ?? (autoQtc ?? undefined),
      axis: f.axis || undefined,
      ejectionFraction: num(f.ejectionFraction),
      lvidd: num(f.lvidd), lvids: num(f.lvids), ivsd: num(f.ivsd), lvpwd: num(f.lvpwd),
      laDiameter: num(f.laDiameter), aorticRoot: num(f.aorticRoot), rvsp: num(f.rvsp),
      exerciseMin: num(f.exerciseMin), metsAchieved: num(f.metsAchieved), peakHr: num(f.peakHr),
      peakBp: f.peakBp || undefined, stDepressionMm: num(f.stDepressionMm),
      testResult: f.testResult || undefined,
      totalBeats: num(f.totalBeats), pvcCount: num(f.pvcCount), pacCount: num(f.pacCount),
      pausesCount: num(f.pausesCount), longestPauseSec: num(f.longestPauseSec),
      findings: f.findings || undefined, conclusion: f.conclusion || undefined, recommendation: f.recommendation || undefined,
    };
    onSave(body);
  }

  return (
    <Modal title={`${amending ? "Amend" : "Report"} ${study.id} — ${STUDY_LABEL[study.studyType]}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Performed by"><input value={f.performedBy} onChange={(e) => setF({ ...f, performedBy: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="Interpreted by"><input value={f.interpretedBy} onChange={(e) => setF({ ...f, interpretedBy: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        </div>

        {isEcgLike && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">ECG intervals</h3>
            <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-6">
              <Field label="HR"><input type="number" value={f.heartRate} onChange={(e) => setF({ ...f, heartRate: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Rhythm">
                <select value={f.rhythm} onChange={(e) => setF({ ...f, rhythm: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                  <option value="">—</option>{RHYTHMS.map((r) => <option key={r} value={r}>{RHYTHM_LABEL[r]}</option>)}
                </select>
              </Field>
              <Field label="PR ms"><input type="number" value={f.prMs} onChange={(e) => setF({ ...f, prMs: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="QRS ms"><input type="number" value={f.qrsMs} onChange={(e) => setF({ ...f, qrsMs: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="QT ms"><input type="number" value={f.qtMs} onChange={(e) => setF({ ...f, qtMs: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label={`QTc ms${autoQtc ? ` (auto ${autoQtc})` : ""}`}><input type="number" value={f.qtcMs} onChange={(e) => setF({ ...f, qtcMs: e.target.value })} placeholder={autoQtc?.toString() || ""} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Axis"><input value={f.axis} onChange={(e) => setF({ ...f, axis: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
            </div>
          </section>
        )}

        {isEcho && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Echo measurements</h3>
            <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="EF %"><input type="number" value={f.ejectionFraction} onChange={(e) => setF({ ...f, ejectionFraction: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="LVIDd mm"><input type="number" value={f.lvidd} onChange={(e) => setF({ ...f, lvidd: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="LVIDs mm"><input type="number" value={f.lvids} onChange={(e) => setF({ ...f, lvids: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="IVSd mm"><input type="number" value={f.ivsd} onChange={(e) => setF({ ...f, ivsd: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="LVPWd mm"><input type="number" value={f.lvpwd} onChange={(e) => setF({ ...f, lvpwd: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="LA mm"><input type="number" value={f.laDiameter} onChange={(e) => setF({ ...f, laDiameter: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Ao root mm"><input type="number" value={f.aorticRoot} onChange={(e) => setF({ ...f, aorticRoot: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="RVSP mmHg"><input type="number" value={f.rvsp} onChange={(e) => setF({ ...f, rvsp: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
            </div>
          </section>
        )}

        {isStress && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stress test</h3>
            <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Exercise min"><input type="number" value={f.exerciseMin} onChange={(e) => setF({ ...f, exerciseMin: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="METs"><input type="number" value={f.metsAchieved} onChange={(e) => setF({ ...f, metsAchieved: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Peak HR"><input type="number" value={f.peakHr} onChange={(e) => setF({ ...f, peakHr: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Peak BP"><input value={f.peakBp} onChange={(e) => setF({ ...f, peakBp: e.target.value })} placeholder="160/80" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="ST Δ mm"><input type="number" value={f.stDepressionMm} onChange={(e) => setF({ ...f, stDepressionMm: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Result">
                <select value={f.testResult} onChange={(e) => setF({ ...f, testResult: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                  <option value="">—</option><option value="negative">Negative</option><option value="positive">Positive</option><option value="equivocal">Equivocal</option><option value="inconclusive">Inconclusive</option>
                </select>
              </Field>
            </div>
          </section>
        )}

        {isHolter && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Holter burden</h3>
            <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-5">
              <Field label="Total beats"><input type="number" value={f.totalBeats} onChange={(e) => setF({ ...f, totalBeats: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="PVCs"><input type="number" value={f.pvcCount} onChange={(e) => setF({ ...f, pvcCount: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="PACs"><input type="number" value={f.pacCount} onChange={(e) => setF({ ...f, pacCount: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Pauses"><input type="number" value={f.pausesCount} onChange={(e) => setF({ ...f, pausesCount: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Longest pause (s)"><input type="number" value={f.longestPauseSec} onChange={(e) => setF({ ...f, longestPauseSec: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
            </div>
          </section>
        )}

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Narrative</h3>
          <textarea value={f.findings} onChange={(e) => setF({ ...f, findings: e.target.value })} rows={3} placeholder="Findings" className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <textarea value={f.conclusion} onChange={(e) => setF({ ...f, conclusion: e.target.value })} rows={2} placeholder="Conclusion" className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <textarea value={f.recommendation} onChange={(e) => setF({ ...f, recommendation: e.target.value })} rows={2} placeholder="Recommendation" className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </section>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saveLabel={amending ? "Save amendment" : "Finalize report"} />
    </Modal>
  );
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}><div className={`max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white shadow-xl ${wide ? "max-w-4xl" : "max-w-2xl"}`} onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-200 px-5 py-3"><h2 className="text-lg font-semibold text-slate-900">{title}</h2><button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button></div><div className="p-5">{children}</div></div></div>;
}
function ModalActions({ onClose, onSave, saveLabel = "Save" }: { onClose: () => void; onSave: () => void; saveLabel?: string }) {
  return <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button><button onClick={onSave} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">{saveLabel}</button></div>;
}
function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={`block text-sm ${full ? "col-span-2" : ""}`}><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}
