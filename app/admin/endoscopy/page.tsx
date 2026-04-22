"use client";

import { useEffect, useState } from "react";
import type {
  EndoscopyProcedure,
  ProcedureStatus,
  ScopeType,
  SedationLevel,
  ASAClass,
  Mallampati,
  BowelPrepQuality,
  PolypMorphology,
  FindingType,
  RemovalTechnique,
  Complication,
  Finding,
  EndoscopyStats,
} from "@/lib/hospital/endoscopy-store";
// Inlined from endoscopy-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const SCOPE_LABEL: Record<ScopeType, string> = {
  colonoscopy: "Colonoscopy",
  flex_sigmoidoscopy: "Flex sigmoidoscopy",
  egd: "EGD / upper",
  ercp: "ERCP",
  eus: "EUS",
  enteroscopy: "Enteroscopy",
  bronchoscopy: "Bronchoscopy",
  cystoscopy: "Cystoscopy",
  hysteroscopy: "Hysteroscopy",
  arthroscopy: "Arthroscopy",
  capsule: "Capsule endoscopy",
  other: "Other",
};
const FINDING_LABEL: Record<FindingType, string> = {
  polyp: "Polyp",
  ulcer: "Ulcer",
  erosion: "Erosion",
  stricture: "Stricture",
  mass: "Mass",
  bleeding: "Bleeding",
  varices: "Varices",
  diverticulum: "Diverticulum",
  inflammation: "Inflammation",
  hernia: "Hiatal hernia",
  foreign_body: "Foreign body",
  normal: "Normal",
  other: "Other",
};
const REMOVAL_LABEL: Record<RemovalTechnique, string> = {
  cold_forceps: "Cold forceps",
  hot_forceps: "Hot forceps",
  cold_snare: "Cold snare",
  hot_snare: "Hot snare",
  emr: "EMR",
  esd: "ESD",
  biopsy_only: "Biopsy only",
  not_removed: "Not removed",
};
const COMPLICATION_LABEL: Record<Complication, string> = {
  perforation: "Perforation",
  bleeding_immediate: "Bleeding (immediate)",
  bleeding_delayed: "Bleeding (delayed)",
  aspiration: "Aspiration",
  cardiopulmonary: "Cardiopulmonary event",
  oversedation: "Over-sedation",
  infection: "Infection",
  pancreatitis: "Post-ERCP pancreatitis",
  missed_lesion: "Missed lesion",
  other: "Other",
};
function procedureDurationMin(p: EndoscopyProcedure): number | null {
  if (!p.startedAt || !p.endedAt) return null;
  const diff = new Date(p.endedAt).getTime() - new Date(p.startedAt).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.round(diff / 60000);
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

const STATUSES: ProcedureStatus[] = ["scheduled", "in_progress", "completed", "cancelled", "postponed"];
const SCOPES: ScopeType[] = [
  "colonoscopy", "flex_sigmoidoscopy", "egd", "ercp", "eus", "enteroscopy",
  "bronchoscopy", "cystoscopy", "hysteroscopy", "arthroscopy", "capsule", "other",
];
const SEDATION: SedationLevel[] = ["none", "minimal", "moderate", "deep", "general"];
const ASA: ASAClass[] = ["I", "II", "III", "IV", "V", "VI", "E"];
const MALLAMPATI: Mallampati[] = [1, 2, 3, 4];
const BOWEL_PREP: BowelPrepQuality[] = ["excellent", "good", "fair", "poor", "inadequate", "na"];
const FINDING_TYPES: FindingType[] = [
  "polyp", "ulcer", "erosion", "stricture", "mass", "bleeding", "varices",
  "diverticulum", "inflammation", "hernia", "foreign_body", "normal", "other",
];
const MORPHOLOGIES: PolypMorphology[] = [
  "pedunculated", "subpedunculated", "sessile", "flat_elevated", "flat",
  "depressed", "ulcerated", "laterally_spreading", "other",
];
const REMOVALS: RemovalTechnique[] = [
  "cold_forceps", "hot_forceps", "cold_snare", "hot_snare", "emr", "esd", "biopsy_only", "not_removed",
];
const COMPLICATIONS: Complication[] = [
  "perforation", "bleeding_immediate", "bleeding_delayed", "aspiration",
  "cardiopulmonary", "oversedation", "infection", "pancreatitis", "missed_lesion", "other",
];

const STATUS_COLOR: Record<ProcedureStatus, string> = {
  scheduled: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
  postponed: "bg-orange-100 text-orange-700",
};

const MORPHOLOGY_LABEL: Record<PolypMorphology, string> = {
  pedunculated: "Pedunculated (0-Ip)",
  subpedunculated: "Subpedunculated (0-Isp)",
  sessile: "Sessile (0-Is)",
  flat_elevated: "Flat elevated (0-IIa)",
  flat: "Flat (0-IIb)",
  depressed: "Depressed (0-IIc)",
  ulcerated: "Ulcerated (0-III)",
  laterally_spreading: "LST",
  other: "Other",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function toLocalInputValue(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EndoscopyPage() {
  const [procedures, setProcedures] = useState<EndoscopyProcedure[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<EndoscopyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<ProcedureStatus | "">("");
  const [filterScope, setFilterScope] = useState<ScopeType | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editProc, setEditProc] = useState<EndoscopyProcedure | null>(null);
  const [completeProc, setCompleteProc] = useState<EndoscopyProcedure | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    if (filterScope) p.set("scopeType", filterScope);
    const [r, patRes] = await Promise.all([
      fetch(`/api/hospital/endoscopy?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (r.ok) {
      const d = await r.json();
      setProcedures(d.procedures || []);
      setStats(d.stats || null);
    }
    if (patRes.ok) {
      const d = await patRes.json();
      setPatients(d.patients || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterScope]);

  async function saveProcedure(body: Partial<EndoscopyProcedure>) {
    const method = body.id ? "PATCH" : "POST";
    const res = await fetch("/api/hospital/endoscopy", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed to save");
      return;
    }
    setShowForm(false);
    setEditProc(null);
    setCompleteProc(null);
    load();
  }

  async function transitionStatus(p: EndoscopyProcedure, status: ProcedureStatus) {
    await saveProcedure({ id: p.id, status });
  }

  async function removeProcedure(id: string) {
    if (!confirm("Delete this procedure record? This cannot be undone.")) return;
    await fetch("/api/hospital/endoscopy", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Endoscopy / GI procedures</h1>
          <p className="text-sm text-slate-500">Scheduling, findings, biopsies, and quality indicators (PDR, cecal intubation, withdrawal time).</p>
        </div>
        <button
          onClick={() => { setEditProc(null); setShowForm(true); }}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Schedule procedure
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-9">
          <Stat label="Scheduled today" value={stats.scheduledToday} />
          <Stat label="In progress" value={stats.inProgress} />
          <Stat label="Completed (mo)" value={stats.completedMonth} />
          <Stat label="Cancelled (mo)" value={stats.cancelledMonth} />
          <Stat label="Biopsies (mo)" value={stats.biopsiesMonth} />
          <Stat
            label="Polyp detection %"
            value={`${stats.polypDetectionRate}%`}
            tone={stats.polypDetectionRate >= 25 ? "emerald" : stats.polypDetectionRate >= 15 ? "amber" : "rose"}
          />
          <Stat
            label="Cecal intubation %"
            value={`${stats.cecalIntubationRate}%`}
            tone={stats.cecalIntubationRate >= 95 ? "emerald" : stats.cecalIntubationRate >= 90 ? "amber" : "rose"}
          />
          <Stat
            label="Avg withdrawal (min)"
            value={stats.avgWithdrawalMin}
            tone={stats.avgWithdrawalMin >= 6 ? "emerald" : stats.avgWithdrawalMin >= 4 ? "amber" : "rose"}
          />
          <Stat label="Complications (mo)" value={stats.complicationsMonth} tone={stats.complicationsMonth > 0 ? "rose" : "slate"} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ProcedureStatus | "")}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Scope</span>
        <select
          value={filterScope}
          onChange={(e) => setFilterScope(e.target.value as ScopeType | "")}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading…</div>
      ) : procedures.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">No procedures yet. Schedule one to begin.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {procedures.map((p) => (
            <ProcedureCard
              key={p.id}
              procedure={p}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              onEdit={() => { setEditProc(p); setShowForm(true); }}
              onDelete={() => removeProcedure(p.id)}
              onStart={() => transitionStatus(p, "in_progress")}
              onComplete={() => setCompleteProc(p)}
              onCancel={() => { if (confirm("Cancel this procedure?")) transitionStatus(p, "cancelled"); }}
              onPostpone={() => { if (confirm("Mark as postponed?")) transitionStatus(p, "postponed"); }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <ProcedureFormModal
          procedure={editProc}
          patients={patients}
          onClose={() => { setShowForm(false); setEditProc(null); }}
          onSave={saveProcedure}
        />
      )}
      {completeProc && (
        <CompleteProcedureModal
          procedure={completeProc}
          onClose={() => setCompleteProc(null)}
          onSave={saveProcedure}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number | string; tone?: "slate" | "emerald" | "rose" | "amber" | "sky" }) {
  const toneClass = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    amber: "text-amber-700",
    sky: "text-sky-700",
  }[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function ProcedureCard({
  procedure: p, expanded, onToggle, onEdit, onDelete, onStart, onComplete, onCancel, onPostpone,
}: {
  procedure: EndoscopyProcedure;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onPostpone: () => void;
}) {
  const duration = procedureDurationMin(p);
  const polypCount = p.findings.filter((f) => f.type === "polyp").length;
  const biopsyCount = p.findings.filter((f) => f.biopsyTaken).length;
  const isColo = p.scopeType === "colonoscopy";
  const wdGood = p.withdrawalMin != null && p.withdrawalMin >= 6;
  const hasComp = (p.complications || []).length > 0;

  return (
    <div className={`rounded-lg border bg-white ${hasComp ? "border-rose-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start gap-3 p-4">
        <div className="flex-1 min-w-[240px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[p.status]}`}>
              {p.status.replace(/_/g, " ")}
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {SCOPE_LABEL[p.scopeType]}
            </span>
            {isColo && p.cecalIntubation && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Cecum reached</span>
            )}
            {isColo && p.withdrawalMin != null && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${wdGood ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                Withdrawal {p.withdrawalMin} min
              </span>
            )}
            {p.scopeType === "egd" && p.reachedSecondPart && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">D2 reached</span>
            )}
            {p.consentSigned && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Consent ✓</span>
            )}
            {hasComp && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                ⚠ {(p.complications || []).length} complication{(p.complications || []).length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="mt-1 font-semibold text-slate-900">{p.patientName}</div>
          <div className="text-xs text-slate-500">
            {p.id} · Scheduled {fmtDate(p.scheduledAt)}
            {p.endoscopist && ` · Endoscopist ${p.endoscopist}`}
            {p.room && ` · ${p.room}`}
          </div>
          <div className="mt-1 text-sm text-slate-700">Indication: {p.indication}</div>
          {p.status === "completed" && (
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
              {duration != null && <span>Duration {duration} min</span>}
              <span>{p.findings.length} finding{p.findings.length === 1 ? "" : "s"}</span>
              {polypCount > 0 && <span>{polypCount} polyp{polypCount === 1 ? "" : "s"}</span>}
              {biopsyCount > 0 && <span>{biopsyCount} biops{biopsyCount === 1 ? "y" : "ies"}</span>}
            </div>
          )}
          {p.overallImpression && (
            <div className="mt-1 text-sm text-slate-600"><span className="font-medium">Impression:</span> {p.overallImpression}</div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {p.status === "scheduled" && (
            <>
              <button onClick={onStart} className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700">Start</button>
              <button onClick={onPostpone} className="rounded-md border border-orange-300 bg-white px-2 py-1 text-xs text-orange-700 hover:bg-orange-50">Postpone</button>
              <button onClick={onCancel} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Cancel</button>
            </>
          )}
          {p.status === "in_progress" && (
            <button onClick={onComplete} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">Complete</button>
          )}
          <button onClick={onEdit} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
          <button onClick={onDelete} className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Delete</button>
          {p.findings.length > 0 && (
            <button onClick={onToggle} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
              {expanded ? "Hide findings" : `View ${p.findings.length} finding${p.findings.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </div>
      {expanded && p.findings.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <div className="space-y-2">
            {p.findings.map((f, idx) => (
              <FindingRow key={idx} finding={f} />
            ))}
          </div>
          {(p.complications || []).length > 0 && (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2">
              <div className="text-xs font-medium uppercase tracking-wide text-rose-700">Complications</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(p.complications || []).map((c) => (
                  <span key={c} className="rounded-full bg-white px-2 py-0.5 text-xs text-rose-700">{COMPLICATION_LABEL[c]}</span>
                ))}
              </div>
              {p.complicationNote && <div className="mt-1 text-xs text-rose-700">{p.complicationNote}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FindingRow({ finding: f }: { finding: Finding }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">{FINDING_LABEL[f.type]}</span>
        <span className="text-xs text-slate-500">{f.location}</span>
        {f.sizeMm != null && <span className="text-xs text-slate-500">{f.sizeMm} mm</span>}
        {f.morphology && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">{MORPHOLOGY_LABEL[f.morphology]}</span>
        )}
        {f.removal && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{REMOVAL_LABEL[f.removal]}</span>
        )}
        {f.biopsyTaken && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
            Biopsy{f.biopsyJar ? ` · jar ${f.biopsyJar}` : ""}{f.histologySent ? " · sent" : ""}
          </span>
        )}
      </div>
      {f.note && <div className="mt-1 text-xs text-slate-600">{f.note}</div>}
    </div>
  );
}

/* ----------------- ProcedureFormModal ----------------- */

function ProcedureFormModal({
  procedure, patients, onClose, onSave,
}: {
  procedure: EndoscopyProcedure | null;
  patients: Patient[];
  onClose: () => void;
  onSave: (body: Partial<EndoscopyProcedure>) => void;
}) {
  const [form, setForm] = useState({
    patientId: procedure?.patientId || "",
    patientName: procedure?.patientName || "",
    scopeType: (procedure?.scopeType || "colonoscopy") as ScopeType,
    indication: procedure?.indication || "",
    endoscopist: procedure?.endoscopist || "",
    assistantNurse: procedure?.assistantNurse || "",
    room: procedure?.room || "",
    scheduledAt: procedure?.scheduledAt ? toLocalInputValue(procedure.scheduledAt) : toLocalInputValue(new Date().toISOString()),
    asaClass: (procedure?.asaClass || "") as ASAClass | "",
    mallampati: (procedure?.mallampati?.toString() || "") as "" | "1" | "2" | "3" | "4",
    allergies: procedure?.allergies || "",
    consentSigned: procedure?.consentSigned ?? false,
    fastingHours: procedure?.fastingHours?.toString() || "",
    bowelPrepQuality: (procedure?.bowelPrepQuality || "") as BowelPrepQuality | "",
  });

  function pickPatient(id: string) {
    const p = patients.find((x) => x.id === id);
    setForm({ ...form, patientId: id, patientName: p ? `${p.firstName} ${p.lastName}` : "" });
  }

  function submit() {
    if (!form.patientId || !form.indication || !form.scheduledAt) {
      alert("Patient, indication, and schedule are required.");
      return;
    }
    const body: Partial<EndoscopyProcedure> = {
      id: procedure?.id,
      patientId: form.patientId,
      patientName: form.patientName,
      scopeType: form.scopeType,
      indication: form.indication,
      endoscopist: form.endoscopist || undefined,
      assistantNurse: form.assistantNurse || undefined,
      room: form.room || undefined,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      asaClass: form.asaClass || undefined,
      mallampati: form.mallampati ? (Number(form.mallampati) as Mallampati) : undefined,
      allergies: form.allergies || undefined,
      consentSigned: form.consentSigned,
      fastingHours: Number.isFinite(Number(form.fastingHours)) && form.fastingHours !== "" ? Number(form.fastingHours) : undefined,
      bowelPrepQuality: form.bowelPrepQuality || undefined,
    };
    onSave(body);
  }

  return (
    <Modal title={procedure ? `Edit ${procedure.id}` : "Schedule endoscopy"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient" full>
          <select
            value={form.patientId}
            onChange={(e) => pickPatient(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            disabled={!!procedure}
          >
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.mrn ? ` · ${p.mrn}` : ""}</option>
            ))}
          </select>
        </Field>
        <Field label="Scope type">
          <select value={form.scopeType} onChange={(e) => setForm({ ...form, scopeType: e.target.value as ScopeType })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Scheduled at">
          <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Indication" full>
          <input value={form.indication} onChange={(e) => setForm({ ...form, indication: e.target.value })} placeholder="e.g. rectal bleeding, dysphagia, screening" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Endoscopist"><input value={form.endoscopist} onChange={(e) => setForm({ ...form, endoscopist: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Assistant / nurse"><input value={form.assistantNurse} onChange={(e) => setForm({ ...form, assistantNurse: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Room / suite"><input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="ASA class">
          <select value={form.asaClass} onChange={(e) => setForm({ ...form, asaClass: e.target.value as ASAClass | "" })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">—</option>
            {ASA.map((a) => <option key={a} value={a}>ASA {a}</option>)}
          </select>
        </Field>
        <Field label="Mallampati">
          <select value={form.mallampati} onChange={(e) => setForm({ ...form, mallampati: e.target.value as "" | "1" | "2" | "3" | "4" })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">—</option>
            {MALLAMPATI.map((m) => <option key={m} value={String(m)}>Class {m}</option>)}
          </select>
        </Field>
        <Field label="Fasting hours">
          <input type="number" value={form.fastingHours} onChange={(e) => setForm({ ...form, fastingHours: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </Field>
        <Field label="Bowel prep quality">
          <select value={form.bowelPrepQuality} onChange={(e) => setForm({ ...form, bowelPrepQuality: e.target.value as BowelPrepQuality | "" })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">—</option>
            {BOWEL_PREP.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Allergies" full>
          <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </Field>
        <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.consentSigned} onChange={(e) => setForm({ ...form, consentSigned: e.target.checked })} />
          Informed consent signed
        </label>
      </div>
      <ModalActions onClose={onClose} onSave={submit} />
    </Modal>
  );
}

/* ----------------- CompleteProcedureModal ----------------- */

function CompleteProcedureModal({
  procedure, onClose, onSave,
}: {
  procedure: EndoscopyProcedure;
  onClose: () => void;
  onSave: (body: Partial<EndoscopyProcedure>) => void;
}) {
  const isColo = procedure.scopeType === "colonoscopy" || procedure.scopeType === "flex_sigmoidoscopy";
  const isEgd = procedure.scopeType === "egd";

  const [sedationLevel, setSedationLevel] = useState<SedationLevel | "">(procedure.sedationLevel || "moderate");
  const [sedationAgents, setSedationAgents] = useState(procedure.sedationAgents || "");
  const [withdrawalMin, setWithdrawalMin] = useState(procedure.withdrawalMin?.toString() || "");
  const [cecalIntubation, setCecalIntubation] = useState(procedure.cecalIntubation ?? false);
  const [reachedSecondPart, setReachedSecondPart] = useState(procedure.reachedSecondPart ?? false);
  const [scopeSerial, setScopeSerial] = useState(procedure.scopeSerial || "");
  const [findings, setFindings] = useState<Finding[]>(procedure.findings || []);
  const [overallImpression, setOverallImpression] = useState(procedure.overallImpression || "");
  const [complications, setComplications] = useState<Complication[]>(procedure.complications || []);
  const [complicationNote, setComplicationNote] = useState(procedure.complicationNote || "");
  const [reportText, setReportText] = useState(procedure.reportText || "");

  function addFinding() {
    setFindings([...findings, { type: "polyp", location: "" }]);
  }
  function updateFinding(idx: number, patch: Partial<Finding>) {
    setFindings(findings.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }
  function removeFinding(idx: number) {
    setFindings(findings.filter((_, i) => i !== idx));
  }
  function toggleComplication(c: Complication) {
    setComplications(complications.includes(c) ? complications.filter((x) => x !== c) : [...complications, c]);
  }

  function submit() {
    const body: Partial<EndoscopyProcedure> = {
      id: procedure.id,
      status: "completed",
      sedationLevel: sedationLevel || undefined,
      sedationAgents: sedationAgents || undefined,
      withdrawalMin: Number.isFinite(Number(withdrawalMin)) && withdrawalMin !== "" ? Number(withdrawalMin) : undefined,
      cecalIntubation,
      reachedSecondPart,
      scopeSerial: scopeSerial || undefined,
      findings,
      overallImpression: overallImpression || undefined,
      complications: complications.length ? complications : undefined,
      complicationNote: complicationNote || undefined,
      reportText: reportText || undefined,
    };
    onSave(body);
  }

  return (
    <Modal title={`Complete ${procedure.id} — ${SCOPE_LABEL[procedure.scopeType]}`} onClose={onClose} wide>
      <div className="space-y-4">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sedation & scope</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Sedation level">
              <select value={sedationLevel} onChange={(e) => setSedationLevel(e.target.value as SedationLevel | "")} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                <option value="">—</option>
                {SEDATION.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Sedation agents" full>
              <input value={sedationAgents} onChange={(e) => setSedationAgents(e.target.value)} placeholder="midazolam 2mg + fentanyl 50mcg" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </Field>
            <Field label="Scope serial">
              <input value={scopeSerial} onChange={(e) => setScopeSerial(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </Field>
          </div>
          {isColo && (
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
              <Field label="Withdrawal time (min)">
                <input type="number" value={withdrawalMin} onChange={(e) => setWithdrawalMin(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                <div className="mt-1 text-[11px] text-slate-500">Quality indicator: ≥ 6 min</div>
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={cecalIntubation} onChange={(e) => setCecalIntubation(e.target.checked)} />
                Cecum reached
              </label>
            </div>
          )}
          {isEgd && (
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={reachedSecondPart} onChange={(e) => setReachedSecondPart(e.target.checked)} />
                Reached 2nd part of duodenum (D2)
              </label>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Findings</h3>
            <button onClick={addFinding} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">+ Add finding</button>
          </div>
          <div className="mt-2 space-y-2">
            {findings.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-300 p-3 text-xs text-slate-500">No findings recorded yet.</div>
            )}
            {findings.map((f, idx) => (
              <div key={idx} className="rounded-md border border-slate-200 bg-slate-50/40 p-2">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                  <select value={f.type} onChange={(e) => updateFinding(idx, { type: e.target.value as FindingType })} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">
                    {FINDING_TYPES.map((t) => <option key={t} value={t}>{FINDING_LABEL[t]}</option>)}
                  </select>
                  <input value={f.location} onChange={(e) => updateFinding(idx, { location: e.target.value })} placeholder="location" className="col-span-2 rounded-md border border-slate-300 px-2 py-1 text-xs" />
                  <input type="number" value={f.sizeMm ?? ""} onChange={(e) => updateFinding(idx, { sizeMm: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="size mm" className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                  <select value={f.morphology || ""} onChange={(e) => updateFinding(idx, { morphology: (e.target.value || undefined) as PolypMorphology | undefined })} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">
                    <option value="">morphology…</option>
                    {MORPHOLOGIES.map((m) => <option key={m} value={m}>{MORPHOLOGY_LABEL[m]}</option>)}
                  </select>
                  <select value={f.removal || ""} onChange={(e) => updateFinding(idx, { removal: (e.target.value || undefined) as RemovalTechnique | undefined })} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">
                    <option value="">removal…</option>
                    {REMOVALS.map((r) => <option key={r} value={r}>{REMOVAL_LABEL[r]}</option>)}
                  </select>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-5">
                  <label className="flex items-center gap-1 text-xs text-slate-700">
                    <input type="checkbox" checked={!!f.biopsyTaken} onChange={(e) => updateFinding(idx, { biopsyTaken: e.target.checked })} />
                    Biopsy
                  </label>
                  <input value={f.biopsyJar || ""} onChange={(e) => updateFinding(idx, { biopsyJar: e.target.value })} placeholder="jar ID" className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                  <label className="flex items-center gap-1 text-xs text-slate-700">
                    <input type="checkbox" checked={!!f.histologySent} onChange={(e) => updateFinding(idx, { histologySent: e.target.checked })} />
                    Histology sent
                  </label>
                  <input value={f.note || ""} onChange={(e) => updateFinding(idx, { note: e.target.value })} placeholder="note" className="col-span-1 rounded-md border border-slate-300 px-2 py-1 text-xs md:col-span-2" />
                </div>
                <div className="mt-1 text-right">
                  <button onClick={() => removeFinding(idx)} className="text-[11px] text-rose-600 hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Complications</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {COMPLICATIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleComplication(c)}
                className={`rounded-full px-2 py-1 text-xs font-medium ${complications.includes(c) ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                {COMPLICATION_LABEL[c]}
              </button>
            ))}
          </div>
          {complications.length > 0 && (
            <textarea value={complicationNote} onChange={(e) => setComplicationNote(e.target.value)} rows={2} placeholder="Complication details" className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Impression & report</h3>
          <textarea value={overallImpression} onChange={(e) => setOverallImpression(e.target.value)} rows={2} placeholder="Overall impression" className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} rows={4} placeholder="Full report / technique / recommendations" className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </section>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saveLabel="Complete procedure" />
    </Modal>
  );
}

/* ----------------- Modal primitives ----------------- */

function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white shadow-xl ${wide ? "max-w-4xl" : "max-w-2xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSave, saveLabel = "Save" }: { onClose: () => void; onSave: () => void; saveLabel?: string }) {
  return (
    <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
      <button onClick={onSave} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">{saveLabel}</button>
    </div>
  );
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-sm ${full ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
