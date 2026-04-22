"use client";

import { useEffect, useMemo, useState } from "react";

type ConsentType =
  | "general_admission"
  | "surgery"
  | "anesthesia"
  | "blood_transfusion"
  | "research"
  | "photo_video"
  | "hiv_testing"
  | "dnr"
  | "dama"
  | "other";

type ConsentStatus = "draft" | "signed" | "revoked" | "expired";

type EntityType = "encounter" | "admission" | "surgery" | "transfusion" | "general";

interface ConsentForm {
  id: string;
  formNumber: string;
  patientId: string;
  entityType: EntityType;
  entityId?: string;
  type: ConsentType;
  title: string;
  procedureName?: string;
  risks?: string;
  alternatives?: string;
  explainedBy?: string;
  languageUsed?: string;
  translatorName?: string;
  patientSignatureName: string;
  patientSignedAt?: string;
  guardianSignatureName?: string;
  guardianRelation?: string;
  witnessName?: string;
  witnessSignedAt?: string;
  digitalSignatureRef?: string;
  documentUrl?: string;
  validUntil?: string;
  revokedAt?: string;
  revocationReason?: string;
  status: ConsentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

const TYPE_LABEL: Record<ConsentType, string> = {
  general_admission: "General Admission",
  surgery: "Surgical",
  anesthesia: "Anesthesia",
  blood_transfusion: "Blood Transfusion",
  research: "Research",
  photo_video: "Photo / Video",
  hiv_testing: "HIV Testing",
  dnr: "DNR",
  dama: "DAMA",
  other: "Other",
};

const TYPES: ConsentType[] = [
  "general_admission",
  "surgery",
  "anesthesia",
  "blood_transfusion",
  "research",
  "photo_video",
  "hiv_testing",
  "dnr",
  "dama",
  "other",
];

const STATUS_STYLE: Record<ConsentStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  signed: "bg-emerald-100 text-emerald-700",
  revoked: "bg-rose-100 text-rose-700",
  expired: "bg-amber-100 text-amber-700",
};

