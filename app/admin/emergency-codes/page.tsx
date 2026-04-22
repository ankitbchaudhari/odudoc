"use client";

import { useEffect, useState } from "react";
import type {
  EmergencyCode,
  CodeType,
  CodeStatus,
  CodeOutcome,
  Intervention,
  CodeStats,
} from "@/lib/hospital/emergency-codes-store";
// Inlined from emergency-codes-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const CODE_LABEL: Record<CodeType, string> = {
  blue: "Code Blue — Cardiac/Respiratory arrest",
  pink: "Code Pink — Infant/Child abduction",
  red: "Code Red — Fire",
  orange: "Code Orange — Hazmat",
  black: "Code Black — Bomb threat",
  white: "Code White — Violent person",
  yellow: "Code Yellow — Mass casualty",
  purple: "Code Purple — Psychiatric emergency",
};
const CODE_SHORT: Record<CodeType, string> = {
  blue: "Blue",
  pink: "Pink",
  red: "Red",
  orange: "Orange",
  black: "Black",
  white: "White",
  yellow: "Yellow",
  purple: "Purple",
};
const OUTCOME_LABEL: Record<CodeOutcome, string> = {
  resolved: "Resolved on scene",
  rosc: "ROSC achieved",
  transferred: "Transferred to higher care",
  expired: "Patient expired",
  false_alarm: "False alarm",
  drill: "Drill (training)",
  other: "Other",
};
const INTERVENTION_LABEL: Record<Intervention, string> = {
  cpr: "CPR",
  defibrillation: "Defibrillation",
  intubation: "Intubation",
  medication: "Medication given",
  oxygen: "Supplemental O₂",
  iv_access: "IV access",
  transport: "Patient transport",
  evacuation: "Evacuation",
  containment: "Containment / isolation",
  restraint: "Physical restraint",
  other: "Other",
};

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

const CODE_TYPES: CodeType[] = [
  "blue",
  "pink",
  "red",
  "orange",
  "black",
  "white",
  "yellow",
  "purple",
];
const OUTCOMES: CodeOutcome[] = [
  "resolved",
  "rosc",
  "transferred",
  "expired",
  "false_alarm",
  "drill",
  "other",
];
const INTERVENTIONS: Intervention[] = [
  "cpr",
  "defibrillation",
  "intubation",
  "medication",
  "oxygen",
  "iv_access",
  "transport",
  "evacuation",
  "containment",
  "restraint",
  "other",
];

const CODE_COLOR: Record<CodeType, string> = {
  blue: "bg-sky-600 text-white",
  pink: "bg-pink-500 text-white",
  red: "bg-red-600 text-white",
  orange: "bg-orange-500 text-white",
  black: "bg-slate-900 text-white",
  white: "bg-slate-200 text-slate-800 ring-1 ring-slate-400",
  yellow: "bg-yellow-400 text-slate-900",
  purple: "bg-purple-600 text-white",
};

const STATUS_COLOR: Record<CodeStatus, string> = {
  active: "bg-rose-100 text-rose-700 animate-pulse",
  resolved: "bg-slate-100 text-slate-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function responseMin(c: EmergencyCode): number | null {
  if (!c.arrivedAt) return null;
  const diff = new Date(c.arrivedAt).getTime() - new Date(c.activatedAt).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.round(diff / 60000);
}
function resolutionMin(c: EmergencyCode): number | null {
  if (!c.resolvedAt) return null;
  const diff = new Date(c.resolvedAt).getTime() - new Date(c.activatedAt).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.round(diff / 60000);
}

