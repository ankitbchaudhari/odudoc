"use client";

import { useEffect, useMemo, useState } from "react";

type AllergyType = "drug" | "food" | "environmental" | "biologic" | "other";
type AllergySeverity = "mild" | "moderate" | "severe" | "life_threatening";
type VerificationStatus = "unconfirmed" | "confirmed" | "refuted" | "resolved";

interface Allergy {
  id: string;
  patientId: string;
  substance: string;
  type: AllergyType;
  reaction?: string;
  severity: AllergySeverity;
  verificationStatus: VerificationStatus;
  onsetDate?: string;
  notedBy?: string;
  notes?: string;
  updatedAt: string;
}

type ProblemStatus = "active" | "resolved" | "inactive" | "recurrent";
type ProblemPriority = "routine" | "significant" | "urgent";

interface Problem {
  id: string;
  patientId: string;
  diagnosis: string;
  icd10Code?: string;
  status: ProblemStatus;
  priority: ProblemPriority;
  onsetDate?: string;
  resolvedDate?: string;
  notedBy?: string;
  notes?: string;
  updatedAt: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

const SEVERITY_LABEL: Record<AllergySeverity, string> = {
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
  life_threatening: "Life-threatening",
};

const SEVERITY_STYLE: Record<AllergySeverity, string> = {
  mild: "bg-slate-100 text-slate-700",
  moderate: "bg-amber-100 text-amber-700",
  severe: "bg-orange-100 text-orange-700",
  life_threatening: "bg-rose-600 text-white",
};

const VERIFICATION_STYLE: Record<VerificationStatus, string> = {
  unconfirmed: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  refuted: "bg-slate-100 text-slate-500 line-through",
  resolved: "bg-sky-100 text-sky-700",
};

const ALLERGY_TYPE_LABEL: Record<AllergyType, string> = {
  drug: "Drug",
  food: "Food",
  environmental: "Environmental",
  biologic: "Biologic",
  other: "Other",
};

const PROBLEM_STATUS_STYLE: Record<ProblemStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  recurrent: "bg-amber-100 text-amber-700",
  inactive: "bg-slate-100 text-slate-600",
  resolved: "bg-sky-100 text-sky-700",
};

const PROBLEM_PRIORITY_STYLE: Record<ProblemPriority, string> = {
  routine: "bg-slate-100 text-slate-600",
  significant: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700",
};

