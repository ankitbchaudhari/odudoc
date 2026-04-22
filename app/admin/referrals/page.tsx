"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

type ReferralDirection = "inbound" | "outbound" | "internal";
type ReferralUrgency = "routine" | "urgent" | "emergency";
type ReferralStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "declined"
  | "cancelled";

interface ReferralAttachment {
  label: string;
  url: string;
}

interface Referral {
  id: string;
  referralNumber: string;
  patientId: string;
  direction: ReferralDirection;
  fromProvider?: string;
  fromOrganization?: string;
  fromSpecialty?: string;
  toProvider?: string;
  toOrganization?: string;
  toSpecialty?: string;
  toDepartment?: string;
  reason: string;
  clinicalSummary?: string;
  provisionalDiagnosis?: string;
  urgency: ReferralUrgency;
  requestedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  status: ReferralStatus;
  feedback?: string;
  feedbackBy?: string;
  feedbackAt?: string;
  declineReason?: string;
  cancelReason?: string;
  attachments: ReferralAttachment[];
  notes?: string;
  createdAt: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

const DIRECTION_LABEL: Record<ReferralDirection, string> = {
  inbound: "Inbound",
  outbound: "Outbound",
  internal: "Internal",
};

const DIRECTION_STYLE: Record<ReferralDirection, string> = {
  inbound: "bg-sky-100 text-sky-700",
  outbound: "bg-violet-100 text-violet-700",
  internal: "bg-slate-100 text-slate-700",
};

const URGENCY_STYLE: Record<ReferralUrgency, string> = {
  routine: "bg-slate-100 text-slate-600",
  urgent: "bg-amber-100 text-amber-700",
  emergency: "bg-rose-100 text-rose-700",
};

const STATUS_STYLE: Record<ReferralStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-sky-100 text-sky-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  declined: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-200 text-slate-600 line-through",
};

const EMPTY_DRAFT = {
  patientId: "",
  direction: "outbound" as ReferralDirection,
  fromProvider: "",
  fromOrganization: "",
  fromSpecialty: "",
  toProvider: "",
  toOrganization: "",
  toSpecialty: "",
  toDepartment: "",
  reason: "",
  clinicalSummary: "",
  provisionalDiagnosis: "",
  urgency: "routine" as ReferralUrgency,
  requestedDate: new Date().toISOString().slice(0, 10),
  scheduledDate: "",
  attachments: [] as ReferralAttachment[],
  notes: "",
};