export default function EmergencyCodesPage() {
  const [codes, setCodes] = useState<EmergencyCode[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<CodeStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<CodeType | "">("");
  const [filterStatus, setFilterStatus] = useState<CodeStatus | "">("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editCode, setEditCode] = useState<EmergencyCode | null>(null);
  const [resolveFor, setResolveFor] = useState<EmergencyCode | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterType) p.set("codeType", filterType);
    if (filterStatus) p.set("status", filterStatus);
    else if (activeOnly) p.set("status", "active");
    const [cRes, pRes] = await Promise.all([
      fetch(`/api/hospital/emergency-codes?${p.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (cRes.ok) {
      const d = await cRes.json();
      setCodes(d.codes || []);
      setStats(d.stats || null);
    }
    if (pRes.ok) {
      const d = await pRes.json();
      setPatients(d.patients || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filterType, filterStatus, activeOnly]);

  // Refresh every 30s while an active code exists on screen
  useEffect(() => {
    const hasActive = codes.some((c) => c.status === "active");
    if (!hasActive) return;
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes.some((c) => c.status === "active")]);

  async function saveCode(input: Record<string, unknown>) {
    const method = editCode ? "PATCH" : "POST";
    const body = editCode ? { id: editCode.id, ...input } : input;
    const res = await fetch("/api/hospital/emergency-codes", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(`Save failed: ${d.error || res.status}`);
      return;
    }
    setShowForm(false);
    setEditCode(null);
    await load();
  }

  async function markArrived(id: string) {
    await fetch("/api/hospital/emergency-codes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "arrived", id }),
    });
    await load();
  }

  async function patchCode(id: string, patch: Record<string, unknown>) {
    await fetch("/api/hospital/emergency-codes", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    await load();
  }

  async function deleteCode(id: string) {
    if (!confirm("Delete this emergency code record?")) return;
    await fetch("/api/hospital/emergency-codes", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Emergency Code Activations
          </h1>
          <p className="text-sm text-slate-500">
            Rapid-response log with arrival-time audit & resuscitation outcomes
          </p>
        </div>
        <button
          onClick={() => {
            setEditCode(null);
            setShowForm(true);
          }}
          className="rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          🚨 Activate Code
        </button>
      </header>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <Stat label="Active now" value={stats.activeNow} color={stats.activeNow > 0 ? "rose" : "slate"} />
          <Stat label="This month" value={stats.codesThisMonth} color="slate" />
          <Stat label="Code Blue (month)" value={stats.codeBlueThisMonth} color="blue" />
          <Stat label="Drills (month)" value={stats.drillsThisMonth} color="slate" />
          <Stat label="False alarms" value={stats.falseAlarmsThisMonth} color={stats.falseAlarmsThisMonth > 3 ? "amber" : "slate"} sub="this month" />
          <Stat label="Avg response" value={`${stats.avgResponseMin}m`} color={stats.avgResponseMin > 5 ? "rose" : "emerald"} sub="last 90d" />
          <Stat label="Blue survival" value={`${stats.codeBlueSurvivalPct}%`} color="blue" sub="ROSC+xfer / 90d" />
        </div>
      )}

      <Section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as CodeType | "")}
            className="inp"
          >
            <option value="">All code types</option>
            {CODE_TYPES.map((t) => (
              <option key={t} value={t}>Code {CODE_SHORT[t]}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as CodeStatus | "");
              setActiveOnly(false);
            }}
            className="inp"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => {
                setActiveOnly(e.target.checked);
                if (e.target.checked) setFilterStatus("");
              }}
            />
            Active only
          </label>
          <span className="ml-auto text-xs text-slate-500">
            {loading ? "Loading…" : `${codes.length} event(s)`}
          </span>
        </div>

        {codes.length === 0 ? (
          <Empty label="No code activations logged." />
        ) : (
          <div className="space-y-2">
            {codes.map((c) => (
              <CodeRow
                key={c.id}
                c={c}
                expanded={expanded === c.id}
                onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
                onArrived={() => markArrived(c.id)}
                onResolve={() => setResolveFor(c)}
                onCancel={() =>
                  patchCode(c.id, { status: "cancelled", outcome: "false_alarm" })
                }
                onEdit={() => {
                  setEditCode(c);
                  setShowForm(true);
                }}
                onDelete={() => deleteCode(c.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {showForm && (
        <CodeFormModal
          initial={editCode}
          patients={patients}
          onSave={saveCode}
          onClose={() => {
            setShowForm(false);
            setEditCode(null);
          }}
        />
      )}

      {resolveFor && (
        <ResolveModal
          code={resolveFor}
          onSave={async (input) => {
            await patchCode(resolveFor.id, { ...input, status: "resolved" });
            setResolveFor(null);
          }}
          onClose={() => setResolveFor(null)}
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

function CodeRow({
  c,
  expanded,
  onToggle,
  onArrived,
  onResolve,
  onCancel,
  onEdit,
  onDelete,
}: {
  c: EmergencyCode;
  expanded: boolean;
  onToggle: () => void;
  onArrived: () => void;
  onResolve: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rm = responseMin(c);
  const resM = resolutionMin(c);
  const overTarget = rm !== null && rm > 5;
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        c.status === "active"
          ? "border-rose-300 bg-rose-50/60 shadow-sm"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`flex-shrink-0 rounded-lg px-3 py-2 text-[13px] font-bold uppercase tracking-wide ${CODE_COLOR[c.codeType]}`}
          >
            {CODE_SHORT[c.codeType]}
          </span>
          <div>
            <button onClick={onToggle} className="text-left hover:text-primary-700">
              <div className="font-mono text-[11px] text-slate-500">
                {c.eventNumber}
              </div>
              <div className="text-base font-semibold text-slate-900">
                {CODE_LABEL[c.codeType].split("—")[1]?.trim() || CODE_SHORT[c.codeType]}
              </div>
            </button>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-600">
              <span>📍 {c.location}</span>
              <span>Called by {c.calledBy}</span>
              {c.patientName && <span>• Patient: {c.patientName}</span>}
              {c.isDrill && (
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                  DRILL
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-slate-500">
              <span>Activated {new Date(c.activatedAt).toLocaleString()}</span>
              {c.arrivedAt && (
                <span className={overTarget ? "font-semibold text-rose-700" : "text-emerald-700"}>
                  Team arrived in {rm}m{overTarget ? " (over target)" : ""}
                </span>
              )}
              {!c.arrivedAt && c.status === "active" && (
                <span className="text-rose-600">⏱ Awaiting arrival</span>
              )}
              {resM !== null && <span>Resolved in {resM}m</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[c.status]}`}
          >
            {c.status}
          </span>
          {c.outcome && (
            <span className="text-[11px] text-slate-500">
              {OUTCOME_LABEL[c.outcome]}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {c.status === "active" && !c.arrivedAt && (
          <button
            onClick={onArrived}
            className="rounded bg-emerald-600 px-3 py-1 text-[12px] font-semibold text-white hover:bg-emerald-700"
          >
            ✓ Team arrived
          </button>
        )}
        {c.status === "active" && (
          <>
            <button
              onClick={onResolve}
              className="rounded bg-slate-800 px-3 py-1 text-[12px] font-semibold text-white hover:bg-slate-900"
            >
              Resolve with outcome
            </button>
            <button
              onClick={onCancel}
              className="rounded bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-200"
            >
              Cancel (false alarm)
            </button>
          </>
        )}
        <button
          onClick={onEdit}
          className="rounded border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded border border-slate-200 px-3 py-1 text-[12px] font-semibold text-rose-600 hover:bg-rose-50"
        >
          Delete
        </button>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KV k="Patient MRN" v={c.patientMRN || "—"} />
            <KV
              k="Team size"
              v={`${c.teamMembers.length} member(s)`}
            />
            <KV k="Interventions" v={`${c.interventions.length}`} />
            <KV k="Created" v={new Date(c.createdAt).toLocaleString()} />
          </div>
          {c.teamMembers.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                Team members
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {c.teamMembers.map((m, i) => (
                  <span
                    key={i}
                    className="rounded bg-white px-2 py-0.5 text-[12px] text-slate-700 ring-1 ring-slate-200"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
          {c.interventions.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                Interventions
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {c.interventions.map((i) => (
                  <span
                    key={i}
                    className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                  >
                    {INTERVENTION_LABEL[i]}
                  </span>
                ))}
              </div>
            </div>
          )}
          {c.notes && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                Notes
              </div>
              <div className="text-sm text-slate-700">{c.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CodeFormModal({
  initial,
  patients,
  onSave,
  onClose,
}: {
  initial: EmergencyCode | null;
  patients: Patient[];
  onSave: (input: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    codeType: initial?.codeType || ("blue" as CodeType),
    location: initial?.location || "",
    calledBy: initial?.calledBy || "",
    activatedAt: initial?.activatedAt
      ? initial.activatedAt.slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    arrivedAt: initial?.arrivedAt ? initial.arrivedAt.slice(0, 16) : "",
    patientId: initial?.patientId || "",
    patientName: initial?.patientName || "",
    patientMRN: initial?.patientMRN || "",
    teamMembersText: (initial?.teamMembers || []).join(", "),
    isDrill: initial?.isDrill ?? false,
    notes: initial?.notes || "",
  });

  function submit() {
    if (!form.location.trim()) {
      alert("Location is required");
      return;
    }
    if (!form.calledBy.trim()) {
      alert("Caller is required");
      return;
    }
    const teamMembers = form.teamMembersText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({
      codeType: form.codeType,
      location: form.location.trim(),
      calledBy: form.calledBy.trim(),
      activatedAt: new Date(form.activatedAt).toISOString(),
      arrivedAt: form.arrivedAt ? new Date(form.arrivedAt).toISOString() : undefined,
      patientId: form.patientId || undefined,
      patientName: form.patientName.trim() || undefined,
      patientMRN: form.patientMRN.trim() || undefined,
      teamMembers,
      isDrill: form.isDrill,
      notes: form.notes.trim() || undefined,
    });
  }

  return (
    <Modal title={initial ? "Edit code" : "🚨 Activate emergency code"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code type *">
          <select
            value={form.codeType}
            onChange={(e) => setForm({ ...form, codeType: e.target.value as CodeType })}
            className="inp"
          >
            {CODE_TYPES.map((t) => (
              <option key={t} value={t}>{CODE_LABEL[t]}</option>
            ))}
          </select>
        </Field>
        <Field label="Location *">
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g. ICU Bed 4 / Ward 3-B / Lobby"
            className="inp"
          />
        </Field>
        <Field label="Called by *">
          <input
            value={form.calledBy}
            onChange={(e) => setForm({ ...form, calledBy: e.target.value })}
            placeholder="Nurse / staff name"
            className="inp"
          />
        </Field>
        <Field label="Activated at">
          <input
            type="datetime-local"
            value={form.activatedAt}
            onChange={(e) => setForm({ ...form, activatedAt: e.target.value })}
            className="inp"
          />
        </Field>
        <Field label="Team arrived at">
          <input
            type="datetime-local"
            value={form.arrivedAt}
            onChange={(e) => setForm({ ...form, arrivedAt: e.target.value })}
            className="inp"
          />
        </Field>
        <Field label="Patient (if applicable)">
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
            <option value="">— None / manual —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} {p.mrn ? `· ${p.mrn}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Patient name">
          <input
            value={form.patientName}
            onChange={(e) => setForm({ ...form, patientName: e.target.value })}
            className="inp"
          />
        </Field>
        <Field label="Patient MRN">
          <input
            value={form.patientMRN}
            onChange={(e) => setForm({ ...form, patientMRN: e.target.value })}
            className="inp"
          />
        </Field>
        <div className="col-span-2">
          <Field label="Team members (comma separated)">
            <input
              value={form.teamMembersText}
              onChange={(e) => setForm({ ...form, teamMembersText: e.target.value })}
              placeholder="Dr. X, Nurse Y, Resp. therapist Z"
              className="inp"
            />
          </Field>
        </div>
        <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isDrill}
            onChange={(e) => setForm({ ...form, isDrill: e.target.checked })}
          />
          This is a drill / training exercise (excluded from live stats)
        </label>
        <div className="col-span-2">
          <Field label="Notes">
            <textarea
              rows={3}
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
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          {initial ? "Save" : "Activate"}
        </button>
      </div>
    </Modal>
  );
}

function ResolveModal({
  code,
  onSave,
  onClose,
}: {
  code: EmergencyCode;
  onSave: (input: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [outcome, setOutcome] = useState<CodeOutcome>(
    code.codeType === "blue" ? "rosc" : "resolved"
  );
  const [interventions, setInterventions] = useState<Intervention[]>(
    code.interventions || []
  );
  const [resolvedAt, setResolvedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState(code.notes || "");

  function toggle(i: Intervention) {
    setInterventions((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  function submit() {
    onSave({
      outcome,
      interventions,
      resolvedAt: new Date(resolvedAt).toISOString(),
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Modal title={`Resolve ${code.eventNumber}`} onClose={onClose}>
      <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm">
        <span className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${CODE_COLOR[code.codeType]}`}>
          {CODE_SHORT[code.codeType]}
        </span>
        <span className="ml-2 font-semibold text-slate-900">{code.location}</span>
        <span className="ml-2 text-slate-500">• Called by {code.calledBy}</span>
      </div>
      <div className="space-y-4">
        <Field label="Resolved at">
          <input
            type="datetime-local"
            value={resolvedAt}
            onChange={(e) => setResolvedAt(e.target.value)}
            className="inp"
          />
        </Field>
        <Field label="Outcome">
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as CodeOutcome)}
            className="inp"
          >
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>
            ))}
          </select>
        </Field>
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Interventions performed
          </div>
          <div className="flex flex-wrap gap-2">
            {INTERVENTIONS.map((i) => {
              const on = interventions.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
                    on
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {INTERVENTION_LABEL[i]}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Debrief notes">
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="inp"
          />
        </Field>
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
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
        >
          Mark resolved
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
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
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
