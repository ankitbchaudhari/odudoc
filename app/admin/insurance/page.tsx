"use client";

import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

type CoverageType = "cashless" | "reimbursement" | "both";
type PolicyStatus = "active" | "expired" | "cancelled";
type ClaimStatus =
  | "draft"
  | "submitted"
  | "queried"
  | "approved"
  | "partial"
  | "rejected"
  | "paid";

interface Policy {
  id: string;
  patientId: string;
  insurerName: string;
  planName?: string;
  policyNumber: string;
  policyHolderName?: string;
  validFrom?: string;
  validTo?: string;
  sumInsured?: number;
  copayPct?: number;
  coverage: CoverageType;
  status: PolicyStatus;
}

interface ClaimDoc {
  name: string;
  url?: string;
  uploadedAt: string;
}

interface Claim {
  id: string;
  claimNumber: string;
  patientId: string;
  policyId?: string;
  invoiceId?: string;
  insurerName: string;
  tpaName?: string;
  preauthNumber?: string;
  diagnosis?: string;
  treatmentSummary?: string;
  claimedAmount: number;
  approvedAmount?: number;
  settledAmount?: number;
  rejectionReason?: string;
  queryMessage?: string;
  submittedAt?: string;
  approvedAt?: string;
  settledAt?: string;
  documents: ClaimDoc[];
  status: ClaimStatus;
  createdAt: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

const CLAIM_COLOR: Record<ClaimStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  queried: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  partial: "bg-sky-100 text-sky-700 border-sky-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
  paid: "bg-violet-100 text-violet-700 border-violet-200",
};

const POLICY_COLOR: Record<PolicyStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  expired: "bg-slate-200 text-slate-700 border-slate-300",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