export default function ReferralsPage() {
  const [list, setList] = useState<Referral[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [fPatient, setFPatient] = useState("");
  const [fDirection, setFDirection] = useState<ReferralDirection | "">("");
  const [fStatus, setFStatus] = useState<ReferralStatus | "">("");
  const [fUrgency, setFUrgency] = useState<ReferralUrgency | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Referral | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState({ text: "", by: "" });
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fPatient) params.set("patientId", fPatient);
      if (fDirection) params.set("direction", fDirection);
      if (fStatus) params.set("status", fStatus);
      if (fUrgency) params.set("urgency", fUrgency);
      const [rr, pr] = await Promise.all([
        fetch(`/api/hospital/referrals?${params}`, { cache: "no-store" }),
        fetch("/api/patients", { cache: "no-store" }),
      ]);
      if (rr.ok) setList((await rr.json()).referrals || []);
      if (pr.ok) setPatients((await pr.json()).patients || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fPatient, fDirection, fStatus, fUrgency]);

  const patientMap = useMemo(() => {
    const m: Record<string, Patient> = {};
    for (const p of patients) m[p.id] = p;
    return m;
  }, [patients]);

  function resetDraft() {
    setDraft({ ...EMPTY_DRAFT });
    setEditing(null);
  }
  function openNew() {
    resetDraft();
    setShowForm(true);
  }
  function openEdit(r: Referral) {
    setEditing(r);
    setDraft({
      patientId: r.patientId,
      direction: r.direction,
      fromProvider: r.fromProvider || "",
      fromOrganization: r.fromOrganization || "",
      fromSpecialty: r.fromSpecialty || "",
      toProvider: r.toProvider || "",
      toOrganization: r.toOrganization || "",
      toSpecialty: r.toSpecialty || "",
      toDepartment: r.toDepartment || "",
      reason: r.reason,
      clinicalSummary: r.clinicalSummary || "",
      provisionalDiagnosis: r.provisionalDiagnosis || "",
      urgency: r.urgency,
      requestedDate: r.requestedDate.slice(0, 10),
      scheduledDate: r.scheduledDate ? r.scheduledDate.slice(0, 10) : "",
      attachments: r.attachments.map((a) => ({ ...a })),
      notes: r.notes || "",
    });
    setShowForm(true);
  }

  function addAttachment() {
    setDraft({
      ...draft,
      attachments: [...draft.attachments, { label: "", url: "" }],
    });
  }
  function setAttachment(i: number, patch: Partial<ReferralAttachment>) {
    const atts = [...draft.attachments];
    atts[i] = { ...atts[i], ...patch };
    setDraft({ ...draft, attachments: atts });
  }
  function removeAttachment(i: number) {
    const atts = [...draft.attachments];
    atts.splice(i, 1);
    setDraft({ ...draft, attachments: atts });
  }

  async function submit() {
    if (!draft.patientId || !draft.reason.trim()) return;
    if (editing) {
      const res = await fetch("/api/hospital/referrals", {
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
      const res = await fetch("/api/hospital/referrals", {
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

  async function setStatus(id: string, status: ReferralStatus) {
    let extra: Record<string, string> = {};
    if (status === "declined") {
      const r = prompt("Reason for declining:");
      if (r === null) return;
      extra = { declineReason: r };
    } else if (status === "cancelled") {
      const r = prompt("Reason for cancelling:");
      if (r === null) return;
      extra = { cancelReason: r };
    }
    const res = await fetch("/api/hospital/referrals", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, ...extra }),
    });
    if (res.ok) load();
  }

  async function submitFeedback(id: string) {
    if (!feedbackDraft.text.trim()) {
      setFeedbackFor(null);
      return;
    }
    const res = await fetch("/api/hospital/referrals", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        feedback: feedbackDraft.text,
        feedbackBy: feedbackDraft.by,
      }),
    });
    if (res.ok) {
      setFeedbackFor(null);
      setFeedbackDraft({ text: "", by: "" });
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this referral?")) return;
    const res = await fetch("/api/hospital/referrals", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  const stats = useMemo(() => {
    return {
      total: list.length,
      pending: list.filter((r) => r.status === "pending").length,
      emergency: list.filter(
        (r) =>
          r.urgency === "emergency" &&
          r.status !== "completed" &&
          r.status !== "cancelled" &&
          r.status !== "declined"
      ).length,
      completed: list.filter((r) => r.status === "completed").length,
    };
  }, [list]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Referrals</h1>
          <p className="text-sm text-slate-500">
            Inbound & outbound referral tracking with urgency, status workflow, and feedback loop.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700"
        >
          + New Referral
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Total" value={stats.total} tone="slate" />
        <Stat label="Pending" value={stats.pending} tone="amber" />
        <Stat label="Open emergencies" value={stats.emergency} tone="rose" />
        <Stat label="Completed" value={stats.completed} tone="emerald" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={fPatient}
          onChange={(e) => setFPatient(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>
        <select
          value={fDirection}
          onChange={(e) => setFDirection(e.target.value as ReferralDirection | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
          <option value="internal">Internal</option>
        </select>
        <select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value as ReferralStatus | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="declined">Declined</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={fUrgency}
          onChange={(e) => setFUrgency(e.target.value as ReferralUrgency | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All urgencies</option>
          <option value="routine">Routine</option>
          <option value="urgent">Urgent</option>
          <option value="emergency">Emergency</option>
        </select>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editing ? `Edit ${editing.referralNumber}` : "New Referral"}
          </h2>

          <Section title="Core">
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
              <Field label="Direction">
                <select
                  value={draft.direction}
                  onChange={(e) =>
                    setDraft({ ...draft, direction: e.target.value as ReferralDirection })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="outbound">Outbound (we are sending)</option>
                  <option value="inbound">Inbound (received by us)</option>
                  <option value="internal">Internal (between our departments)</option>
                </select>
              </Field>
              <Field label="Urgency">
                <select
                  value={draft.urgency}
                  onChange={(e) =>
                    setDraft({ ...draft, urgency: e.target.value as ReferralUrgency })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </Field>
              <Field label="Reason *" span3>
                <input
                  value={draft.reason}
                  onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                  placeholder="e.g. Cardiology opinion for new-onset AF"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Provisional diagnosis">
                <input
                  value={draft.provisionalDiagnosis}
                  onChange={(e) =>
                    setDraft({ ...draft, provisionalDiagnosis: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Requested date">
                <input
                  type="date"
                  value={draft.requestedDate}
                  onChange={(e) => setDraft({ ...draft, requestedDate: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Scheduled date">
                <input
                  type="date"
                  value={draft.scheduledDate}
                  onChange={(e) => setDraft({ ...draft, scheduledDate: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Clinical summary" span3>
                <textarea
                  rows={3}
                  value={draft.clinicalSummary}
                  onChange={(e) => setDraft({ ...draft, clinicalSummary: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
            </div>
          </Section>

          <Section title="Routing">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="From provider">
                <input
                  value={draft.fromProvider}
                  onChange={(e) => setDraft({ ...draft, fromProvider: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="From organization">
                <input
                  value={draft.fromOrganization}
                  onChange={(e) =>
                    setDraft({ ...draft, fromOrganization: e.target.value })
                  }
                  placeholder="For inbound"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="From specialty">
                <input
                  value={draft.fromSpecialty}
                  onChange={(e) =>
                    setDraft({ ...draft, fromSpecialty: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="To provider">
                <input
                  value={draft.toProvider}
                  onChange={(e) => setDraft({ ...draft, toProvider: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="To organization">
                <input
                  value={draft.toOrganization}
                  onChange={(e) =>
                    setDraft({ ...draft, toOrganization: e.target.value })
                  }
                  placeholder="For outbound"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="To specialty">
                <input
                  value={draft.toSpecialty}
                  onChange={(e) => setDraft({ ...draft, toSpecialty: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="To department (internal)" span3>
                <input
                  value={draft.toDepartment}
                  onChange={(e) =>
                    setDraft({ ...draft, toDepartment: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
            </div>
          </Section>

          <Section title="Attachments">
            <div className="space-y-2">
              {draft.attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    placeholder="Label"
                    value={a.label}
                    onChange={(e) => setAttachment(i, { label: e.target.value })}
                    className="w-40 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="https://…"
                    value={a.url}
                    onChange={(e) => setAttachment(i, { url: e.target.value })}
                    className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => removeAttachment(i)}
                    className="rounded-md border border-rose-200 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addAttachment}
                className="rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                + Add attachment
              </button>
            </div>
          </Section>

          <Section title="Notes">
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            />
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
              {editing ? "Save" : "Create"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left">Ref #</th>
              <th className="px-4 py-2.5 text-left">Patient</th>
              <th className="px-4 py-2.5 text-left">Direction</th>
              <th className="px-4 py-2.5 text-left">Reason</th>
              <th className="px-4 py-2.5 text-left">Route</th>
              <th className="px-4 py-2.5 text-left">Urgency</th>
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
                  No referrals yet.
                </td>
              </tr>
            ) : (
              list.map((r) => {
                const pt = patientMap[r.patientId];
                const isOpen = expanded === r.id;
                const routeLabel =
                  r.direction === "inbound"
                    ? `from ${[r.fromProvider, r.fromOrganization].filter(Boolean).join(" · ") || "—"}`
                    : `to ${[r.toProvider, r.toOrganization || r.toDepartment, r.toSpecialty].filter(Boolean).join(" · ") || "—"}`;
                return (
                  <Fragment key={r.id}>
                    <tr className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        <button
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                          className="hover:text-primary-600"
                        >
                          {r.referralNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {pt ? `${pt.firstName} ${pt.lastName}` : "Unknown"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DIRECTION_STYLE[r.direction]}`}
                        >
                          {DIRECTION_LABEL[r.direction]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.reason}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{routeLabel}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${URGENCY_STYLE[r.urgency]}`}
                        >
                          {r.urgency}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={r.status}
                          onChange={(e) => setStatus(r.id, e.target.value as ReferralStatus)}
                          className={`rounded-full border-0 px-2 py-0.5 text-[11px] font-medium focus:ring-1 ${STATUS_STYLE[r.status]}`}
                        >
                          <option value="pending">pending</option>
                          <option value="accepted">accepted</option>
                          <option value="in_progress">in progress</option>
                          <option value="completed">completed</option>
                          <option value="declined">declined</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {r.status !== "completed" &&
                            r.status !== "cancelled" &&
                            r.status !== "declined" && (
                              <button
                                onClick={() => {
                                  setFeedbackFor(r.id);
                                  setFeedbackDraft({
                                    text: r.feedback || "",
                                    by: r.feedbackBy || "",
                                  });
                                }}
                                className="rounded-md bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-200"
                              >
                                {r.feedback ? "Update feedback" : "Add feedback"}
                              </button>
                            )}
                          <button
                            onClick={() => openEdit(r)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(r.id)}
                            className="rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                        {feedbackFor === r.id && (
                          <div className="mt-2 space-y-1.5 text-left">
                            <input
                              value={feedbackDraft.by}
                              onChange={(e) =>
                                setFeedbackDraft({ ...feedbackDraft, by: e.target.value })
                              }
                              placeholder="Feedback by"
                              className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                            />
                            <textarea
                              rows={2}
                              value={feedbackDraft.text}
                              onChange={(e) =>
                                setFeedbackDraft({ ...feedbackDraft, text: e.target.value })
                              }
                              placeholder="Notes from receiving clinician…"
                              className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setFeedbackFor(null)}
                                className="text-xs text-slate-400 hover:text-slate-600"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => submitFeedback(r.id)}
                                className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-slate-100 bg-slate-50/60">
                        <td colSpan={8} className="px-6 py-4 text-xs text-slate-700">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <DetailRow label="Provisional diagnosis" value={r.provisionalDiagnosis} />
                            <DetailRow
                              label="Requested / Scheduled"
                              value={`${new Date(r.requestedDate).toLocaleDateString()}${r.scheduledDate ? " → " + new Date(r.scheduledDate).toLocaleDateString() : ""}`}
                            />
                            <DetailRow
                              label="Completed"
                              value={
                                r.completedDate
                                  ? new Date(r.completedDate).toLocaleDateString()
                                  : undefined
                              }
                            />
                            <DetailRow label="Clinical summary" value={r.clinicalSummary} />
                            <DetailRow label="Feedback" value={r.feedback} />
                            {r.feedback && (
                              <DetailRow
                                label="Feedback by"
                                value={[
                                  r.feedbackBy,
                                  r.feedbackAt
                                    ? new Date(r.feedbackAt).toLocaleString()
                                    : undefined,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              />
                            )}
                            <DetailRow label="Decline reason" value={r.declineReason} />
                            <DetailRow label="Cancel reason" value={r.cancelReason} />
                            <DetailRow label="Notes" value={r.notes} />
                          </div>
                          {r.attachments.length > 0 && (
                            <div className="mt-3">
                              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Attachments
                              </div>
                              <ul className="space-y-1">
                                {r.attachments.map((a, i) => (
                                  <li key={i}>
                                    <a
                                      href={a.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs text-primary-600 hover:underline"
                                    >
                                      {a.label || a.url}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
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
  tone: "slate" | "emerald" | "amber" | "rose";
}) {
  const t: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
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

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="whitespace-pre-wrap text-slate-700">{value}</div>
    </div>
  );
}
