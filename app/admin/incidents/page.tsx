"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";

type IncidentCategory =
  | "medication_error"
  | "fall"
  | "needle_stick"
  | "patient_identification"
  | "equipment"
  | "infection"
  | "surgical"
  | "behavioral"
  | "security"
  | "documentation"
  | "transfusion"
  | "other";

type IncidentSubject = "patient" | "staff" | "visitor" | "property" | "facility";

type IncidentSeverity =
  | "near_miss"
  | "no_harm"
  | "mild"
  | "moderate"
  | "severe"
  | "sentinel";

type IncidentStatus =
  | "reported"
  | "under_review"
  | "investigating"
  | "rca_complete"
  | "closed"
  | "reopened";

interface Incident {
  id: string;
  incidentNumber: string;
  category: IncidentCategory;
  subject: IncidentSubject;
  patientId?: string;
  location: string;
  occurredAt: string;
  reportedAt: string;
  reportedBy: string;
  staffInvolved?: string;
  witnesses?: string;
  description: string;
  immediateAction?: string;
  severity: IncidentSeverity;
  confidential: boolean;
  rootCause?: string;
  contributingFactors?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  capaOwner?: string;
  capaTargetDate?: string;
  capaCompletedAt?: string;
  status: IncidentStatus;
  closedAt?: string;
  closedBy?: string;
  closureNotes?: string;
  notes?: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  medication_error: "Medication Error",
  fall: "Patient Fall",
  needle_stick: "Needle-stick",
  patient_identification: "Patient ID",
  equipment: "Equipment",
  infection: "Infection",
  surgical: "Surgical",
  behavioral: "Behavioral",
  security: "Security",
  documentation: "Documentation",
  transfusion: "Transfusion",
  other: "Other",
};

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  near_miss: "Near Miss",
  no_harm: "No Harm",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
  sentinel: "Sentinel",
};

const SEVERITY_STYLE: Record<IncidentSeverity, string> = {
  near_miss: "bg-sky-100 text-sky-700",
  no_harm: "bg-slate-100 text-slate-700",
  mild: "bg-amber-100 text-amber-700",
  moderate: "bg-orange-100 text-orange-700",
  severe: "bg-rose-100 text-rose-700",
  sentinel: "bg-rose-600 text-white",
};

const STATUS_STYLE: Record<IncidentStatus, string> = {
  reported: "bg-amber-100 text-amber-700",
  under_review: "bg-sky-100 text-sky-700",
  investigating: "bg-indigo-100 text-indigo-700",
  rca_complete: "bg-violet-100 text-violet-700",
  closed: "bg-emerald-100 text-emerald-700",
  reopened: "bg-rose-100 text-rose-700",
};

const SUBJECT_LABEL: Record<IncidentSubject, string> = {
  patient: "Patient",
  staff: "Staff",
  visitor: "Visitor",
  property: "Property",
  facility: "Facility",
};

const EMPTY_DRAFT = {
  category: "other" as IncidentCategory,
  subject: "patient" as IncidentSubject,
  patientId: "",
  location: "",
  occurredAt: new Date().toISOString().slice(0, 16),
  reportedAt: new Date().toISOString().slice(0, 16),
  reportedBy: "",
  staffInvolved: "",
  witnesses: "",
  description: "",
  immediateAction: "",
  severity: "no_harm" as IncidentSeverity,
  confidential: false,
  rootCause: "",
  contributingFactors: "",
  correctiveAction: "",
  preventiveAction: "",
  capaOwner: "",
  capaTargetDate: "",
  closureNotes: "",
  closedBy: "",
  notes: "",
};

