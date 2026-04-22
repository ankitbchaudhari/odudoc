"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

type DischargeDisposition =
  | "home"
  | "home_with_care"
  | "transfer_hospital"
  | "transfer_rehab"
  | "lama"
  | "absconded"
  | "expired";

type DischargeStatus = "draft" | "finalized" | "amended";

interface DischargeMed {
  drug: string;
  strength?: string;
  dose?: string;
  frequency?: string;
  durationDays?: number;
  notes?: string;
}

interface DischargeSummary {
  id: string;
  summaryNumber: string;
  patientId: string;
  admissionId?: string;
  admittingDoctor?: string;
  dischargingDoctor?: string;
  admissionDate?: string;
  dischargeDate: string;
  lengthOfStayDays?: number;
  primaryDiagnosis: string;
  secondaryDiagnoses?: string;
  chiefComplaint?: string;
  historySummary?: string;
  examinationFindings?: string;
  investigationsSummary?: string;
  proceduresPerformed?: string;
  hospitalCourse?: string;
  complications?: string;
  conditionAtDischarge?: string;
  disposition: DischargeDisposition;
  medications: DischargeMed[];
  dietAdvice?: string;
  activityAdvice?: string;
  followUpPlan?: string;
  followUpDate?: string;
  warningSignsAdvised?: string;
  status: DischargeStatus;
  supersedesId?: string;
  supersededById?: string;
  finalizedAt?: string;
  amendedAt?: string;
  amendmentReason?: string;
  notes?: string;
  createdAt: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

const DISPOSITION_LABEL: Record<DischargeDisposition, string> = {
  home: "Home",
  home_with_care: "Home + Care",
  transfer_hospital: "Transfer Hospital",
  transfer_rehab: "Rehab / Step-down",
  lama: "LAMA",
  absconded: "Absconded",
  expired: "Expired",
};

const DISPOSITION_STYLE: Record<DischargeDisposition, string> = {
  home: "bg-emerald-100 text-emerald-700",
  home_with_care: "bg-teal-100 text-teal-700",
  transfer_hospital: "bg-sky-100 text-sky-700",
  transfer_rehab: "bg-indigo-100 text-indigo-700",
  lama: "bg-amber-100 text-amber-700",
  absconded: "bg-orange-100 text-orange-700",
  expired: "bg-slate-900 text-white",
};

const STATUS_STYLE: Record<DischargeStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  finalized: "bg-emerald-100 text-emerald-700",
  amended: "bg-violet-100 text-violet-700",
};

const EMPTY_DRAFT = {
  patientId: "",
  admissionId: "",
  admittingDoctor: "",
  dischargingDoctor: "",
  admissionDate: "",
  dischargeDate: new Date().toISOString().slice(0, 10),
  primaryDiagnosis: "",
  secondaryDiagnoses: "",
  chiefComplaint: "",
  historySummary: "",
  examinationFindings: "",
  investigationsSummary: "",
  proceduresPerformed: "",
  hospitalCourse: "",
  complications: "",
  conditionAtDischarge: "",
  disposition: "home" as DischargeDisposition,
  medications: [] as DischargeMed[],
  dietAdvice: "",
  activityAdvice: "",
  followUpPlan: "",
  followUpDate: "",
  warningSignsAdvised: "",
  notes: "",
};

