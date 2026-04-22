"use client";

import { useEffect, useState } from "react";
import type {
  DialysisMachine,
  DialysisSession,
  SessionStatus,
  MachineStatus,
  AccessType,
  Anticoagulant,
  Complication,
  DialysisStats,
} from "@/lib/hospital/dialysis-store";
// Inlined from dialysis-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const ACCESS_LABEL: Record<AccessType, string> = {
  avf: "AV Fistula",
  avg: "AV Graft",
  cvc_tunneled: "Tunneled CVC",
  cvc_temp: "Temporary CVC",
};
const ANTICOAG_LABEL: Record<Anticoagulant, string> = {
  heparin: "Heparin",
  lmwh: "LMWH",
  citrate: "Citrate",
  none: "None (heparin-free)",
};
const COMPLICATION_LABEL: Record<Complication, string> = {
  hypotension: "Hypotension",
  cramps: "Muscle cramps",
  clotting: "Circuit clotting",
  fever: "Fever / rigors",
  bleeding: "Access bleeding",
  nausea: "Nausea / vomiting",
  arrhythmia: "Arrhythmia",
  other: "Other",
};

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

const SESSION_STATUSES: SessionStatus[] = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];
const MACHINE_STATUSES: MachineStatus[] = [
  "available",
  "in_use",
  "maintenance",
  "retired",
];
const ACCESS_TYPES: AccessType[] = [
  "avf",
  "avg",
  "cvc_tunneled",
  "cvc_temp",
];
const ANTICOAGS: Anticoagulant[] = ["heparin", "lmwh", "citrate", "none"];
const COMPLICATIONS: Complication[] = [
  "hypotension",
  "cramps",
  "clotting",
  "fever",
  "bleeding",
  "nausea",
  "arrhythmia",
  "other",
];