export default function IncidentsPage() {
  const [list, setList] = useState<Incident[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [fCategory, setFCategory] = useState<IncidentCategory | "">("");
  const [fSeverity, setFSeverity] = useState<IncidentSeverity | "">("");
  const [fStatus, setFStatus] = useState<IncidentStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fCategory) params.set("category", fCategory);
      if (fSeverity) params.set("severity", fSeverity);
      if (fStatus) params.set("status", fStatus);
      const [ir, pr] = await Promise.all([
        fetch(`/api/hospital/incidents?${params}`, { cache: "no-store" }),
        fetch("/api/patients", { cache: "no-store" }),
      ]);
      if (ir.ok) setList((await ir.json()).incidents || []);
      if (pr.ok) setPatients((await pr.json()).patients || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fCategory, fSeverity, fStatus]);

  const patientMap = useMemo(() => {
    const m: Record<string, Patient> = {};
    for (const p of patients) m[p.id] = p;
    return m;
  }, [patients]);

  function resetDraft() {
    setDraft({
      ...EMPTY_DRAFT,
      occurredAt: new Date().toISOString().slice(0, 16),
      reportedAt: new Date().toISOString().slice(0, 16),
    });
    setEditing(null);
  }

  function openNew() {
    resetDraft();
    setShowForm(true);
  }

  function openEdit(i: Incident) {
    setEditing(i);
    setDraft({
      category: i.category,
      subject: i.subject,
      patientId: i.patientId || "",
      location: i.location,
      occurredAt: i.occurredAt.slice(0, 16),
      reportedAt: i.reportedAt.slice(0, 16),
      reportedBy: i.reportedBy,
      staffInvolved: i.staffInvolved || "",
      witnesses: i.witnesses || "",
      description: i.description,
      immediateAction: i.immediateAction || "",
      severity: i.severity,
      confidential: i.confidential,
      rootCause: i.rootCause || "",
      contributingFactors: i.contributingFactors || "",
      correctiveAction: i.correctiveAction || "",
      preventiveAction: i.preventiveAction || "",
      capaOwner: i.capaOwner || "",
      capaTargetDate: i.capaTargetDate ? i.capaTargetDate.slice(0, 10) : "",
      closureNotes: i.closureNotes || "",
      closedBy: i.closedBy || "",
      notes: i.notes || "",
    });
    setShowForm(true);
  }

  async function submit() {
    if (!draft.description.trim()) return;
    if (editing) {
      const res = await fetch("/api/hospital/incidents", {
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
      const res = await fetch("/api/hospital/incidents", {
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

  async function setStatus(id: string, status: IncidentStatus) {
    let closedBy: string | undefined;
    if (status === "closed") {
      const by = prompt("Closed by (your name):");
      if (by === null) return;
      closedBy = by;
    }
    const res = await fetch("/api/hospital/incidents", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, closedBy }),
    });
    if (res.ok) load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this incident report?")) return;
    const res = await fetch("/api/hospital/incidents", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  const stats = useMemo(() => {
    const open = list.filter((i) => i.status !== "closed").length;
    const sentinel = list.filter((i) => i.severity === "sentinel").length;
    const nearMiss = list.filter((i) => i.severity === "near_miss").length;
    const overdueCapa = list.filter(
      (i) =>
        i.capaTargetDate &&
        !i.capaCompletedAt &&
        new Date(i.capaTargetDate).getTime() < Date.now() &&
        i.status !== "closed"
    ).length;
    return { total: list.length, open, sentinel, nearMiss, overdueCapa };
  }, [list]);

  return (
    <div className="space-y-6">
      <PageHero
        icon="⚠️"
        eyebrow="Patient Safety"
        title="Incident Reports"
        subtitle="Adverse events, near-misses, falls, medication errors — with root-cause analysis and CAPA tracking"
        tone="rose"
        primaryAction={{ label: "+ Report Incident", onClick: openNew }}
      />

      <StatGrid cols={4}>
        <StatCard label="Open incidents" value={stats.open} tone={stats.open > 0 ? "amber" : "slate"} icon="📂" />
        <StatCard label="Sentinel events" value={stats.sentinel} tone={stats.sentinel > 0 ? "rose" : "slate"} icon="🚨" />
        <StatCard label="Near misses" value={stats.nearMiss} tone="sky" icon="👀" />
        <StatCard label="Overdue CAPA" value={stats.overdueCapa} tone={stats.overdueCapa > 0 ? "rose" : "emerald"} icon="⏰" />
      </StatGrid>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={fCategory}
          onChange={(e) => setFCategory(e.target.value as IncidentCategory | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {(Object.keys(CATEGORY_LABEL) as IncidentCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <select
          value={fSeverity}
          onChange={(e) => setFSeverity(e.target.value as IncidentSeverity | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All severities</option>
          {(Object.keys(SEVERITY_LABEL) as IncidentSeverity[]).map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value as IncidentStatus | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="reported">Reported</option>
          <option value="under_review">Under review</option>
          <option value="investigating">Investigating</option>
          <option value="rca_complete">RCA complete</option>
          <option value="closed">Closed</option>
          <option value="reopened">Reopened</option>
        </select>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editing ? `Edit ${editing.incidentNumber}` : "Report Incident"}
          </h2>

          <Section title="What happened">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Category">
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value as IncidentCategory })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {(Object.keys(CATEGORY_LABEL) as IncidentCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Subject">
                <select
                  value={draft.subject}
                  onChange={(e) =>
                    setDraft({ ...draft, subject: e.target.value as IncidentSubject })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {(Object.keys(SUBJECT_LABEL) as IncidentSubject[]).map((s) => (
                    <option key={s} value={s}>
                      {SUBJECT_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Severity">
                <select
                  value={draft.severity}
                  onChange={(e) =>
                    setDraft({ ...draft, severity: e.target.value as IncidentSeverity })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {(Object.keys(SEVERITY_LABEL) as IncidentSeverity[]).map((s) => (
                    <option key={s} value={s}>
                      {SEVERITY_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              {draft.subject === "patient" && (
                <Field label="Patient">
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
              )}
              <Field label="Location">
                <input
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  placeholder="e.g. Ward 3B, OT-2"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Occurred at">
                <input
                  type="datetime-local"
                  value={draft.occurredAt}
                  onChange={(e) => setDraft({ ...draft, occurredAt: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Reported at">
                <input
                  type="datetime-local"
                  value={draft.reportedAt}
                  onChange={(e) => setDraft({ ...draft, reportedAt: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Reported by">
                <input
                  value={draft.reportedBy}
                  onChange={(e) => setDraft({ ...draft, reportedBy: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Staff involved">
                <input
                  value={draft.staffInvolved}
                  onChange={(e) => setDraft({ ...draft, staffInvolved: e.target.value })}
                  placeholder="Names, comma-separated"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Witnesses">
                <input
                  value={draft.witnesses}
                  onChange={(e) => setDraft({ ...draft, witnesses: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Description *" span3>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Immediate action taken" span3>
                <textarea
                  rows={2}
                  value={draft.immediateAction}
                  onChange={(e) => setDraft({ ...draft, immediateAction: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Confidential">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.confidential}
                    onChange={(e) =>
                      setDraft({ ...draft, confidential: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Restrict to QA/admin
                </label>
              </Field>
            </div>
          </Section>

          <Section title="Root-Cause Analysis & CAPA">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Root cause">
                <textarea
                  rows={2}
                  value={draft.rootCause}
                  onChange={(e) => setDraft({ ...draft, rootCause: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Contributing factors">
                <textarea
                  rows={2}
                  value={draft.contributingFactors}
                  onChange={(e) =>
                    setDraft({ ...draft, contributingFactors: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Corrective action (now)">
                <textarea
                  rows={2}
                  value={draft.correctiveAction}
                  onChange={(e) =>
                    setDraft({ ...draft, correctiveAction: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Preventive action (long-term)">
                <textarea
                  rows={2}
                  value={draft.preventiveAction}
                  onChange={(e) =>
                    setDraft({ ...draft, preventiveAction: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="CAPA owner">
                <input
                  value={draft.capaOwner}
                  onChange={(e) => setDraft({ ...draft, capaOwner: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="CAPA target date">
                <input
                  type="date"
                  value={draft.capaTargetDate}
                  onChange={(e) =>
                    setDraft({ ...draft, capaTargetDate: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Closure notes" span2>
                <textarea
                  rows={2}
                  value={draft.closureNotes}
                  onChange={(e) => setDraft({ ...draft, closureNotes: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Internal notes" span2>
                <textarea
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
            </div>
          </Section>

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
              {editing ? "Save" : "Report"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left">Incident #</th>
              <th className="px-4 py-2.5 text-left">Category</th>
              <th className="px-4 py-2.5 text-left">Subject</th>
              <th className="px-4 py-2.5 text-left">Location</th>
              <th className="px-4 py-2.5 text-left">Occurred</th>
              <th className="px-4 py-2.5 text-left">Severity</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No incidents reported.
                </td>
              </tr>
            ) : (
              list.map((i) => {
                const pt = i.patientId ? patientMap[i.patientId] : undefined;
                const isOpen = expanded === i.id;
                const capaOverdue =
                  i.capaTargetDate &&
                  !i.capaCompletedAt &&
                  new Date(i.capaTargetDate).getTime() < Date.now() &&
                  i.status !== "closed";
                return (
                  <Fragment key={i.id}>
                    <tr className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        <button
                          onClick={() => setExpanded(isOpen ? null : i.id)}
                          className="hover:text-primary-600"
                        >
                          {i.incidentNumber}
                        </button>
                        {i.confidential && (
                          <div className="mt-0.5 text-[10px] text-rose-600">🔒 confidential</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {CATEGORY_LABEL[i.category]}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{SUBJECT_LABEL[i.subject]}</div>
                        {pt && (
                          <div className="text-xs text-slate-500">
                            {pt.firstName} {pt.lastName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {i.location || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(i.occurredAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY_STYLE[i.severity]}`}
                        >
                          {SEVERITY_LABEL[i.severity]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={i.status}
                          onChange={(e) => setStatus(i.id, e.target.value as IncidentStatus)}
                          className={`rounded-full border-0 px-2 py-0.5 text-[11px] font-medium focus:ring-1 ${STATUS_STYLE[i.status]}`}
                        >
                          <option value="reported">reported</option>
                          <option value="under_review">under review</option>
                          <option value="investigating">investigating</option>
                          <option value="rca_complete">RCA complete</option>
                          <option value="closed">closed</option>
                          <option value="reopened">reopened</option>
                        </select>
                        {capaOverdue && (
                          <div className="mt-1 text-[10px] text-rose-600">⚠ CAPA overdue</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(i)}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(i.id)}
                          className="ml-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-slate-100 bg-slate-50/60">
                        <td colSpan={8} className="px-6 py-4 text-xs text-slate-700">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <DetailRow label="Description" value={i.description} />
                            <DetailRow label="Immediate action" value={i.immediateAction} />
                            <DetailRow label="Reported by" value={i.reportedBy} />
                            <DetailRow label="Staff involved" value={i.staffInvolved} />
                            <DetailRow label="Witnesses" value={i.witnesses} />
                            <DetailRow label="Root cause" value={i.rootCause} />
                            <DetailRow
                              label="Contributing factors"
                              value={i.contributingFactors}
                            />
                            <DetailRow label="Corrective action" value={i.correctiveAction} />
                            <DetailRow label="Preventive action" value={i.preventiveAction} />
                            <DetailRow
                              label="CAPA"
                              value={
                                [
                                  i.capaOwner,
                                  i.capaTargetDate
                                    ? `target ${new Date(i.capaTargetDate).toLocaleDateString()}`
                                    : undefined,
                                  i.capaCompletedAt
                                    ? `completed ${new Date(i.capaCompletedAt).toLocaleDateString()}`
                                    : undefined,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || undefined
                              }
                            />
                            {i.closedAt && (
                              <DetailRow
                                label="Closed"
                                value={`${new Date(i.closedAt).toLocaleString()}${i.closedBy ? " by " + i.closedBy : ""}`}
                              />
                            )}
                            <DetailRow label="Closure notes" value={i.closureNotes} />
                            <DetailRow label="Internal notes" value={i.notes} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-slate-100 pt-4 first:mt-0 first:border-0 first:pt-0">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  span2,
  span3,
}: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
  span3?: boolean;
}) {
  return (
    <div className={span3 ? "md:col-span-3" : span2 ? "md:col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="whitespace-pre-wrap text-slate-700">{value}</div>
    </div>
  );
}