export default function ProblemsPage() {
  const [tab, setTab] = useState<"allergies" | "problems">("allergies");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filterPatient, setFilterPatient] = useState("");

  useEffect(() => {
    fetch("/api/patients", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPatients(d.patients || []));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Allergies & Problem List</h1>
        <p className="text-sm text-slate-500">
          Patient-safety record: active allergies with reaction severity, plus chronic / active problems with ICD-10 codes.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={filterPatient}
          onChange={(e) => setFilterPatient(e.target.value)}
          className="min-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        <button
          onClick={() => setTab("allergies")}
          className={`flex-1 rounded-md px-4 py-1.5 font-medium transition-colors ${
            tab === "allergies" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Allergies
        </button>
        <button
          onClick={() => setTab("problems")}
          className={`flex-1 rounded-md px-4 py-1.5 font-medium transition-colors ${
            tab === "problems" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Problem List
        </button>
      </div>

      {tab === "allergies" ? (
        <AllergiesTab patients={patients} filterPatient={filterPatient} />
      ) : (
        <ProblemsTab patients={patients} filterPatient={filterPatient} />
      )}
    </div>
  );
}

// ─── Allergies Tab ─────────────────────────────────────────────

function AllergiesTab({
  patients,
  filterPatient,
}: {
  patients: Patient[];
  filterPatient: string;
}) {
  const [list, setList] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [fSeverity, setFSeverity] = useState<AllergySeverity | "">("");
  const [fType, setFType] = useState<AllergyType | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Allergy | null>(null);
  const [draft, setDraft] = useState({
    patientId: "",
    substance: "",
    type: "drug" as AllergyType,
    reaction: "",
    severity: "moderate" as AllergySeverity,
    verificationStatus: "unconfirmed" as VerificationStatus,
    onsetDate: "",
    notedBy: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPatient) params.set("patientId", filterPatient);
      if (fSeverity) params.set("severity", fSeverity);
      if (fType) params.set("type", fType);
      const res = await fetch(`/api/hospital/allergies?${params}`, {
        cache: "no-store",
      });
      if (res.ok) setList((await res.json()).allergies || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPatient, fSeverity, fType]);

  const patientMap = useMemo(() => {
    const m: Record<string, Patient> = {};
    for (const p of patients) m[p.id] = p;
    return m;
  }, [patients]);

  function resetDraft() {
    setDraft({
      patientId: filterPatient || "",
      substance: "",
      type: "drug",
      reaction: "",
      severity: "moderate",
      verificationStatus: "unconfirmed",
      onsetDate: "",
      notedBy: "",
      notes: "",
    });
    setEditing(null);
  }

  function openNew() {
    resetDraft();
    setShowForm(true);
  }
  function openEdit(a: Allergy) {
    setEditing(a);
    setDraft({
      patientId: a.patientId,
      substance: a.substance,
      type: a.type,
      reaction: a.reaction || "",
      severity: a.severity,
      verificationStatus: a.verificationStatus,
      onsetDate: a.onsetDate ? a.onsetDate.slice(0, 10) : "",
      notedBy: a.notedBy || "",
      notes: a.notes || "",
    });
    setShowForm(true);
  }

  async function submit() {
    if (!draft.patientId || !draft.substance.trim()) return;
    if (editing) {
      const res = await fetch("/api/hospital/allergies", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...draft }),
      });
      if (res.ok) {
        setShowForm(false);
        resetDraft();
        load();
      }
    } else {
      const res = await fetch("/api/hospital/allergies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setShowForm(false);
        resetDraft();
        load();
      }
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this allergy record?")) return;
    const res = await fetch("/api/hospital/allergies", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  const stats = useMemo(() => {
    const critical = list.filter(
      (a) => a.severity === "life_threatening" || a.severity === "severe"
    ).length;
    const drugs = list.filter((a) => a.type === "drug").length;
    const unconfirmed = list.filter((a) => a.verificationStatus === "unconfirmed").length;
    return { total: list.length, critical, drugs, unconfirmed };
  }, [list]);

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Total" value={stats.total} tone="slate" />
        <Stat label="Critical (severe+)" value={stats.critical} tone="rose" />
        <Stat label="Drug allergies" value={stats.drugs} tone="amber" />
        <Stat label="Unconfirmed" value={stats.unconfirmed} tone="amber" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={fType}
          onChange={(e) => setFType(e.target.value as AllergyType | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          {(Object.keys(ALLERGY_TYPE_LABEL) as AllergyType[]).map((t) => (
            <option key={t} value={t}>
              {ALLERGY_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          value={fSeverity}
          onChange={(e) => setFSeverity(e.target.value as AllergySeverity | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All severities</option>
          {(Object.keys(SEVERITY_LABEL) as AllergySeverity[]).map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          onClick={openNew}
          className="ml-auto rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-primary-700"
        >
          + Add Allergy
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editing ? "Edit Allergy" : "New Allergy"}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient *">
              <select
                value={draft.patientId}
                onChange={(e) => setDraft({ ...draft, patientId: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Substance *">
              <input
                value={draft.substance}
                onChange={(e) => setDraft({ ...draft, substance: e.target.value })}
                placeholder="e.g. Penicillin"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Type">
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as AllergyType })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                {(Object.keys(ALLERGY_TYPE_LABEL) as AllergyType[]).map((t) => (
                  <option key={t} value={t}>
                    {ALLERGY_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reaction">
              <input
                value={draft.reaction}
                onChange={(e) => setDraft({ ...draft, reaction: e.target.value })}
                placeholder="e.g. Rash, anaphylaxis"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Severity">
              <select
                value={draft.severity}
                onChange={(e) => setDraft({ ...draft, severity: e.target.value as AllergySeverity })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                {(Object.keys(SEVERITY_LABEL) as AllergySeverity[]).map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Verification">
              <select
                value={draft.verificationStatus}
                onChange={(e) =>
                  setDraft({ ...draft, verificationStatus: e.target.value as VerificationStatus })
                }
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="unconfirmed">Unconfirmed</option>
                <option value="confirmed">Confirmed</option>
                <option value="refuted">Refuted</option>
                <option value="resolved">Resolved</option>
              </select>
            </Field>
            <Field label="Onset date">
              <input
                type="date"
                value={draft.onsetDate}
                onChange={(e) => setDraft({ ...draft, onsetDate: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Noted by">
              <input
                value={draft.notedBy}
                onChange={(e) => setDraft({ ...draft, notedBy: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Notes" span3>
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                resetDraft();
              }}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              {editing ? "Save" : "Create"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left">Patient</th>
              <th className="px-4 py-2.5 text-left">Substance</th>
              <th className="px-4 py-2.5 text-left">Type</th>
              <th className="px-4 py-2.5 text-left">Reaction</th>
              <th className="px-4 py-2.5 text-left">Severity</th>
              <th className="px-4 py-2.5 text-left">Verified</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No allergies recorded.
                </td>
              </tr>
            ) : (
              list.map((a) => {
                const pt = patientMap[a.patientId];
                return (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-900">
                      {pt ? `${pt.firstName} ${pt.lastName}` : "Unknown"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{a.substance}</td>
                    <td className="px-4 py-3 text-slate-600">{ALLERGY_TYPE_LABEL[a.type]}</td>
                    <td className="px-4 py-3 text-slate-600">{a.reaction || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY_STYLE[a.severity]}`}
                      >
                        {SEVERITY_LABEL[a.severity]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${VERIFICATION_STYLE[a.verificationStatus]}`}
                      >
                        {a.verificationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(a)}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(a.id)}
                        className="ml-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Problems Tab ──────────────────────────────────────────────

function ProblemsTab({
  patients,
  filterPatient,
}: {
  patients: Patient[];
  filterPatient: string;
}) {
  const [list, setList] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState<ProblemStatus | "">("");
  const [fPriority, setFPriority] = useState<ProblemPriority | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Problem | null>(null);
  const [draft, setDraft] = useState({
    patientId: "",
    diagnosis: "",
    icd10Code: "",
    status: "active" as ProblemStatus,
    priority: "routine" as ProblemPriority,
    onsetDate: "",
    resolvedDate: "",
    notedBy: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPatient) params.set("patientId", filterPatient);
      if (fStatus) params.set("status", fStatus);
      if (fPriority) params.set("priority", fPriority);
      const res = await fetch(`/api/hospital/problems?${params}`, {
        cache: "no-store",
      });
      if (res.ok) setList((await res.json()).problems || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPatient, fStatus, fPriority]);

  const patientMap = useMemo(() => {
    const m: Record<string, Patient> = {};
    for (const p of patients) m[p.id] = p;
    return m;
  }, [patients]);

  function resetDraft() {
    setDraft({
      patientId: filterPatient || "",
      diagnosis: "",
      icd10Code: "",
      status: "active",
      priority: "routine",
      onsetDate: "",
      resolvedDate: "",
      notedBy: "",
      notes: "",
    });
    setEditing(null);
  }
  function openNew() {
    resetDraft();
    setShowForm(true);
  }
  function openEdit(p: Problem) {
    setEditing(p);
    setDraft({
      patientId: p.patientId,
      diagnosis: p.diagnosis,
      icd10Code: p.icd10Code || "",
      status: p.status,
      priority: p.priority,
      onsetDate: p.onsetDate ? p.onsetDate.slice(0, 10) : "",
      resolvedDate: p.resolvedDate ? p.resolvedDate.slice(0, 10) : "",
      notedBy: p.notedBy || "",
      notes: p.notes || "",
    });
    setShowForm(true);
  }

  async function submit() {
    if (!draft.patientId || !draft.diagnosis.trim()) return;
    if (editing) {
      const res = await fetch("/api/hospital/problems", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...draft }),
      });
      if (res.ok) {
        setShowForm(false);
        resetDraft();
        load();
      }
    } else {
      const res = await fetch("/api/hospital/problems", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setShowForm(false);
        resetDraft();
        load();
      }
    }
  }

  async function setStatus(id: string, status: ProblemStatus) {
    const res = await fetch("/api/hospital/problems", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this problem?")) return;
    const res = await fetch("/api/hospital/problems", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  const stats = useMemo(() => {
    const active = list.filter((p) => p.status === "active").length;
    const urgent = list.filter((p) => p.priority === "urgent").length;
    const resolved = list.filter((p) => p.status === "resolved").length;
    return { total: list.length, active, urgent, resolved };
  }, [list]);

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Total" value={stats.total} tone="slate" />
        <Stat label="Active" value={stats.active} tone="emerald" />
        <Stat label="Urgent" value={stats.urgent} tone="rose" />
        <Stat label="Resolved" value={stats.resolved} tone="sky" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value as ProblemStatus | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="recurrent">Recurrent</option>
          <option value="inactive">Inactive</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={fPriority}
          onChange={(e) => setFPriority(e.target.value as ProblemPriority | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All priorities</option>
          <option value="routine">Routine</option>
          <option value="significant">Significant</option>
          <option value="urgent">Urgent</option>
        </select>
        <button
          onClick={openNew}
          className="ml-auto rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-primary-700"
        >
          + Add Problem
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editing ? "Edit Problem" : "New Problem"}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient *">
              <select
                value={draft.patientId}
                onChange={(e) => setDraft({ ...draft, patientId: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Diagnosis *">
              <input
                value={draft.diagnosis}
                onChange={(e) => setDraft({ ...draft, diagnosis: e.target.value })}
                placeholder="e.g. Type 2 Diabetes Mellitus"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="ICD-10 code">
              <input
                value={draft.icd10Code}
                onChange={(e) => setDraft({ ...draft, icd10Code: e.target.value })}
                placeholder="e.g. E11"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Status">
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as ProblemStatus })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="active">Active</option>
                <option value="recurrent">Recurrent</option>
                <option value="inactive">Inactive</option>
                <option value="resolved">Resolved</option>
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value as ProblemPriority })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="routine">Routine</option>
                <option value="significant">Significant</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
            <Field label="Noted by">
              <input
                value={draft.notedBy}
                onChange={(e) => setDraft({ ...draft, notedBy: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Onset date">
              <input
                type="date"
                value={draft.onsetDate}
                onChange={(e) => setDraft({ ...draft, onsetDate: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Resolved date">
              <input
                type="date"
                value={draft.resolvedDate}
                onChange={(e) => setDraft({ ...draft, resolvedDate: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Notes" span3>
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                resetDraft();
              }}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              {editing ? "Save" : "Create"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left">Patient</th>
              <th className="px-4 py-2.5 text-left">Diagnosis</th>
              <th className="px-4 py-2.5 text-left">ICD-10</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-left">Priority</th>
              <th className="px-4 py-2.5 text-left">Onset</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No problems recorded.
                </td>
              </tr>
            ) : (
              list.map((p) => {
                const pt = patientMap[p.patientId];
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-900">
                      {pt ? `${pt.firstName} ${pt.lastName}` : "Unknown"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.diagnosis}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {p.icd10Code || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={(e) => setStatus(p.id, e.target.value as ProblemStatus)}
                        className={`rounded-full border-0 px-2 py-0.5 text-[11px] font-medium focus:ring-1 ${PROBLEM_STATUS_STYLE[p.status]}`}
                      >
                        <option value="active">active</option>
                        <option value="recurrent">recurrent</option>
                        <option value="inactive">inactive</option>
                        <option value="resolved">resolved</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PROBLEM_PRIORITY_STYLE[p.priority]}`}
                      >
                        {p.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {p.onsetDate ? new Date(p.onsetDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="ml-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "amber" | "rose" | "sky";
}) {
  const t: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    sky: "text-sky-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${t[tone]}`}>{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
  span3,
}: {
  label: string;
  children: React.ReactNode;
  span3?: boolean;
}) {
  return (
    <div className={span3 ? "md:col-span-3" : ""}>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