const STATUS_COLOR: Record<SessionStatus, string> = {
  scheduled: "bg-sky-100 text-sky-700",
  in_progress: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const MACHINE_COLOR: Record<MachineStatus, string> = {
  available: "bg-emerald-100 text-emerald-700",
  in_use: "bg-sky-100 text-sky-700",
  maintenance: "bg-amber-100 text-amber-800",
  retired: "bg-slate-100 text-slate-500",
};

export default function DialysisPage() {
  const [tab, setTab] = useState<"sessions" | "machines">("sessions");
  const [sessions, setSessions] = useState<DialysisSession[]>([]);
  const [machines, setMachines] = useState<DialysisMachine[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<DialysisStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<SessionStatus | "">("");
  const [filterMachine, setFilterMachine] = useState<string>("");

  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editSession, setEditSession] = useState<DialysisSession | null>(null);
  const [recordFor, setRecordFor] = useState<DialysisSession | null>(null);
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [editMachine, setEditMachine] = useState<DialysisMachine | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    if (filterMachine) p.set("machineId", filterMachine);
    const [sRes, mRes, pRes] = await Promise.all([
      fetch(`/api/hospital/dialysis?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/hospital/dialysis/machines", { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (sRes.ok) {
      const d = await sRes.json();
      setSessions(d.sessions || []);
      setStats(d.stats || null);
    }
    if (mRes.ok) {
      const d = await mRes.json();
      setMachines(d.machines || []);
    }
    if (pRes.ok) {
      const d = await pRes.json();
      setPatients(d.patients || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filterStatus, filterMachine]);

  async function saveSession(input: Record<string, unknown>) {
    const method = editSession ? "PATCH" : "POST";
    const body = editSession ? { id: editSession.id, ...input } : input;
    const res = await fetch("/api/hospital/dialysis", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(`Save failed: ${d.error || res.status}`);
      return;
    }
    setShowSessionForm(false);
    setEditSession(null);
    await load();
  }

  async function patchSession(id: string, patch: Record<string, unknown>) {
    const res = await fetch("/api/hospital/dialysis", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(`Update failed: ${d.error || res.status}`);
      return;
    }
    await load();
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this dialysis session?")) return;
    await fetch("/api/hospital/dialysis", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  async function saveMachine(input: Record<string, unknown>) {
    const method = editMachine ? "PATCH" : "POST";
    const body = editMachine ? { id: editMachine.id, ...input } : input;
    const res = await fetch("/api/hospital/dialysis/machines", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      alert("Machine save failed");
      return;
    }
    setShowMachineForm(false);
    setEditMachine(null);
    await load();
  }

  async function deleteMachine(id: string) {
    if (!confirm("Delete this machine? It must not have active sessions.")) return;
    const res = await fetch("/api/hospital/dialysis/machines", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error === "in_use_or_not_found"
        ? "Machine is in use or has active sessions."
        : "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Dialysis Unit
          </h1>
          <p className="text-sm text-slate-500">
            Hemodialysis sessions, machine roster & service schedule
          </p>
        </div>
        <div className="flex gap-2">
          {tab === "sessions" && (
            <button
              onClick={() => {
                setEditSession(null);
                setShowSessionForm(true);
              }}
              className="rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              + Schedule Session
            </button>
          )}
          {tab === "machines" && (
            <button
              onClick={() => {
                setEditMachine(null);
                setShowMachineForm(true);
              }}
              className="rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              + Add Machine
            </button>
          )}
        </div>
      </header>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Today's sessions" value={stats.sessionsToday} color="slate" />
          <Stat label="Active now" value={stats.activeSessions} color="emerald" />
          <Stat label="Available machines" value={stats.availableMachines} color="emerald" sub={`${stats.inUseMachines} in use`} />
          <Stat label="Service due ≤14d" value={stats.servicesDueSoon} color={stats.servicesDueSoon > 0 ? "amber" : "slate"} />
          <Stat label="UF achievement" value={`${stats.avgUfAchievementPct}%`} color="blue" sub="this month" />
          <Stat label="Complication rate" value={`${stats.complicationRatePct}%`} color={stats.complicationRatePct > 15 ? "rose" : "slate"} sub="this month" />
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-slate-200">
        <TabBtn active={tab === "sessions"} onClick={() => setTab("sessions")}>
          Sessions ({sessions.length})
        </TabBtn>
        <TabBtn active={tab === "machines"} onClick={() => setTab("machines")}>
          Machines ({machines.length})
        </TabBtn>
      </div>

      {tab === "sessions" && (
        <Section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as SessionStatus | "")}
              className="inp"
            >
              <option value="">All statuses</option>
              {SESSION_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="inp"
            >
              <option value="">All machines</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.machineNumber} — {m.model}</option>
              ))}
            </select>
            <span className="ml-auto text-xs text-slate-500">
              {loading ? "Loading…" : `${sessions.length} session(s)`}
            </span>
          </div>

          {sessions.length === 0 ? (
            <Empty label="No sessions yet. Schedule the first one." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Session</th>
                    <th className="px-3 py-2">Patient</th>
                    <th className="px-3 py-2">Machine</th>
                    <th className="px-3 py-2">Scheduled</th>
                    <th className="px-3 py-2">Access</th>
                    <th className="px-3 py-2">UF tgt/ach</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <SessionRow
                      key={s.id}
                      s={s}
                      expanded={expanded === s.id}
                      onToggle={() =>
                        setExpanded(expanded === s.id ? null : s.id)
                      }
                      onStart={() => patchSession(s.id, { status: "in_progress" })}
                      onComplete={() => setRecordFor(s)}
                      onCancel={() => {
                        const reason = prompt("Cancellation reason?") || "";
                        patchSession(s.id, { status: "cancelled", cancelReason: reason });
                      }}
                      onEdit={() => {
                        setEditSession(s);
                        setShowSessionForm(true);
                      }}
                      onDelete={() => deleteSession(s.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {tab === "machines" && (
        <Section>
          {machines.length === 0 ? (
            <Empty label="No machines registered. Add one to start scheduling." />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {machines.map((m) => (
                <MachineCard
                  key={m.id}
                  m={m}
                  onEdit={() => {
                    setEditMachine(m);
                    setShowMachineForm(true);
                  }}
                  onDelete={() => deleteMachine(m.id)}
                />
              ))}
            </div>
          )}
        </Section>
      )}

      {showSessionForm && (
        <SessionFormModal
          initial={editSession}
          machines={machines.filter((m) => m.active && m.status !== "retired")}
          patients={patients}
          onSave={saveSession}
          onClose={() => {
            setShowSessionForm(false);
            setEditSession(null);
          }}
        />
      )}

      {recordFor && (
        <RecordVitalsModal
          session={recordFor}
          onSave={async (input) => {
            await patchSession(recordFor.id, { ...input, status: "completed" });
            setRecordFor(null);
          }}
          onClose={() => setRecordFor(null)}
        />
      )}

      {showMachineForm && (
        <MachineFormModal
          initial={editMachine}
          onSave={saveMachine}
          onClose={() => {
            setShowMachineForm(false);
            setEditMachine(null);
          }}
        />
      )}

      <style jsx global>{`
        .inp {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          background: white;
          outline: none;
          transition: border-color 0.15s;
        }
        .inp:focus {
          border-color: rgb(99 102 241);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }
      `}</style>
    </div>
  );
}

function SessionRow({
  s,
  expanded,
  onToggle,
  onStart,
  onComplete,
  onCancel,
  onEdit,
  onDelete,
}: {
  s: DialysisSession;
  expanded: boolean;
  onToggle: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ufStr =
    s.ufTarget !== undefined
      ? `${s.ufTarget}L${s.ufAchieved !== undefined ? ` / ${s.ufAchieved}L` : ""}`
      : "—";
  return (
    <>
      <tr className="border-b border-slate-100 align-top">
        <td className="px-3 py-2 font-mono text-[12px] text-slate-700">
          <button onClick={onToggle} className="hover:text-primary-700">
            {s.sessionNumber}
          </button>
        </td>
        <td className="px-3 py-2">
          <div className="font-medium text-slate-900">{s.patientName}</div>
          {s.patientMRN && (
            <div className="text-[11px] text-slate-500">{s.patientMRN}</div>
          )}
        </td>
        <td className="px-3 py-2 text-slate-700">
          {s.machineNumber || <span className="text-slate-400">—</span>}
        </td>
        <td className="px-3 py-2 text-slate-700">
          {new Date(s.scheduledAt).toLocaleString()}
        </td>
        <td className="px-3 py-2 text-slate-700">
          {ACCESS_LABEL[s.accessType]}
        </td>
        <td className="px-3 py-2 text-slate-700">{ufStr}</td>
        <td className="px-3 py-2">
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[s.status]}`}
          >
            {s.status.replace("_", " ")}
          </span>
          {s.complications.length > 0 && (
            <div className="mt-1 text-[10px] font-semibold text-rose-600">
              ⚠ {s.complications.length} complication(s)
            </div>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex flex-wrap justify-end gap-1">
            {s.status === "scheduled" && (
              <button
                onClick={onStart}
                className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
              >
                Start
              </button>
            )}
            {s.status === "in_progress" && (
              <button
                onClick={onComplete}
                className="rounded bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-900"
              >
                Record & end
              </button>
            )}
            {(s.status === "scheduled" || s.status === "in_progress") && (
              <button
                onClick={onCancel}
                className="rounded bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-200"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onEdit}
              className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-slate-50 px-4 py-3">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <KV k="Planned" v={`${s.plannedDurationMin} min`} />
              <KV
                k="Actual"
                v={s.actualDurationMin ? `${s.actualDurationMin} min` : "—"}
              />
              <KV k="Anticoagulant" v={`${ANTICOAG_LABEL[s.anticoagulant]}${s.anticoagDose ? ` (${s.anticoagDose})` : ""}`} />
              <KV k="Dialyzer" v={s.dialyzerModel || "—"} />
              <KV k="Blood flow" v={s.bloodFlowRate ? `${s.bloodFlowRate} ml/min` : "—"} />
              <KV k="Dialysate flow" v={s.dialysateFlowRate ? `${s.dialysateFlowRate} ml/min` : "—"} />
              <KV k="Pre-weight" v={s.preWeight !== undefined ? `${s.preWeight} kg` : "—"} />
              <KV k="Post-weight" v={s.postWeight !== undefined ? `${s.postWeight} kg` : "—"} />
              <KV
                k="Pre BP / HR"
                v={
                  s.preBpSys
                    ? `${s.preBpSys}/${s.preBpDia || "—"} • ${s.prePulse || "—"}`
                    : "—"
                }
              />
              <KV
                k="Post BP / HR"
                v={
                  s.postBpSys
                    ? `${s.postBpSys}/${s.postBpDia || "—"} • ${s.postPulse || "—"}`
                    : "—"
                }
              />
              <KV k="Nurse" v={s.nurse || "—"} />
              <KV k="Nephrologist" v={s.nephrologist || "—"} />
            </div>
            {s.complications.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  Complications
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.complications.map((c) => (
                    <span
                      key={c}
                      className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                    >
                      {COMPLICATION_LABEL[c]}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {s.notes && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                  Notes
                </div>
                <div className="text-sm text-slate-700">{s.notes}</div>
              </div>
            )}
            {s.cancelReason && (
              <div className="mt-3 rounded bg-rose-50 p-2 text-sm text-rose-700">
                <span className="font-semibold">Cancelled:</span> {s.cancelReason}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function MachineCard({
  m,
  onEdit,
  onDelete,
}: {
  m: DialysisMachine;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dueSoon =
    m.nextServiceDueAt &&
    new Date(m.nextServiceDueAt).getTime() <=
      Date.now() + 14 * 24 * 3600 * 1000;
  const overdue =
    m.nextServiceDueAt && new Date(m.nextServiceDueAt).getTime() < Date.now();
  return (
    <div
      className={`rounded-xl border p-4 ${
        overdue ? "border-rose-300 bg-rose-50" : dueSoon ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[12px] text-slate-500">
            {m.machineNumber}
          </div>
          <div className="text-base font-semibold text-slate-900">{m.model}</div>
          {m.manufacturer && (
            <div className="text-[12px] text-slate-500">{m.manufacturer}</div>
          )}
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-semibold ${MACHINE_COLOR[m.status]}`}
        >
          {m.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-slate-600">
        <div>
          <span className="text-slate-400">Location:</span> {m.location || "—"}
        </div>
        <div>
          <span className="text-slate-400">Hours:</span> {m.totalHours.toFixed(1)}
        </div>
        <div>
          <span className="text-slate-400">Serial:</span>{" "}
          {m.serialNumber || "—"}
        </div>
        <div>
          <span className="text-slate-400">Commissioned:</span>{" "}
          {m.commissionedAt
            ? new Date(m.commissionedAt).toLocaleDateString()
            : "—"}
        </div>
        <div className="col-span-2">
          <span className="text-slate-400">Last serviced:</span>{" "}
          {m.lastServicedAt
            ? new Date(m.lastServicedAt).toLocaleDateString()
            : "—"}
          {m.nextServiceDueAt && (
            <>
              {" "}
              •{" "}
              <span className={overdue ? "font-semibold text-rose-700" : dueSoon ? "font-semibold text-amber-700" : ""}>
                Due {new Date(m.nextServiceDueAt).toLocaleDateString()}
                {overdue ? " (OVERDUE)" : ""}
              </span>
            </>
          )}
        </div>
      </div>
      {m.notes && (
        <div className="mt-2 text-[12px] text-slate-600">{m.notes}</div>
      )}
      <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3">
        <button
          onClick={onEdit}
          className="flex-1 rounded bg-slate-100 px-2 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-200"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded bg-rose-50 px-2 py-1 text-[12px] font-semibold text-rose-600 hover:bg-rose-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function SessionFormModal({
  initial,
  machines,
  patients,
  onSave,
  onClose,
}: {
  initial: DialysisSession | null;
  machines: DialysisMachine[];
  patients: Patient[];
  onSave: (input: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    patientId: initial?.patientId || "",
    patientName: initial?.patientName || "",
    patientMRN: initial?.patientMRN || "",
    machineId: initial?.machineId || "",
    scheduledAt: initial?.scheduledAt
      ? initial.scheduledAt.slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    plannedDurationMin: initial?.plannedDurationMin ?? 240,
    accessType: initial?.accessType || ("avf" as AccessType),
    anticoagulant: initial?.anticoagulant || ("heparin" as Anticoagulant),
    anticoagDose: initial?.anticoagDose || "",
    dialyzerModel: initial?.dialyzerModel || "",
    bloodFlowRate: initial?.bloodFlowRate ?? "",
    dialysateFlowRate: initial?.dialysateFlowRate ?? "",
    ufTarget: initial?.ufTarget ?? "",
    nurse: initial?.nurse || "",
    nephrologist: initial?.nephrologist || "",
    notes: initial?.notes || "",
  });

  function submit() {
    if (!form.patientName.trim()) {
      alert("Patient name is required");
      return;
    }
    onSave({
      patientId: form.patientId || undefined,
      patientName: form.patientName.trim(),
      patientMRN: form.patientMRN.trim() || undefined,
      machineId: form.machineId || undefined,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      plannedDurationMin: Number(form.plannedDurationMin),
      accessType: form.accessType,
      anticoagulant: form.anticoagulant,
      anticoagDose: form.anticoagDose.trim() || undefined,
      dialyzerModel: form.dialyzerModel.trim() || undefined,
      bloodFlowRate: form.bloodFlowRate ? Number(form.bloodFlowRate) : undefined,
      dialysateFlowRate: form.dialysateFlowRate ? Number(form.dialysateFlowRate) : undefined,
      ufTarget: form.ufTarget !== "" ? Number(form.ufTarget) : undefined,
      nurse: form.nurse.trim() || undefined,
      nephrologist: form.nephrologist.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <Modal title={initial ? "Edit session" : "Schedule dialysis session"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Patient">
          <select
            value={form.patientId}
            onChange={(e) => {
              const p = patients.find((x) => x.id === e.target.value);
              setForm({
                ...form,
                patientId: e.target.value,
                patientName: p ? `${p.firstName} ${p.lastName}` : form.patientName,
                patientMRN: p?.mrn || form.patientMRN,
              });
            }}
            className="inp"
          >
            <option value="">— Manual entry —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} {p.mrn ? `· ${p.mrn}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Patient name *">
          <input
            value={form.patientName}
            onChange={(e) => setForm({ ...form, patientName: e.target.value })}
            className="inp"
          />
        </Field>
        <Field label="MRN">
          <input
            value={form.patientMRN}
            onChange={(e) => setForm({ ...form, patientMRN: e.target.value })}
            className="inp"
          />
        </Field>
        <Field label="Machine">
          <select
            value={form.machineId}
            onChange={(e) => setForm({ ...form, machineId: e.target.value })}
            className="inp"
          >
            <option value="">— Unassigned —</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.machineNumber} — {m.model} ({m.status})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Scheduled at">
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            className="inp"
          />
        </Field>
        <Field label="Planned duration (min)">
          <input
            type="number"
            min={30}
            value={form.plannedDurationMin}
            onChange={(e) =>
              setForm({ ...form, plannedDurationMin: Number(e.target.value) })
            }
            className="inp"
          />
        </Field>
        <Field label="Vascular access">
          <select
            value={form.accessType}
            onChange={(e) =>
              setForm({ ...form, accessType: e.target.value as AccessType })
            }
            className="inp"
          >
            {ACCESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCESS_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Anticoagulant">
          <select
            value={form.anticoagulant}
            onChange={(e) =>
              setForm({
                ...form,
                anticoagulant: e.target.value as Anticoagulant,
              })
            }
            className="inp"
          >
            {ANTICOAGS.map((a) => (
              <option key={a} value={a}>
                {ANTICOAG_LABEL[a]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Anticoag dose">
          <input
            value={form.anticoagDose}
            onChange={(e) =>
              setForm({ ...form, anticoagDose: e.target.value })
            }
            placeholder="e.g. 2000 IU bolus + 1000/hr"
            className="inp"
          />
        </Field>
        <Field label="Dialyzer model">
          <input
            value={form.dialyzerModel}
            onChange={(e) =>
              setForm({ ...form, dialyzerModel: e.target.value })
            }
            className="inp"
          />
        </Field>
        <Field label="Blood flow (ml/min)">
          <input
            type="number"
            value={form.bloodFlowRate}
            onChange={(e) =>
              setForm({ ...form, bloodFlowRate: e.target.value })
            }
            className="inp"
          />
        </Field>
        <Field label="Dialysate flow (ml/min)">
          <input
            type="number"
            value={form.dialysateFlowRate}
            onChange={(e) =>
              setForm({ ...form, dialysateFlowRate: e.target.value })
            }
            className="inp"
          />
        </Field>
        <Field label="UF target (L)">
          <input
            type="number"
            step="0.1"
            value={form.ufTarget}
            onChange={(e) => setForm({ ...form, ufTarget: e.target.value })}
            className="inp"
          />
        </Field>
        <Field label="Nurse">
          <input
            value={form.nurse}
            onChange={(e) => setForm({ ...form, nurse: e.target.value })}
            className="inp"
          />
        </Field>
        <Field label="Nephrologist">
          <input
            value={form.nephrologist}
            onChange={(e) =>
              setForm({ ...form, nephrologist: e.target.value })
            }
            className="inp"
          />
        </Field>
        <div className="col-span-2">
          <Field label="Notes">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="inp"
            />
          </Field>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          {initial ? "Save" : "Schedule"}
        </button>
      </div>
    </Modal>
  );
}

function RecordVitalsModal({
  session,
  onSave,
  onClose,
}: {
  session: DialysisSession;
  onSave: (input: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    preWeight: session.preWeight ?? "",
    postWeight: session.postWeight ?? "",
    ufTarget: session.ufTarget ?? "",
    ufAchieved: session.ufAchieved ?? "",
    preBpSys: session.preBpSys ?? "",
    preBpDia: session.preBpDia ?? "",
    prePulse: session.prePulse ?? "",
    postBpSys: session.postBpSys ?? "",
    postBpDia: session.postBpDia ?? "",
    postPulse: session.postPulse ?? "",
    complications: session.complications || [],
    notes: session.notes || "",
  });

  function toggleComp(c: Complication) {
    setForm((f) => ({
      ...f,
      complications: f.complications.includes(c)
        ? f.complications.filter((x) => x !== c)
        : [...f.complications, c],
    }));
  }

  const weightLost =
    form.preWeight !== "" && form.postWeight !== ""
      ? (Number(form.preWeight) - Number(form.postWeight)).toFixed(2)
      : "—";

  function submit() {
    onSave({
      preWeight: form.preWeight !== "" ? Number(form.preWeight) : undefined,
      postWeight: form.postWeight !== "" ? Number(form.postWeight) : undefined,
      ufTarget: form.ufTarget !== "" ? Number(form.ufTarget) : undefined,
      ufAchieved: form.ufAchieved !== "" ? Number(form.ufAchieved) : undefined,
      preBpSys: form.preBpSys !== "" ? Number(form.preBpSys) : undefined,
      preBpDia: form.preBpDia !== "" ? Number(form.preBpDia) : undefined,
      prePulse: form.prePulse !== "" ? Number(form.prePulse) : undefined,
      postBpSys: form.postBpSys !== "" ? Number(form.postBpSys) : undefined,
      postBpDia: form.postBpDia !== "" ? Number(form.postBpDia) : undefined,
      postPulse: form.postPulse !== "" ? Number(form.postPulse) : undefined,
      complications: form.complications,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <Modal title={`Record vitals — ${session.sessionNumber}`} onClose={onClose}>
      <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm">
        <span className="font-semibold text-slate-900">{session.patientName}</span>
        {session.machineNumber && (
          <span className="ml-2 text-slate-500">• {session.machineNumber}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pre-weight (kg)">
          <input type="number" step="0.1" value={form.preWeight}
            onChange={(e) => setForm({ ...form, preWeight: e.target.value })}
            className="inp" />
        </Field>
        <Field label="Post-weight (kg)">
          <input type="number" step="0.1" value={form.postWeight}
            onChange={(e) => setForm({ ...form, postWeight: e.target.value })}
            className="inp" />
        </Field>
        <div className="col-span-2 text-[12px] text-slate-600">
          Weight lost: <span className="font-semibold">{weightLost} kg</span>
        </div>
        <Field label="UF target (L)">
          <input type="number" step="0.1" value={form.ufTarget}
            onChange={(e) => setForm({ ...form, ufTarget: e.target.value })}
            className="inp" />
        </Field>
        <Field label="UF achieved (L)">
          <input type="number" step="0.1" value={form.ufAchieved}
            onChange={(e) => setForm({ ...form, ufAchieved: e.target.value })}
            className="inp" />
        </Field>

        <div className="col-span-2 mt-2 border-t border-slate-100 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Pre-dialysis vitals
        </div>
        <div className="col-span-2 grid grid-cols-3 gap-3">
          <Field label="BP sys"><input type="number" value={form.preBpSys}
            onChange={(e) => setForm({ ...form, preBpSys: e.target.value })} className="inp" /></Field>
          <Field label="BP dia"><input type="number" value={form.preBpDia}
            onChange={(e) => setForm({ ...form, preBpDia: e.target.value })} className="inp" /></Field>
          <Field label="HR"><input type="number" value={form.prePulse}
            onChange={(e) => setForm({ ...form, prePulse: e.target.value })} className="inp" /></Field>
        </div>

        <div className="col-span-2 mt-2 border-t border-slate-100 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Post-dialysis vitals
        </div>
        <div className="col-span-2 grid grid-cols-3 gap-3">
          <Field label="BP sys"><input type="number" value={form.postBpSys}
            onChange={(e) => setForm({ ...form, postBpSys: e.target.value })} className="inp" /></Field>
          <Field label="BP dia"><input type="number" value={form.postBpDia}
            onChange={(e) => setForm({ ...form, postBpDia: e.target.value })} className="inp" /></Field>
          <Field label="HR"><input type="number" value={form.postPulse}
            onChange={(e) => setForm({ ...form, postPulse: e.target.value })} className="inp" /></Field>
        </div>

        <div className="col-span-2 mt-2 border-t border-slate-100 pt-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Complications (any)
          </div>
          <div className="flex flex-wrap gap-2">
            {COMPLICATIONS.map((c) => {
              const on = form.complications.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleComp(c)}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
                    on
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {COMPLICATION_LABEL[c]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="col-span-2">
          <Field label="Notes">
            <textarea rows={3} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="inp" />
          </Field>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button onClick={onClose}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Cancel
        </button>
        <button onClick={submit}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          Record & complete
        </button>
      </div>
    </Modal>
  );
}

function MachineFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: DialysisMachine | null;
  onSave: (input: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    model: initial?.model || "",
    manufacturer: initial?.manufacturer || "",
    serialNumber: initial?.serialNumber || "",
    commissionedAt: initial?.commissionedAt?.slice(0, 10) || "",
    status: initial?.status || ("available" as MachineStatus),
    location: initial?.location || "",
    lastServicedAt: initial?.lastServicedAt?.slice(0, 10) || "",
    nextServiceDueAt: initial?.nextServiceDueAt?.slice(0, 10) || "",
    notes: initial?.notes || "",
    active: initial?.active ?? true,
  });

  function submit() {
    if (!form.model.trim()) {
      alert("Model is required");
      return;
    }
    onSave({
      model: form.model.trim(),
      manufacturer: form.manufacturer.trim() || undefined,
      serialNumber: form.serialNumber.trim() || undefined,
      commissionedAt: form.commissionedAt || undefined,
      status: form.status,
      location: form.location.trim() || undefined,
      lastServicedAt: form.lastServicedAt || undefined,
      nextServiceDueAt: form.nextServiceDueAt || undefined,
      notes: form.notes.trim() || undefined,
      active: form.active,
    });
  }

  return (
    <Modal title={initial ? "Edit machine" : "Add dialysis machine"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Model *">
          <input value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })} className="inp" />
        </Field>
        <Field label="Manufacturer">
          <input value={form.manufacturer}
            onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="inp" />
        </Field>
        <Field label="Serial number">
          <input value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="inp" />
        </Field>
        <Field label="Location / unit">
          <input value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })} className="inp" />
        </Field>
        <Field label="Commissioned">
          <input type="date" value={form.commissionedAt}
            onChange={(e) => setForm({ ...form, commissionedAt: e.target.value })} className="inp" />
        </Field>
        <Field label="Status">
          <select value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as MachineStatus })}
            className="inp">
            {MACHINE_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </Field>
        <Field label="Last serviced">
          <input type="date" value={form.lastServicedAt}
            onChange={(e) => setForm({ ...form, lastServicedAt: e.target.value })} className="inp" />
        </Field>
        <Field label="Next service due">
          <input type="date" value={form.nextServiceDueAt}
            onChange={(e) => setForm({ ...form, nextServiceDueAt: e.target.value })} className="inp" />
        </Field>
        <div className="col-span-2">
          <Field label="Notes">
            <textarea rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" />
          </Field>
        </div>
        <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active (appears in schedule picker)
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button onClick={onClose}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Cancel
        </button>
        <button onClick={submit}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          {initial ? "Save" : "Add"}
        </button>
      </div>
    </Modal>
  );
}

// ---------- helpers ----------

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: "slate" | "emerald" | "amber" | "rose" | "blue";
}) {
  const colors: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    blue: "text-blue-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${colors[color]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5">{children}</section>;
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className="text-sm text-slate-800">{v}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-primary-500 text-primary-700"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
