"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type { TeleConsult, ConsultStatus, ConsultMode, ConnectivityQuality, Prescription } from "@/lib/hospital/telemedicine-store";
// Inlined from telemedicine-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const MODE_LABEL: Record<ConsultMode, string> = {
  video: "Video", audio: "Audio", chat: "Chat", async: "Async",
};
const STATUS_LABEL: Record<ConsultStatus, string> = {
  scheduled: "Scheduled", in_progress: "In progress", completed: "Completed",
  no_show: "No show", cancelled: "Cancelled", tech_failed: "Tech failed",
};

interface Patient { id: string; firstName: string; lastName: string; mrn?: string }

const MODES: ConsultMode[] = ["video","audio","chat","async"];
const STATUSES: ConsultStatus[] = ["scheduled","in_progress","completed","no_show","cancelled","tech_failed"];
const QUALS: ConnectivityQuality[] = ["excellent","good","fair","poor"];

const STATUS_COLOR: Record<ConsultStatus, string> = {
  scheduled: "bg-sky-100 text-sky-700", in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700", no_show: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-500 line-through", tech_failed: "bg-rose-100 text-rose-700",
};
const MODE_ICON: Record<ConsultMode, string> = { video: "🎥", audio: "📞", chat: "💬", async: "✉️" };
function toLocal(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmt(iso?: string) { return iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }

export default function TelemedicinePage() {
  const [consults, setConsults] = useState<TeleConsult[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState<ConsultStatus | "">("");
  const [fMode, setFMode] = useState<ConsultMode | "">("");
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<TeleConsult | null>(null);
  const [complete, setComplete] = useState<TeleConsult | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (fStatus) p.set("status", fStatus); if (fMode) p.set("mode", fMode);
    const [r, pR] = await Promise.all([
      fetch(`/api/hospital/telemedicine?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (r.ok) { const d = await r.json(); setConsults(d.consults || []); setStats(d.stats); }
    if (pR.ok) { const d = await pR.json(); setPatients(d.patients || []); }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [fStatus, fMode]);

  async function save(body: Partial<TeleConsult>) {
    const method = body.id ? "PATCH" : "POST";
    const r = await fetch("/api/hospital/telemedicine", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || "Failed"); return; }
    setShowForm(false); setEdit(null); setComplete(null); load();
  }
  async function transition(id: string, status: ConsultStatus) { await save({ id, status }); }
  async function del(id: string) {
    if (!confirm("Delete this consult?")) return;
    await fetch("/api/hospital/telemedicine", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🎥"
        eyebrow="Virtual Care"
        title="Telemedicine"
        subtitle="Video / audio / chat / async consults with SOAP notes, e-prescription, and QoS tracking"
        tone="emerald"
        primaryAction={{ label: "+ Schedule consult", onClick: () => { setEdit(null); setShowForm(true); } }}
      />

      {stats && (
        <StatGrid cols={5}>
          <StatCard label="Scheduled today" value={stats.scheduledToday} tone="sky" icon="📅" />
          <StatCard label="In progress" value={stats.inProgress} tone={stats.inProgress > 0 ? "amber" : "slate"} icon="🔴" />
          <StatCard label="Completed (mo)" value={stats.completedMonth} tone="emerald" icon="✓" />
          <StatCard label="No-show (mo)" value={stats.noShowMonth} tone={stats.noShowMonth > 0 ? "rose" : "slate"} icon="👻" />
          <StatCard label="Cancelled (mo)" value={stats.cancelledMonth} tone="slate" icon="✕" />
          <StatCard label="Tech failed" value={stats.techFailedMonth} tone={stats.techFailedMonth > 0 ? "rose" : "slate"} icon="⚠️" />
          <StatCard label="No-show rate" value={`${stats.noShowRate}%`} tone={stats.noShowRate > 20 ? "rose" : stats.noShowRate > 10 ? "amber" : "emerald"} icon="📉" />
          <StatCard label="Avg duration" value={`${stats.avgDurationMin}m`} tone="indigo" icon="⏱️" />
          <StatCard label="Revenue (mo)" value={stats.revenue} tone="violet" icon="💰" />
        </StatGrid>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</span>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as ConsultStatus | "")} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Mode</span>
        <select value={fMode} onChange={(e) => setFMode(e.target.value as ConsultMode | "")} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"><option value="">All</option>{MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading…</div>
      ) : consults.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No consults yet.</div>
      ) : (
        <div className="space-y-2">
          {consults.map((c) => <ConsultCard key={c.id} c={c} expanded={expanded === c.id} onToggle={() => setExpanded(expanded === c.id ? null : c.id)} onEdit={() => { setEdit(c); setShowForm(true); }} onComplete={() => setComplete(c)} onTransition={transition} onDelete={() => del(c.id)} />)}
        </div>
      )}

      {showForm && <ConsultFormModal consult={edit} patients={patients} onClose={() => { setShowForm(false); setEdit(null); }} onSave={save} />}
      {complete && <CompleteModal consult={complete} onClose={() => setComplete(null)} onSave={save} />}
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number | string; tone?: "slate" | "amber" | "rose" | "emerald" }) {
  const c = { slate: "text-slate-900", amber: "text-amber-700", rose: "text-rose-700", emerald: "text-emerald-700" }[tone];
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-xs text-slate-500">{label}</div><div className={`mt-0.5 text-xl font-semibold ${c}`}>{value}</div></div>;
}

function ConsultCard({ c, expanded, onToggle, onEdit, onComplete, onTransition, onDelete }: {
  c: TeleConsult; expanded: boolean; onToggle: () => void; onEdit: () => void;
  onComplete: () => void; onTransition: (id: string, status: ConsultStatus) => void; onDelete: () => void;
}) {
  const upcoming = c.status === "scheduled" && new Date(c.scheduledAt).getTime() - Date.now() < 15 * 60_000 && new Date(c.scheduledAt).getTime() > Date.now();
  return (
    <div className={`rounded-lg border bg-white ${upcoming ? "border-emerald-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start gap-3 p-3">
        <div className="flex-1 min-w-[240px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[c.status]}`}>{STATUS_LABEL[c.status]}</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{MODE_ICON[c.mode]} {MODE_LABEL[c.mode]}</span>
            {c.specialty && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{c.specialty}</span>}
            {c.consentRecorded && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Consent ✓</span>}
            {c.identityVerified && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">ID verified</span>}
            {c.feePaid && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Paid</span>}
            {c.connectivityQuality === "poor" && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">Poor QoS</span>}
            {upcoming && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Starting soon</span>}
          </div>
          <div className="mt-1 font-semibold text-slate-900">{c.patientName} · <span className="font-normal text-slate-600">{c.providerName}</span></div>
          <div className="text-xs text-slate-500">{c.id} · {fmt(c.scheduledAt)}{c.durationMin != null ? ` · ${c.durationMin} min` : ""}{c.platform ? ` · ${c.platform}` : ""}</div>
          {c.chiefComplaint && <div className="mt-1 text-sm text-slate-700">CC: {c.chiefComplaint}</div>}
          {c.meetingUrl && (c.status === "scheduled" || c.status === "in_progress") && (
            <a href={c.meetingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-sky-600 hover:underline">Join meeting →</a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {c.status === "scheduled" && <>
            <button onClick={() => onTransition(c.id, "in_progress")} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">Start</button>
            <button onClick={() => onTransition(c.id, "no_show")} className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">No show</button>
          </>}
          {c.status === "in_progress" && <button onClick={onComplete} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">Complete + note</button>}
          <button onClick={onEdit} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
          <button onClick={onDelete} className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Delete</button>
          {(c.assessment || c.plan || (c.prescriptions && c.prescriptions.length > 0)) && <button onClick={onToggle} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">{expanded ? "Hide" : "Note"}</button>}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-3 text-sm text-slate-700 space-y-2">
          {c.historyNote && <div><span className="font-medium">History:</span> {c.historyNote}</div>}
          {c.examNote && <div><span className="font-medium">Exam:</span> {c.examNote}</div>}
          {c.assessment && <div><span className="font-medium">Assessment:</span> {c.assessment}</div>}
          {c.plan && <div><span className="font-medium">Plan:</span> {c.plan}</div>}
          {c.prescriptions && c.prescriptions.length > 0 && (
            <div>
              <div className="font-medium">Rx:</div>
              <ul className="ml-4 list-disc">{c.prescriptions.map((rx, i) => <li key={i}>{rx.medication}{rx.dosage ? ` ${rx.dosage}` : ""}{rx.frequency ? ` · ${rx.frequency}` : ""}{rx.duration ? ` × ${rx.duration}` : ""}{rx.instructions ? ` — ${rx.instructions}` : ""}</li>)}</ul>
            </div>
          )}
          {c.followUpDate && <div className="text-xs text-slate-500"><span className="font-medium">Follow-up:</span> {new Date(c.followUpDate).toLocaleDateString()}</div>}
          {c.referralNote && <div className="text-xs text-slate-500"><span className="font-medium">Referral:</span> {c.referralNote}</div>}
        </div>
      )}
    </div>
  );
}

function ConsultFormModal({ consult, patients, onClose, onSave }: { consult: TeleConsult | null; patients: Patient[]; onClose: () => void; onSave: (b: Partial<TeleConsult>) => void }) {
  const [f, setF] = useState({
    patientId: consult?.patientId || "", patientName: consult?.patientName || "",
    providerName: consult?.providerName || "", providerId: consult?.providerId || "", specialty: consult?.specialty || "",
    mode: (consult?.mode || "video") as ConsultMode,
    scheduledAt: consult ? toLocal(consult.scheduledAt) : toLocal(new Date().toISOString()),
    platform: consult?.platform || "", meetingUrl: consult?.meetingUrl || "", meetingId: consult?.meetingId || "",
    chiefComplaint: consult?.chiefComplaint || "", patientLocation: consult?.patientLocation || "",
    consentRecorded: consult?.consentRecorded ?? false,
    feeAmount: consult?.feeAmount?.toString() || "",
  });
  function pick(id: string) {
    const p = patients.find((x) => x.id === id);
    setF({ ...f, patientId: id, patientName: p ? `${p.firstName} ${p.lastName}` : "" });
  }
  function submit() {
    if (!f.patientId || !f.providerName || !f.scheduledAt) { alert("Patient, provider, schedule required"); return; }
    onSave({
      id: consult?.id, patientId: f.patientId, patientName: f.patientName,
      providerName: f.providerName, providerId: f.providerId || undefined, specialty: f.specialty || undefined,
      mode: f.mode, scheduledAt: new Date(f.scheduledAt).toISOString(),
      platform: f.platform || undefined, meetingUrl: f.meetingUrl || undefined, meetingId: f.meetingId || undefined,
      chiefComplaint: f.chiefComplaint || undefined, patientLocation: f.patientLocation || undefined,
      consentRecorded: f.consentRecorded,
      feeAmount: f.feeAmount ? Number(f.feeAmount) : undefined,
    });
  }
  return (
    <Modal title={consult ? `Edit ${consult.id}` : "Schedule consult"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient" full>
          <select value={f.patientId} onChange={(e) => pick(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" disabled={!!consult}>
            <option value="">Select patient…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.mrn ? ` · ${p.mrn}` : ""}</option>)}
          </select>
        </Field>
        <Field label="Provider name"><input value={f.providerName} onChange={(e) => setF({ ...f, providerName: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Specialty"><input value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Mode"><select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value as ConsultMode })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select></Field>
        <Field label="Scheduled at"><input type="datetime-local" value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Platform"><input value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} placeholder="Jitsi, Zoom, WhatsApp" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Meeting URL" full><input value={f.meetingUrl} onChange={(e) => setF({ ...f, meetingUrl: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Meeting ID"><input value={f.meetingId} onChange={(e) => setF({ ...f, meetingId: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Fee"><input type="number" value={f.feeAmount} onChange={(e) => setF({ ...f, feeAmount: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Patient location"><input value={f.patientLocation} onChange={(e) => setF({ ...f, patientLocation: e.target.value })} placeholder="City, State" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Chief complaint" full><textarea value={f.chiefComplaint} onChange={(e) => setF({ ...f, chiefComplaint: e.target.value })} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.consentRecorded} onChange={(e) => setF({ ...f, consentRecorded: e.target.checked })} />Tele-consent recorded</label>
      </div>
      <ModalActions onClose={onClose} onSave={submit} />
    </Modal>
  );
}

function CompleteModal({ consult, onClose, onSave }: { consult: TeleConsult; onClose: () => void; onSave: (b: Partial<TeleConsult>) => void }) {
  const [f, setF] = useState({
    historyNote: consult.historyNote || "", examNote: consult.examNote || "",
    assessment: consult.assessment || "", plan: consult.plan || "",
    followUpDate: consult.followUpDate || "", referralNote: consult.referralNote || "",
    connectivityQuality: (consult.connectivityQuality || "") as ConnectivityQuality | "",
    identityVerified: consult.identityVerified ?? false,
    feePaid: consult.feePaid ?? false,
  });
  const [rx, setRx] = useState<Prescription[]>(consult.prescriptions || []);
  function addRx() { setRx([...rx, { medication: "" }]); }
  function updRx(i: number, patch: Partial<Prescription>) { setRx(rx.map((x, k) => k === i ? { ...x, ...patch } : x)); }
  function rmRx(i: number) { setRx(rx.filter((_, k) => k !== i)); }
  function submit() {
    onSave({
      id: consult.id, status: "completed",
      historyNote: f.historyNote || undefined, examNote: f.examNote || undefined,
      assessment: f.assessment || undefined, plan: f.plan || undefined,
      followUpDate: f.followUpDate || undefined, referralNote: f.referralNote || undefined,
      connectivityQuality: f.connectivityQuality || undefined,
      identityVerified: f.identityVerified, feePaid: f.feePaid,
      prescriptions: rx.filter((r) => r.medication.trim()),
    });
  }
  return (
    <Modal title={`Complete ${consult.id} — ${consult.patientName}`} onClose={onClose} wide>
      <div className="space-y-4">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">SOAP note</h3>
          <Field label="History (S)" full><textarea value={f.historyNote} onChange={(e) => setF({ ...f, historyNote: e.target.value })} rows={2} className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="Exam (O)" full><textarea value={f.examNote} onChange={(e) => setF({ ...f, examNote: e.target.value })} rows={2} className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="Assessment (A)" full><textarea value={f.assessment} onChange={(e) => setF({ ...f, assessment: e.target.value })} rows={2} className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="Plan (P)" full><textarea value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })} rows={2} className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prescriptions</h3>
            <button onClick={addRx} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">+ Add</button>
          </div>
          <div className="mt-2 space-y-2">
            {rx.length === 0 && <div className="rounded-md border border-dashed border-slate-300 p-2 text-xs text-slate-500">No Rx</div>}
            {rx.map((r, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-slate-50/40 p-2 md:grid-cols-5">
                <input value={r.medication} onChange={(e) => updRx(i, { medication: e.target.value })} placeholder="Medication" className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                <input value={r.dosage || ""} onChange={(e) => updRx(i, { dosage: e.target.value })} placeholder="Dose" className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                <input value={r.frequency || ""} onChange={(e) => updRx(i, { frequency: e.target.value })} placeholder="Freq" className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                <input value={r.duration || ""} onChange={(e) => updRx(i, { duration: e.target.value })} placeholder="Duration" className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                <div className="flex gap-1">
                  <input value={r.instructions || ""} onChange={(e) => updRx(i, { instructions: e.target.value })} placeholder="Notes" className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs" />
                  <button onClick={() => rmRx(i)} className="rounded-md border border-rose-300 px-2 text-xs text-rose-700">✕</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Follow-up & QoS</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Follow-up date"><input type="date" value={f.followUpDate} onChange={(e) => setF({ ...f, followUpDate: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
            <Field label="Connectivity">
              <select value={f.connectivityQuality} onChange={(e) => setF({ ...f, connectivityQuality: e.target.value as ConnectivityQuality | "" })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"><option value="">—</option>{QUALS.map((q) => <option key={q} value={q}>{q}</option>)}</select>
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.identityVerified} onChange={(e) => setF({ ...f, identityVerified: e.target.checked })} />ID verified</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.feePaid} onChange={(e) => setF({ ...f, feePaid: e.target.checked })} />Fee paid</label>
          </div>
          <Field label="Referral note" full><textarea value={f.referralNote} onChange={(e) => setF({ ...f, referralNote: e.target.value })} rows={2} className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        </section>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saveLabel="Complete consult" />
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