function fmtMoney(n?: number): string {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function InsurancePage() {
  const [tab, setTab] = useState<"claims" | "policies">("claims");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [polRes, clmRes, pRes] = await Promise.all([
        fetch("/api/hospital/insurance-policies"),
        fetch("/api/hospital/insurance-claims"),
        fetch("/api/patients"),
      ]);
      const pol = await polRes.json();
      const clm = await clmRes.json();
      const p = await pRes.json();
      setPolicies(pol.policies || []);
      setClaims(clm.claims || []);
      setPatients(p.patients || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const patientLabel = (id: string) => {
    const p = patients.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}${p.mrn ? ` (${p.mrn})` : ""}` : id;
  };

  const stats = useMemo(() => {
    return {
      policies: policies.length,
      claims: claims.length,
      inFlight: claims.filter(
        (c) =>
          c.status === "submitted" ||
          c.status === "queried" ||
          c.status === "approved" ||
          c.status === "partial"
      ).length,
      claimed: claims.reduce((s, c) => s + (c.claimedAmount || 0), 0),
      settled: claims.reduce((s, c) => s + (c.settledAmount || 0), 0),
    };
  }, [policies, claims]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Insurance / TPA</h1>
        <p className="text-sm text-slate-500">
          Patient policies, pre-authorizations, and claim settlement tracking.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Policies" value={stats.policies} />
        <StatCard label="Claims" value={stats.claims} />
        <StatCard label="In-flight" value={stats.inFlight} accent="blue" />
        <StatCard label="Claimed" value={fmtMoney(stats.claimed)} accent="amber" />
        <StatCard label="Settled" value={fmtMoney(stats.settled)} accent="emerald" />
      </div>

      <div className="flex border-b border-slate-200">
        {[
          ["claims", "Claims"],
          ["policies", "Policies"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === k
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
      ) : tab === "claims" ? (
        <ClaimsTab
          claims={claims}
          policies={policies}
          patients={patients}
          patientLabel={patientLabel}
          reload={loadAll}
        />
      ) : (
        <PoliciesTab
          policies={policies}
          patients={patients}
          patientLabel={patientLabel}
          reload={loadAll}
        />
      )}

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          color: rgb(15 23 42);
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgb(71 85 105);
          box-shadow: 0 0 0 2px rgb(148 163 184 / 0.2);
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────── Claims tab ────────────────────────────────────

function ClaimsTab({
  claims,
  policies,
  patients,
  patientLabel,
  reload,
}: {
  claims: Claim[];
  policies: Policy[];
  patients: Patient[];
  patientLabel: (id: string) => string;
  reload: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ClaimStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    patientId: "",
    policyId: "",
    insurerName: "",
    tpaName: "",
    preauthNumber: "",
    diagnosis: "",
    treatmentSummary: "",
    claimedAmount: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      patientId: "",
      policyId: "",
      insurerName: "",
      tpaName: "",
      preauthNumber: "",
      diagnosis: "",
      treatmentSummary: "",
      claimedAmount: "",
      notes: "",
    });
    setEditingId(null);
  };

  const filtered = claims.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  function autoFillFromPolicy(policyId: string) {
    const p = policies.find((x) => x.id === policyId);
    if (!p) return;
    setForm((f) => ({
      ...f,
      patientId: p.patientId,
      insurerName: p.insurerName,
    }));
  }

  async function submit() {
    const payload: any = {
      patientId: form.patientId,
      policyId: form.policyId || undefined,
      insurerName: form.insurerName,
      tpaName: form.tpaName || undefined,
      preauthNumber: form.preauthNumber || undefined,
      diagnosis: form.diagnosis || undefined,
      treatmentSummary: form.treatmentSummary || undefined,
      claimedAmount: Number(form.claimedAmount) || 0,
      notes: form.notes || undefined,
    };
    if (editingId) payload.id = editingId;
    const res = await fetch("/api/hospital/insurance-claims", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      resetForm();
      setShowForm(false);
      reload();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed");
    }
  }

  async function patch(id: string, body: any) {
    const res = await fetch("/api/hospital/insurance-claims", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (res.ok) reload();
  }

  async function del(id: string) {
    if (!confirm("Delete claim?")) return;
    await fetch("/api/hospital/insurance-claims", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    reload();
  }

  function startEdit(c: Claim) {
    setEditingId(c.id);
    setShowForm(true);
    setForm({
      patientId: c.patientId,
      policyId: c.policyId || "",
      insurerName: c.insurerName,
      tpaName: c.tpaName || "",
      preauthNumber: c.preauthNumber || "",
      diagnosis: c.diagnosis || "",
      treatmentSummary: c.treatmentSummary || "",
      claimedAmount: c.claimedAmount.toString(),
      notes: "",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showForm ? "Close" : "+ New Claim"}
        </button>
        <select
          className="input max-w-[180px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="queried">Queried</option>
          <option value="approved">Approved</option>
          <option value="partial">Partial</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient *">
              <select
                className="input"
                value={form.patientId}
                onChange={(e) =>
                  setForm({ ...form, patientId: e.target.value })
                }
              >
                <option value="">— select —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.mrn ? `(${p.mrn})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Policy">
              <select
                className="input"
                value={form.policyId}
                onChange={(e) => {
                  setForm({ ...form, policyId: e.target.value });
                  autoFillFromPolicy(e.target.value);
                }}
              >
                <option value="">— none / direct claim —</option>
                {policies
                  .filter((p) => !form.patientId || p.patientId === form.patientId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.insurerName} · {p.policyNumber}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Insurer *">
              <input
                className="input"
                value={form.insurerName}
                onChange={(e) =>
                  setForm({ ...form, insurerName: e.target.value })
                }
                placeholder="Star Health, HDFC Ergo..."
              />
            </Field>
            <Field label="TPA">
              <input
                className="input"
                value={form.tpaName}
                onChange={(e) => setForm({ ...form, tpaName: e.target.value })}
                placeholder="MediAssist, Paramount..."
              />
            </Field>
            <Field label="Pre-auth number">
              <input
                className="input"
                value={form.preauthNumber}
                onChange={(e) =>
                  setForm({ ...form, preauthNumber: e.target.value })
                }
              />
            </Field>
            <Field label="Claimed amount (₹) *">
              <input
                type="number"
                min={0}
                className="input"
                value={form.claimedAmount}
                onChange={(e) =>
                  setForm({ ...form, claimedAmount: e.target.value })
                }
              />
            </Field>
            <Field label="Diagnosis" className="md:col-span-3">
              <input
                className="input"
                value={form.diagnosis}
                onChange={(e) =>
                  setForm({ ...form, diagnosis: e.target.value })
                }
                placeholder="e.g. Acute appendicitis"
              />
            </Field>
            <Field label="Treatment summary" className="md:col-span-3">
              <textarea
                className="input min-h-[70px]"
                value={form.treatmentSummary}
                onChange={(e) =>
                  setForm({ ...form, treatmentSummary: e.target.value })
                }
              />
            </Field>
          </div>
          <button
            onClick={submit}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {editingId ? "Save changes" : "Create claim"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No claims match.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((c) => {
              const open = expandedId === c.id;
              return (
                <li key={c.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">
                          {c.claimNumber}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {patientLabel(c.patientId)}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${CLAIM_COLOR[c.status]}`}
                        >
                          {c.status}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                          {c.insurerName}
                          {c.tpaName ? ` · ${c.tpaName}` : ""}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Claimed {fmtMoney(c.claimedAmount)}
                        {c.approvedAmount != null
                          ? ` · Approved ${fmtMoney(c.approvedAmount)}`
                          : ""}
                        {c.settledAmount != null
                          ? ` · Settled ${fmtMoney(c.settledAmount)}`
                          : ""}
                        {c.preauthNumber ? ` · Pre-auth ${c.preauthNumber}` : ""}
                      </div>
                      {c.diagnosis && (
                        <div className="mt-0.5 text-xs text-slate-500">
                          Dx: {c.diagnosis}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="input max-w-[150px] text-xs"
                        value={c.status}
                        onChange={(e) =>
                          patch(c.id, { status: e.target.value })
                        }
                      >
                        <option value="draft">draft</option>
                        <option value="submitted">submitted</option>
                        <option value="queried">queried</option>
                        <option value="approved">approved</option>
                        <option value="partial">partial</option>
                        <option value="rejected">rejected</option>
                        <option value="paid">paid</option>
                      </select>
                      <button
                        onClick={() => setExpandedId(open ? null : c.id)}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        {open ? "Collapse" : "Details"}
                      </button>
                      <button
                        onClick={() => startEdit(c)}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => del(c.id)}
                        className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Del
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Field label="Approved amount (₹)">
                          <input
                            type="number"
                            className="input"
                            defaultValue={c.approvedAmount || ""}
                            onBlur={(e) =>
                              patch(c.id, {
                                approvedAmount: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </Field>
                        <Field label="Settled amount (₹)">
                          <input
                            type="number"
                            className="input"
                            defaultValue={c.settledAmount || ""}
                            onBlur={(e) =>
                              patch(c.id, {
                                settledAmount: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </Field>
                        <Field label="Rejection reason">
                          <input
                            className="input"
                            defaultValue={c.rejectionReason || ""}
                            onBlur={(e) =>
                              patch(c.id, { rejectionReason: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="Query message" className="md:col-span-3">
                          <textarea
                            className="input"
                            defaultValue={c.queryMessage || ""}
                            onBlur={(e) =>
                              patch(c.id, { queryMessage: e.target.value })
                            }
                          />
                        </Field>
                      </div>
                      <div>
                        <div className="mb-2 text-xs font-semibold text-slate-600">
                          Documents
                        </div>
                        {c.documents.length === 0 ? (
                          <div className="text-xs text-slate-400">
                            No documents attached.
                          </div>
                        ) : (
                          <ul className="mb-2 space-y-1">
                            {c.documents.map((d) => (
                              <li
                                key={d.name}
                                className="flex items-center gap-2 text-xs"
                              >
                                {d.url ? (
                                  <a
                                    href={d.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 underline"
                                  >
                                    {d.name}
                                  </a>
                                ) : (
                                  <span>{d.name}</span>
                                )}
                                <span className="text-slate-400">
                                  · {d.uploadedAt.slice(0, 10)}
                                </span>
                                <button
                                  onClick={() =>
                                    patch(c.id, { removeDocumentName: d.name })
                                  }
                                  className="text-red-600 hover:underline"
                                >
                                  remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <AddDocInline
                          onAdd={(name, url) =>
                            patch(c.id, { addDocument: { name, url } })
                          }
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function AddDocInline({
  onAdd,
}: {
  onAdd: (name: string, url: string) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  return (
    <div className="flex flex-wrap gap-2">
      <input
        className="input max-w-[200px] text-xs"
        placeholder="Doc name (Discharge summary...)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="input max-w-[280px] text-xs"
        placeholder="URL (optional)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        onClick={() => {
          if (!name.trim()) return;
          onAdd(name.trim(), url.trim());
          setName("");
          setUrl("");
        }}
        className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
      >
        + Add
      </button>
    </div>
  );
}

// ──────────────────────────── Policies tab ─────────────────────────────────

function PoliciesTab({
  policies,
  patients,
  patientLabel,
  reload,
}: {
  policies: Policy[];
  patients: Patient[];
  patientLabel: (id: string) => string;
  reload: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    patientId: "",
    insurerName: "",
    planName: "",
    policyNumber: "",
    policyHolderName: "",
    relationToPatient: "self",
    validFrom: "",
    validTo: "",
    sumInsured: "",
    copayPct: "",
    coverage: "cashless" as CoverageType,
    status: "active" as PolicyStatus,
  });

  const resetForm = () => {
    setForm({
      patientId: "",
      insurerName: "",
      planName: "",
      policyNumber: "",
      policyHolderName: "",
      relationToPatient: "self",
      validFrom: "",
      validTo: "",
      sumInsured: "",
      copayPct: "",
      coverage: "cashless",
      status: "active",
    });
    setEditingId(null);
  };

  async function submit() {
    const payload: any = {
      patientId: form.patientId,
      insurerName: form.insurerName,
      planName: form.planName || undefined,
      policyNumber: form.policyNumber,
      policyHolderName: form.policyHolderName || undefined,
      relationToPatient: form.relationToPatient || undefined,
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
      sumInsured: form.sumInsured ? Number(form.sumInsured) : undefined,
      copayPct: form.copayPct ? Number(form.copayPct) : undefined,
      coverage: form.coverage,
      status: form.status,
    };
    if (editingId) payload.id = editingId;
    const res = await fetch("/api/hospital/insurance-policies", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      resetForm();
      setShowForm(false);
      reload();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed");
    }
  }

  function startEdit(p: Policy) {
    setEditingId(p.id);
    setShowForm(true);
    setForm({
      patientId: p.patientId,
      insurerName: p.insurerName,
      planName: p.planName || "",
      policyNumber: p.policyNumber,
      policyHolderName: p.policyHolderName || "",
      relationToPatient: "self",
      validFrom: p.validFrom || "",
      validTo: p.validTo || "",
      sumInsured: p.sumInsured?.toString() || "",
      copayPct: p.copayPct?.toString() || "",
      coverage: p.coverage,
      status: p.status,
    });
  }

  async function del(id: string) {
    if (!confirm("Delete policy?")) return;
    await fetch("/api/hospital/insurance-policies", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    reload();
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          resetForm();
          setShowForm(!showForm);
        }}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        {showForm ? "Close" : "+ Register Policy"}
      </button>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient *">
              <select
                className="input"
                value={form.patientId}
                onChange={(e) =>
                  setForm({ ...form, patientId: e.target.value })
                }
              >
                <option value="">— select —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.mrn ? `(${p.mrn})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Insurer *">
              <input
                className="input"
                value={form.insurerName}
                onChange={(e) =>
                  setForm({ ...form, insurerName: e.target.value })
                }
              />
            </Field>
            <Field label="Plan name">
              <input
                className="input"
                value={form.planName}
                onChange={(e) =>
                  setForm({ ...form, planName: e.target.value })
                }
              />
            </Field>
            <Field label="Policy number *">
              <input
                className="input"
                value={form.policyNumber}
                onChange={(e) =>
                  setForm({ ...form, policyNumber: e.target.value })
                }
              />
            </Field>
            <Field label="Policyholder">
              <input
                className="input"
                value={form.policyHolderName}
                onChange={(e) =>
                  setForm({ ...form, policyHolderName: e.target.value })
                }
              />
            </Field>
            <Field label="Relation">
              <select
                className="input"
                value={form.relationToPatient}
                onChange={(e) =>
                  setForm({ ...form, relationToPatient: e.target.value })
                }
              >
                <option value="self">Self</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="employer">Employer-provided</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Valid from">
              <input
                type="date"
                className="input"
                value={form.validFrom}
                onChange={(e) =>
                  setForm({ ...form, validFrom: e.target.value })
                }
              />
            </Field>
            <Field label="Valid to">
              <input
                type="date"
                className="input"
                value={form.validTo}
                onChange={(e) =>
                  setForm({ ...form, validTo: e.target.value })
                }
              />
            </Field>
            <Field label="Sum insured (₹)">
              <input
                type="number"
                className="input"
                value={form.sumInsured}
                onChange={(e) =>
                  setForm({ ...form, sumInsured: e.target.value })
                }
              />
            </Field>
            <Field label="Copay %">
              <input
                type="number"
                min={0}
                max={100}
                className="input"
                value={form.copayPct}
                onChange={(e) =>
                  setForm({ ...form, copayPct: e.target.value })
                }
              />
            </Field>
            <Field label="Coverage">
              <select
                className="input"
                value={form.coverage}
                onChange={(e) =>
                  setForm({
                    ...form,
                    coverage: e.target.value as CoverageType,
                  })
                }
              >
                <option value="cashless">Cashless</option>
                <option value="reimbursement">Reimbursement</option>
                <option value="both">Both</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                className="input"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as PolicyStatus,
                  })
                }
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          </div>
          <button
            onClick={submit}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {editingId ? "Save changes" : "Register policy"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {policies.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No policies registered yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="px-3 py-2 text-left">Patient</th>
                <th className="px-3 py-2 text-left">Insurer / Plan</th>
                <th className="px-3 py-2 text-left">Policy #</th>
                <th className="px-3 py-2 text-right">Sum insured</th>
                <th className="px-3 py-2 text-left">Valid</th>
                <th className="px-3 py-2 text-left">Coverage</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {patientLabel(p.patientId)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    <div className="font-semibold text-slate-800">
                      {p.insurerName}
                    </div>
                    {p.planName && (
                      <div className="text-[11px] text-slate-500">
                        {p.planName}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">
                    {p.policyNumber}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-slate-700">
                    {fmtMoney(p.sumInsured)}
                    {p.copayPct != null && (
                      <div className="text-[10px] text-slate-400">
                        {p.copayPct}% copay
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {p.validFrom || "—"}
                    <span className="text-slate-400"> → </span>
                    {p.validTo || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs capitalize text-slate-600">
                    {p.coverage}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${POLICY_COLOR[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => startEdit(p)}
                      className="mr-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => del(p.id)}
                      className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── widgets ───────────────────────────────────────

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "blue" | "amber" | "emerald";
}) {
  const color =
    accent === "blue"
      ? "text-blue-700"
      : accent === "amber"
      ? "text-amber-700"
      : accent === "emerald"
      ? "text-emerald-700"
      : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