export default function ConsentFormsPage() {
  const [forms, setForms] = useState<ConsentForm[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ConsentType | "">("");
  const [filterStatus, setFilterStatus] = useState<ConsentStatus | "">("");
  const [filterPatient, setFilterPatient] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ConsentForm | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const [draft, setDraft] = useState({
    patientId: "",
    entityType: "general" as EntityType,
    entityId: "",
    type: "general_admission" as ConsentType,
    title: "",
    procedureName: "",
    risks: "",
    alternatives: "",
    explainedBy: "",
    languageUsed: "English",
    translatorName: "",
    patientSignatureName: "",
    guardianSignatureName: "",
    guardianRelation: "",
    witnessName: "",
    digitalSignatureRef: "",
    documentUrl: "",
    validUntil: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      if (filterPatient) params.set("patientId", filterPatient);
      const [fr, pr] = await Promise.all([
        fetch(`/api/hospital/consent?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/patients", { cache: "no-store" }),
      ]);
      if (fr.ok) {
        const d = await fr.json();
        setForms(d.forms || []);
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
  }, [filterType, filterStatus, filterPatient]);

  const patientMap = useMemo(() => {
    const m: Record<string, Patient> = {};
    for (const p of patients) m[p.id] = p;
    return m;
  }, [patients]);

  function resetDraft() {
    setDraft({
      patientId: "",
      entityType: "general",
      entityId: "",
      type: "general_admission",
      title: "",
      procedureName: "",
      risks: "",
      alternatives: "",
      explainedBy: "",
      languageUsed: "English",
      translatorName: "",
      patientSignatureName: "",
      guardianSignatureName: "",
      guardianRelation: "",
      witnessName: "",
      digitalSignatureRef: "",
      documentUrl: "",
      validUntil: "",
      notes: "",
    });
    setEditing(null);
  }

  function openNew() {
    resetDraft();
    setShowForm(true);
  }

  function openEdit(f: ConsentForm) {
    setEditing(f);
    setDraft({
      patientId: f.patientId,
      entityType: f.entityType,
      entityId: f.entityId || "",
      type: f.type,
      title: f.title,
      procedureName: f.procedureName || "",
      risks: f.risks || "",
      alternatives: f.alternatives || "",
      explainedBy: f.explainedBy || "",
      languageUsed: f.languageUsed || "English",
      translatorName: f.translatorName || "",
      patientSignatureName: f.patientSignatureName || "",
      guardianSignatureName: f.guardianSignatureName || "",
      guardianRelation: f.guardianRelation || "",
      witnessName: f.witnessName || "",
      digitalSignatureRef: f.digitalSignatureRef || "",
      documentUrl: f.documentUrl || "",
      validUntil: f.validUntil || "",
      notes: f.notes || "",
    });
    setShowForm(true);
  }

  async function submit() {
    if (!draft.patientId || !draft.type) return;
    if (editing) {
      const res = await fetch("/api/hospital/consent", {
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
      const res = await fetch("/api/hospital/consent", {
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

  async function setStatus(id: string, status: ConsentStatus, revocationReason?: string) {
    const res = await fetch("/api/hospital/consent", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, revocationReason }),
    });
    if (res.ok) load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this consent form?")) return;
    const res = await fetch("/api/hospital/consent", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  const stats = useMemo(() => {
    const total = forms.length;
    const signed = forms.filter((f) => f.status === "signed").length;
    const draftN = forms.filter((f) => f.status === "draft").length;
    const revoked = forms.filter((f) => f.status === "revoked").length;
    return { total, signed, draftN, revoked };
  }, [forms]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consent Forms</h1>
          <p className="text-sm text-slate-500">
            Medico-legal consent capture — admission, surgery, anesthesia, transfusion, research, DNR & DAMA.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700"
        >
          + New Consent
        </button>
      </div>

      {/* Stat tiles */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatTile label="Total" value={stats.total} tone="slate" />
        <StatTile label="Signed" value={stats.signed} tone="emerald" />
        <StatTile label="Draft" value={stats.draftN} tone="amber" />
        <StatTile label="Revoked" value={stats.revoked} tone="rose" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={filterPatient}
          onChange={(e) => setFilterPatient(e.target.value)}
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
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ConsentType | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ConsentStatus | "")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="signed">Signed</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>
        {(filterPatient || filterType || filterStatus) && (
          <button
            onClick={() => {
              setFilterPatient("");
              setFilterType("");
              setFilterStatus("");
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editing ? `Edit ${editing.formNumber}` : "New Consent Form"}
            </h2>
            {editing?.status === "signed" && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                Signed — clinical fields are locked
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient *">
              <select
                value={draft.patientId}
                onChange={(e) => setDraft({ ...draft, patientId: e.target.value })}
                disabled={editing?.status === "signed"}
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
            <Field label="Consent Type">
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as ConsentType })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Linked Entity">
              <select
                value={draft.entityType}
                onChange={(e) => setDraft({ ...draft, entityType: e.target.value as EntityType })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="general">General</option>
                <option value="encounter">Encounter</option>
                <option value="admission">Admission</option>
                <option value="surgery">Surgery</option>
                <option value="transfusion">Transfusion</option>
              </select>
            </Field>
            <Field label="Entity ID (optional)">
              <input
                value={draft.entityId}
                onChange={(e) => setDraft({ ...draft, entityId: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Title (override)">
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                disabled={editing?.status === "signed"}
                placeholder={TYPE_LABEL[draft.type]}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Procedure name">
              <input
                value={draft.procedureName}
                onChange={(e) => setDraft({ ...draft, procedureName: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>

            <Field label="Explained by (doctor)">
              <input
                value={draft.explainedBy}
                onChange={(e) => setDraft({ ...draft, explainedBy: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Language">
              <input
                value={draft.languageUsed}
                onChange={(e) => setDraft({ ...draft, languageUsed: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Translator (if any)">
              <input
                value={draft.translatorName}
                onChange={(e) => setDraft({ ...draft, translatorName: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>

            <Field label="Risks explained" span3>
              <textarea
                rows={2}
                value={draft.risks}
                onChange={(e) => setDraft({ ...draft, risks: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Alternatives discussed" span3>
              <textarea
                rows={2}
                value={draft.alternatives}
                onChange={(e) => setDraft({ ...draft, alternatives: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>

            <Field label="Patient signature name">
              <input
                value={draft.patientSignatureName}
                onChange={(e) => setDraft({ ...draft, patientSignatureName: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Guardian name">
              <input
                value={draft.guardianSignatureName}
                onChange={(e) => setDraft({ ...draft, guardianSignatureName: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Guardian relation">
              <input
                value={draft.guardianRelation}
                onChange={(e) => setDraft({ ...draft, guardianRelation: e.target.value })}
                disabled={editing?.status === "signed"}
                placeholder="e.g. spouse, parent"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Witness name">
              <input
                value={draft.witnessName}
                onChange={(e) => setDraft({ ...draft, witnessName: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="E-sign reference">
              <input
                value={draft.digitalSignatureRef}
                onChange={(e) => setDraft({ ...draft, digitalSignatureRef: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Valid until (time-bound)">
              <input
                type="date"
                value={draft.validUntil ? draft.validUntil.slice(0, 10) : ""}
                onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })}
                disabled={editing?.status === "signed"}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </Field>

            <Field label="Document URL (scan)" span3>
              <input
                value={draft.documentUrl}
                onChange={(e) => setDraft({ ...draft, documentUrl: e.target.value })}
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

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left">Form #</th>
              <th className="px-4 py-2.5 text-left">Patient</th>
              <th className="px-4 py-2.5 text-left">Type</th>
              <th className="px-4 py-2.5 text-left">Procedure</th>
              <th className="px-4 py-2.5 text-left">Signed</th>
              <th className="px-4 py-2.5 text-left">Valid until</th>
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
            ) : forms.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No consent forms yet.
                </td>
              </tr>
            ) : (
              forms.map((f) => {
                const pt = patientMap[f.patientId];
                return (
                  <tr key={f.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{f.formNumber}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {pt ? `${pt.firstName} ${pt.lastName}` : <span className="text-slate-400">Unknown</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{TYPE_LABEL[f.type]}</div>
                      <div className="text-xs text-slate-500">{f.title}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{f.procedureName || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {f.patientSignedAt ? new Date(f.patientSignedAt).toLocaleDateString() : "—"}
                      {f.witnessName && f.witnessSignedAt && (
                        <div className="text-[10px] text-slate-400">w/ {f.witnessName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {f.validUntil ? new Date(f.validUntil).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[f.status]}`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {f.status === "draft" && (
                          <button
                            onClick={() => setStatus(f.id, "signed")}
                            className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                          >
                            Sign
                          </button>
                        )}
                        {f.status === "signed" && (
                          <button
                            onClick={() => {
                              setRevokingId(f.id);
                              setRevokeReason("");
                            }}
                            className="rounded-md bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-200"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(f)}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(f.id)}
                          className="rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                      {revokingId === f.id && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={revokeReason}
                            onChange={(e) => setRevokeReason(e.target.value)}
                            placeholder="Reason"
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                          />
                          <button
                            onClick={() => {
                              setStatus(f.id, "revoked", revokeReason);
                              setRevokingId(null);
                            }}
                            className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setRevokingId(null)}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
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

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</div>
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