export default function DischargePage() {
  const [list, setList] = useState<DischargeSummary[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [fPatient, setFPatient] = useState("");
  const [fStatus, setFStatus] = useState<DischargeStatus | "">("");
  const [fDispo, setFDispo] = useState<DischargeDisposition | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DischargeSummary | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [amending, setAmending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fPatient) params.set("patientId", fPatient);
      if (fStatus) params.set("status", fStatus);
      if (fDispo) params.set("disposition", fDispo);
      const [sr, pr] = await Promise.all([
        fetch(`/api/hospital/discharge?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/patients", { cache: "no-store" }),
      ]);
      if (sr.ok) {
        const d = await sr.json();
        setList(d.summaries || []);
      }
      if (pr.ok) {
        const d = await pr.json();
        setPatients(d.patients || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fPatient, fStatus, fDispo]);

  const patientMap = useMemo(() => {
    const m: Record<string, Patient> = {};
    for (const p of patients) m[p.id] = p;
    return m;
  }, [patients]);

  function openNew() {
    setEditing(null);
    setAmending(false);
    setDraft({ ...EMPTY_DRAFT });
    setShowForm(true);
  }

  function openEdit(s: DischargeSummary) {
    setEditing(s);
    setAmending(false);
    setDraft({
      patientId: s.patientId,
      admissionId: s.admissionId || "",
      admittingDoctor: s.admittingDoctor || "",
      dischargingDoctor: s.dischargingDoctor || "",
      admissionDate: s.admissionDate ? s.admissionDate.slice(0, 10) : "",
      dischargeDate: s.dischargeDate ? s.dischargeDate.slice(0, 10) : "",
      primaryDiagnosis: s.primaryDiagnosis || "",
      secondaryDiagnoses: s.secondaryDiagnoses || "",
      chiefComplaint: s.chiefComplaint || "",
      historySummary: s.historySummary || "",
      examinationFindings: s.examinationFindings || "",
      investigationsSummary: s.investigationsSummary || "",
      proceduresPerformed: s.proceduresPerformed || "",
      hospitalCourse: s.hospitalCourse || "",
      complications: s.complications || "",
      conditionAtDischarge: s.conditionAtDischarge || "",
      disposition: s.disposition,
      medications: s.medications.map((m) => ({ ...m })),
      dietAdvice: s.dietAdvice || "",
      activityAdvice: s.activityAdvice || "",
      followUpPlan: s.followUpPlan || "",
      followUpDate: s.followUpDate ? s.followUpDate.slice(0, 10) : "",
      warningSignsAdvised: s.warningSignsAdvised || "",
      notes: s.notes || "",
    });
    setShowForm(true);
  }

  function openAmend(s: DischargeSummary) {
    openEdit(s);
    setAmending(true);
  }

  function addMed() {
    setDraft({
      ...draft,
      medications: [...draft.medications, { drug: "" }],
    });
  }
  function setMed(i: number, patch: Partial<DischargeMed>) {
    const meds = [...draft.medications];
    meds[i] = { ...meds[i], ...patch };
    setDraft({ ...draft, medications: meds });
  }
  function removeMed(i: number) {
    const meds = [...draft.medications];
    meds.splice(i, 1);
    setDraft({ ...draft, medications: meds });
  }

  async function submit() {
    if (!draft.patientId) return;
    if (amending && editing) {
      const reason = prompt("Amendment reason (required):");
      if (!reason || !reason.trim()) return;
      const res = await fetch("/api/hospital/discharge", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          action: "amend",
          amendmentReason: reason.trim(),
          ...draft,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setAmending(false);
        setEditing(null);
        load();
      }
    } else if (editing) {
      const res = await fetch("/api/hospital/discharge", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...draft }),
      });
      if (res.ok) {
        setShowForm(false);
        setEditing(null);
        load();
      }
    } else {
      const res = await fetch("/api/hospital/discharge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setShowForm(false);
        load();
      }
    }
  }

  async function finalize(id: string) {
    const res = await fetch("/api/hospital/discharge", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status: "finalized" }),
    });
    if (res.ok) load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this discharge summary?")) return;
    const res = await fetch("/api/hospital/discharge", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  const stats = useMemo(() => {
    const total = list.length;
    const draftN = list.filter((s) => s.status === "draft").length;
    const finalizedN = list.filter((s) => s.status === "finalized").length;
    const expiredN = list.filter((s) => s.disposition === "expired").length;
    return { total, draftN, finalizedN, expiredN };
  }, [list]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Discharge Summaries</h1>
          <p className="text-sm text-slate-500">
            Medico-legal closure for inpatient episodes — diagnoses, hospital course, meds, and follow-up plan.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700"
        >
          + New Summary
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Total" value={stats.total} tone="slate" />
        <Stat label="Draft" value={stats.draftN} tone="amber" />
        <Stat label="Finalized" value={stats.finalizedN} tone="emerald" />
        <Stat label="Expired (mortality)" value={stats.expiredN} tone="rose" />
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
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value as DischargeStatus | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="amended">Amended</option>
        </select>
        <select
          value={fDispo}
          onChange={(e) => setFDispo(e.target.value as DischargeDisposition | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All dispositions</option>
          {(Object.keys(DISPOSITION_LABEL) as DischargeDisposition[]).map((d) => (
            <option key={d} value={d}>
              {DISPOSITION_LABEL[d]}
            </option>
          ))}
        </select>
        {(fPatient || fStatus || fDispo) && (
          <button
            onClick={() => {
              setFPatient("");
              setFStatus("");
              setFDispo("");
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {amending
                ? `Amend ${editing?.summaryNumber}`
                : editing
                ? `Edit ${editing.summaryNumber}`
                : "New Discharge Summary"}
            </h2>
            {editing?.status === "finalized" && !amending && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                Finalized — clinical fields are locked. Use Amend to revise.
              </span>
            )}
          </div>

          <Section title="Episode">
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
              <Field label="Admission ID">
                <input
                  value={draft.admissionId}
                  onChange={(e) => setDraft({ ...draft, admissionId: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Disposition">
                <select
                  value={draft.disposition}
                  onChange={(e) =>
                    setDraft({ ...draft, disposition: e.target.value as DischargeDisposition })
                  }
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {(Object.keys(DISPOSITION_LABEL) as DischargeDisposition[]).map((d) => (
                    <option key={d} value={d}>
                      {DISPOSITION_LABEL[d]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Admission date">
                <input
                  type="date"
                  value={draft.admissionDate}
                  onChange={(e) => setDraft({ ...draft, admissionDate: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Discharge date">
                <input
                  type="date"
                  value={draft.dischargeDate}
                  onChange={(e) => setDraft({ ...draft, dischargeDate: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Discharging doctor">
                <input
                  value={draft.dischargingDoctor}
                  onChange={(e) => setDraft({ ...draft, dischargingDoctor: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
            </div>
          </Section>

          <Section title="Clinical">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Primary diagnosis *">
                <input
                  value={draft.primaryDiagnosis}
                  onChange={(e) => setDraft({ ...draft, primaryDiagnosis: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Secondary diagnoses (one per line)">
                <textarea
                  rows={2}
                  value={draft.secondaryDiagnoses}
                  onChange={(e) => setDraft({ ...draft, secondaryDiagnoses: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Chief complaint">
                <textarea
                  rows={2}
                  value={draft.chiefComplaint}
                  onChange={(e) => setDraft({ ...draft, chiefComplaint: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="History">
                <textarea
                  rows={2}
                  value={draft.historySummary}
                  onChange={(e) => setDraft({ ...draft, historySummary: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Examination findings">
                <textarea
                  rows={2}
                  value={draft.examinationFindings}
                  onChange={(e) => setDraft({ ...draft, examinationFindings: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Investigations summary">
                <textarea
                  rows={2}
                  value={draft.investigationsSummary}
                  onChange={(e) => setDraft({ ...draft, investigationsSummary: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Procedures performed (one per line)">
                <textarea
                  rows={2}
                  value={draft.proceduresPerformed}
                  onChange={(e) => setDraft({ ...draft, proceduresPerformed: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Complications">
                <textarea
                  rows={2}
                  value={draft.complications}
                  onChange={(e) => setDraft({ ...draft, complications: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Hospital course (narrative)" span2>
                <textarea
                  rows={4}
                  value={draft.hospitalCourse}
                  onChange={(e) => setDraft({ ...draft, hospitalCourse: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Condition at discharge" span2>
                <input
                  value={draft.conditionAtDischarge}
                  onChange={(e) => setDraft({ ...draft, conditionAtDischarge: e.target.value })}
                  placeholder="e.g. Stable, afebrile, tolerating oral diet"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
            </div>
          </Section>

          <Section title="Discharge Medications">
            <div className="space-y-2">
              {draft.medications.map((m, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-6">
                  <input
                    placeholder="Drug"
                    value={m.drug}
                    onChange={(e) => setMed(i, { drug: e.target.value })}
                    className="rounded-md border border-slate-200 px-2 py-1.5 text-sm md:col-span-2"
                  />
                  <input
                    placeholder="Strength"
                    value={m.strength || ""}
                    onChange={(e) => setMed(i, { strength: e.target.value })}
                    className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Dose"
                    value={m.dose || ""}
                    onChange={(e) => setMed(i, { dose: e.target.value })}
                    className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Frequency"
                    value={m.frequency || ""}
                    onChange={(e) => setMed(i, { frequency: e.target.value })}
                    className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder="Days"
                      value={m.durationDays ?? ""}
                      onChange={(e) =>
                        setMed(i, {
                          durationDays: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => removeMed(i)}
                      className="rounded-md border border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={addMed}
                className="rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                + Add medication
              </button>
            </div>
          </Section>

          <Section title="Advice & Follow-up">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Diet advice">
                <textarea
                  rows={2}
                  value={draft.dietAdvice}
                  onChange={(e) => setDraft({ ...draft, dietAdvice: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Activity advice">
                <textarea
                  rows={2}
                  value={draft.activityAdvice}
                  onChange={(e) => setDraft({ ...draft, activityAdvice: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Follow-up plan">
                <textarea
                  rows={2}
                  value={draft.followUpPlan}
                  onChange={(e) => setDraft({ ...draft, followUpPlan: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Follow-up date">
                <input
                  type="date"
                  value={draft.followUpDate}
                  onChange={(e) => setDraft({ ...draft, followUpDate: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </Field>
              <Field label="Warning signs advised" span2>
                <textarea
                  rows={2}
                  value={draft.warningSignsAdvised}
                  onChange={(e) => setDraft({ ...draft, warningSignsAdvised: e.target.value })}
                  placeholder="When to come back immediately"
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
                setEditing(null);
                setAmending(false);
              }}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              {amending ? "Save Amendment" : editing ? "Save" : "Create"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left">Summary #</th>
              <th className="px-4 py-2.5 text-left">Patient</th>
              <th className="px-4 py-2.5 text-left">Diagnosis</th>
              <th className="px-4 py-2.5 text-left">Disposition</th>
              <th className="px-4 py-2.5 text-left">LOS</th>
              <th className="px-4 py-2.5 text-left">Discharge</th>
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
                  No discharge summaries yet.
                </td>
              </tr>
            ) : (
              list.map((s) => {
                const pt = patientMap[s.patientId];
                const isOpen = expanded === s.id;
                return (
                  <Fragment key={s.id}>
                    <tr className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        <button
                          onClick={() => setExpanded(isOpen ? null : s.id)}
                          className="hover:text-primary-600"
                        >
                          {s.summaryNumber}
                        </button>
                        {s.supersededById && (
                          <div className="mt-0.5 text-[10px] text-violet-600">superseded</div>
                        )}
                        {s.supersedesId && (
                          <div className="mt-0.5 text-[10px] text-violet-600">amendment</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {pt ? `${pt.firstName} ${pt.lastName}` : (
                          <span className="text-slate-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {s.primaryDiagnosis || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DISPOSITION_STYLE[s.disposition]}`}
                        >
                          {DISPOSITION_LABEL[s.disposition]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.lengthOfStayDays !== undefined ? `${s.lengthOfStayDays}d` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(s.dischargeDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[s.status]}`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {s.status === "draft" && (
                            <button
                              onClick={() => finalize(s.id)}
                              className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                            >
                              Finalize
                            </button>
                          )}
                          {s.status === "finalized" && (
                            <button
                              onClick={() => openAmend(s)}
                              className="rounded-md bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-200"
                            >
                              Amend
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(s)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            {s.status === "draft" ? "Edit" : "View"}
                          </button>
                          <button
                            onClick={() => remove(s.id)}
                            className="rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-slate-100 bg-slate-50/60">
                        <td colSpan={8} className="px-6 py-4 text-xs text-slate-700">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <DetailRow label="Chief complaint" value={s.chiefComplaint} />
                            <DetailRow label="Condition at discharge" value={s.conditionAtDischarge} />
                            <DetailRow label="Hospital course" value={s.hospitalCourse} />
                            <DetailRow label="Complications" value={s.complications} />
                            <DetailRow label="Procedures" value={s.proceduresPerformed} />
                            <DetailRow label="Investigations" value={s.investigationsSummary} />
                            <DetailRow label="Follow-up" value={s.followUpPlan} />
                            <DetailRow
                              label="Follow-up date"
                              value={
                                s.followUpDate
                                  ? new Date(s.followUpDate).toLocaleDateString()
                                  : undefined
                              }
                            />
                            <DetailRow label="Warning signs" value={s.warningSignsAdvised} />
                            <DetailRow label="Diet" value={s.dietAdvice} />
                            <DetailRow label="Activity" value={s.activityAdvice} />
                            {s.amendmentReason && (
                              <DetailRow label="Amendment reason" value={s.amendmentReason} />
                            )}
                          </div>
                          {s.medications.length > 0 && (
                            <div className="mt-4">
                              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Discharge Medications
                              </div>
                              <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                      <th className="px-3 py-1.5 text-left">Drug</th>
                                      <th className="px-3 py-1.5 text-left">Strength</th>
                                      <th className="px-3 py-1.5 text-left">Dose</th>
                                      <th className="px-3 py-1.5 text-left">Frequency</th>
                                      <th className="px-3 py-1.5 text-left">Days</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {s.medications.map((m, i) => (
                                      <tr key={i} className="border-t border-slate-100">
                                        <td className="px-3 py-1.5">{m.drug}</td>
                                        <td className="px-3 py-1.5">{m.strength || "—"}</td>
                                        <td className="px-3 py-1.5">{m.dose || "—"}</td>
                                        <td className="px-3 py-1.5">{m.frequency || "—"}</td>
                                        <td className="px-3 py-1.5">{m.durationDays ?? "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
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
  span2,
}: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "md:col-span-2" : ""}>
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
