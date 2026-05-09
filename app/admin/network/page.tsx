"use client";

// Inter-org Network & Transfers console.
//
// Two stacked panels:
//   1. Connections — partners (connected) + inbound/outbound requests
//      + a directory picker to send a new connection request.
//   2. Transfers — inbound and outbound patient/records transfers
//      against connected partners, plus a "New transfer" form.
//
// All API calls go through /api/inter-org/*. The page works whether
// the operator is signed in as an org admin (sees only their own
// org's network) or as a super-admin impersonating an org.

import { useCallback, useEffect, useMemo, useState } from "react";

interface PartnerOrg {
  id: string;
  name: string;
  slug: string;
  country?: string;
  plan?: string;
}

interface OrgConnection {
  id: string;
  orgAId: string;
  orgBId: string;
  requestedByOrgId: string;
  status: "pending" | "connected" | "declined" | "revoked";
  note?: string;
  createdAt: string;
  acceptedAt?: string;
  partner: PartnerOrg;
  isInbound: boolean;
}

interface InterOrgTransfer {
  id: string;
  fromOrgId: string;
  toOrgId: string;
  patientId: string;
  patientName: string;
  type: "patient_transfer" | "records_share" | "referral";
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
  urgency: "routine" | "urgent" | "emergency";
  reason: string;
  items: Array<{ kind: string; ref?: string; label?: string }>;
  patientConsent: {
    granted: boolean;
    method?: string;
    breakGlassReason?: string;
  };
  requestedByEmail: string;
  requestedAt: string;
  acceptedAt?: string;
  declinedReason?: string;
  completedAt?: string;
  completionNotes?: string;
  direction: "inbound" | "outbound";
  partner: PartnerOrg;
}

const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  connected: "bg-emerald-100 text-emerald-800",
  accepted: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-800",
  revoked: "bg-slate-200 text-slate-700",
  completed: "bg-indigo-100 text-indigo-800",
  cancelled: "bg-slate-200 text-slate-700",
};

const URGENCY_PILL: Record<string, string> = {
  routine: "bg-slate-100 text-slate-700",
  urgent: "bg-amber-100 text-amber-800",
  emergency: "bg-rose-100 text-rose-800 ring-1 ring-rose-300",
};

const TYPE_LABEL: Record<string, string> = {
  patient_transfer: "Patient transfer",
  records_share: "Records share",
  referral: "Referral",
};

const ITEM_KINDS = [
  { id: "demographics", label: "Demographics" },
  { id: "encounter_notes", label: "Encounter notes" },
  { id: "lab_results", label: "Lab results" },
  { id: "pathology", label: "Pathology" },
  { id: "imaging", label: "Imaging / DICOM" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "discharge_summary", label: "Discharge summary" },
  { id: "vitals", label: "Vitals" },
  { id: "allergies", label: "Allergies & problems" },
  { id: "immunizations", label: "Immunizations" },
  { id: "consent_forms", label: "Consent forms" },
];

export default function AdminNetworkPage() {
  const [connections, setConnections] = useState<OrgConnection[]>([]);
  const [directory, setDirectory] = useState<PartnerOrg[]>([]);
  const [transfers, setTransfers] = useState<InterOrgTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Connect form
  const [connectTarget, setConnectTarget] = useState("");
  const [connectNote, setConnectNote] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Transfer form
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [tForm, setTForm] = useState({
    toOrgId: "",
    patientId: "",
    patientName: "",
    type: "patient_transfer" as InterOrgTransfer["type"],
    urgency: "routine" as InterOrgTransfer["urgency"],
    reason: "",
    items: [] as string[],
    consentGranted: true,
    consentMethod: "in_person" as "in_person" | "esign" | "phone_otp" | "break_glass",
    breakGlassReason: "",
  });
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [transferError, setTransferError] = useState("");

  const connectedPartners = useMemo(
    () => connections.filter((c) => c.status === "connected"),
    [connections],
  );
  const inboundRequests = useMemo(
    () => connections.filter((c) => c.status === "pending" && c.isInbound),
    [connections],
  );
  const outboundRequests = useMemo(
    () => connections.filter((c) => c.status === "pending" && !c.isInbound),
    [connections],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [n, x] = await Promise.all([
        fetch("/api/inter-org/network", { cache: "no-store" }),
        fetch("/api/inter-org/transfers", { cache: "no-store" }),
      ]);
      if (n.ok) {
        const data = await n.json();
        setConnections(data.connections || []);
        setDirectory(data.directory || []);
      }
      if (x.ok) {
        const data = await x.json();
        setTransfers(data.transfers || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConnect = async () => {
    if (!connectTarget) return;
    setConnecting(true);
    try {
      const r = await fetch("/api/inter-org/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toOrgId: connectTarget, note: connectNote }),
      });
      if (r.ok) {
        setToast({ kind: "ok", text: "Connection request sent." });
        setConnectTarget("");
        setConnectNote("");
        await load();
      } else {
        const body = await r.json().catch(() => ({}));
        setToast({ kind: "err", text: `Failed: ${body.error || r.statusText}` });
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectionAction = async (id: string, action: "accept" | "decline" | "revoke") => {
    const r = await fetch(`/api/inter-org/network/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: `Connection ${action}ed.` });
      await load();
    } else {
      const body = await r.json().catch(() => ({}));
      setToast({ kind: "err", text: `Failed: ${body.error || r.statusText}` });
    }
  };

  const toggleItem = (kind: string) => {
    setTForm((f) => ({
      ...f,
      items: f.items.includes(kind) ? f.items.filter((x) => x !== kind) : [...f.items, kind],
    }));
  };

  const handleCreateTransfer = async () => {
    setTransferError("");
    if (!tForm.toOrgId) return setTransferError("Select a destination hospital.");
    if (!tForm.patientId.trim()) return setTransferError("Patient ID is required.");
    if (!tForm.patientName.trim()) return setTransferError("Patient name is required.");
    if (!tForm.reason.trim()) return setTransferError("Clinical reason is required.");
    if (tForm.items.length === 0) return setTransferError("Select at least one record type to share.");
    if (tForm.consentMethod === "break_glass" && !tForm.breakGlassReason.trim()) {
      return setTransferError("Break-glass requires a written reason for the audit log.");
    }
    setSavingTransfer(true);
    try {
      const r = await fetch("/api/inter-org/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toOrgId: tForm.toOrgId,
          patientId: tForm.patientId.trim(),
          patientName: tForm.patientName.trim(),
          type: tForm.type,
          urgency: tForm.urgency,
          reason: tForm.reason.trim(),
          items: tForm.items.map((kind) => ({ kind })),
          patientConsent: {
            granted: tForm.consentGranted,
            method: tForm.consentMethod,
            breakGlassReason:
              tForm.consentMethod === "break_glass" ? tForm.breakGlassReason.trim() : undefined,
          },
        }),
      });
      if (r.ok) {
        setToast({ kind: "ok", text: "Transfer created." });
        setShowTransferForm(false);
        setTForm({
          toOrgId: "",
          patientId: "",
          patientName: "",
          type: "patient_transfer",
          urgency: "routine",
          reason: "",
          items: [],
          consentGranted: true,
          consentMethod: "in_person",
          breakGlassReason: "",
        });
        await load();
      } else {
        const body = await r.json().catch(() => ({}));
        setTransferError(`Failed: ${body.error || r.statusText}`);
      }
    } finally {
      setSavingTransfer(false);
    }
  };

  const handleTransferAction = async (
    id: string,
    action: "accept" | "decline" | "complete" | "cancel",
    extra?: { reason?: string; completionNotes?: string },
  ) => {
    const r = await fetch(`/api/inter-org/transfers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: `Transfer ${action}ed.` });
      await load();
    } else {
      const body = await r.json().catch(() => ({}));
      setToast({ kind: "err", text: `Failed: ${body.error || r.statusText}` });
    }
  };

  return (
    <div>
      {toast && (
        <div
          className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Network & Transfers</h2>
        <p className="mt-1 text-sm text-gray-500">
          Connect with other hospitals on OduDoc. Transfer patients, send referrals, and share records — with patient consent and a full audit trail.
        </p>
      </div>

      {/* ── Connections panel ──────────────────────────────────────── */}
      <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Partner connections</h3>
          <span className="text-xs text-slate-500">
            {connectedPartners.length} connected · {inboundRequests.length} inbound · {outboundRequests.length} outbound
          </span>
        </div>

        {/* Send connection request */}
        <div className="mb-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-700">Connect to another hospital</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
            <select
              value={connectTarget}
              onChange={(e) => setConnectTarget(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select hospital…</option>
              {directory.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.country ? `· ${d.country}` : ""}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder='Optional note ("specialist referrals", "post-discharge follow-up"…)'
              value={connectNote}
              onChange={(e) => setConnectNote(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <button
              onClick={handleConnect}
              disabled={!connectTarget || connecting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {connecting ? "Sending…" : "Send request"}
            </button>
          </div>
        </div>

        {/* Inbound requests */}
        {inboundRequests.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Inbound requests
            </p>
            <div className="space-y-2">
              {inboundRequests.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{c.partner.name}</p>
                    {c.note && <p className="mt-0.5 text-xs text-slate-600">&ldquo;{c.note}&rdquo;</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConnectionAction(c.id, "accept")}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleConnectionAction(c.id, "decline")}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connected partners list */}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Hospital</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Since</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {connectedPartners.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{c.partner.name}</p>
                    <p className="text-xs text-slate-500">{c.partner.country || "—"} · {c.partner.plan}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {c.acceptedAt ? new Date(c.acceptedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleConnectionAction(c.id, "revoke")}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Disconnect
                    </button>
                  </td>
                </tr>
              ))}
              {outboundRequests.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 bg-slate-50/50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{c.partner.name}</p>
                    <p className="text-xs text-slate-500">awaiting their acceptance</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[c.status]}`}>
                      pending (outbound)
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleConnectionAction(c.id, "revoke")}
                      className="text-xs font-semibold text-slate-500 hover:underline"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && connectedPartners.length === 0 && outboundRequests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-400">
                    No partner hospitals yet. Send your first connection request above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Transfers panel ────────────────────────────────────────── */}
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Patient & records transfers</h3>
          <button
            onClick={() => setShowTransferForm((v) => !v)}
            disabled={connectedPartners.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            title={connectedPartners.length === 0 ? "Connect with at least one partner first" : undefined}
          >
            {showTransferForm ? "Close" : "+ New transfer"}
          </button>
        </div>

        {showTransferForm && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Destination hospital</label>
                <select
                  value={tForm.toOrgId}
                  onChange={(e) => setTForm({ ...tForm, toOrgId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select partner…</option>
                  {connectedPartners.map((c) => (
                    <option key={c.partner.id} value={c.partner.id}>{c.partner.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Type</label>
                <select
                  value={tForm.type}
                  onChange={(e) => setTForm({ ...tForm, type: e.target.value as InterOrgTransfer["type"] })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="patient_transfer">Patient transfer</option>
                  <option value="records_share">Records share</option>
                  <option value="referral">Referral</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Patient ID</label>
                <input
                  type="text"
                  value={tForm.patientId}
                  onChange={(e) => setTForm({ ...tForm, patientId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Patient name</label>
                <input
                  type="text"
                  value={tForm.patientName}
                  onChange={(e) => setTForm({ ...tForm, patientName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Urgency</label>
                <select
                  value={tForm.urgency}
                  onChange={(e) => setTForm({ ...tForm, urgency: e.target.value as InterOrgTransfer["urgency"] })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency (break-glass eligible)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Consent method</label>
                <select
                  value={tForm.consentMethod}
                  onChange={(e) => setTForm({ ...tForm, consentMethod: e.target.value as typeof tForm.consentMethod })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="in_person">Captured in person</option>
                  <option value="esign">E-signed consent form</option>
                  <option value="phone_otp">Phone OTP</option>
                  <option value="break_glass">Break-glass (emergency only)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Clinical reason</label>
                <textarea
                  rows={2}
                  value={tForm.reason}
                  onChange={(e) => setTForm({ ...tForm, reason: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="e.g. Step-down from ICU; needs cardiology specialist consult; requires advanced imaging not available locally."
                />
              </div>
              {tForm.consentMethod === "break_glass" && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-rose-700">
                    Break-glass reason (audited)
                  </label>
                  <input
                    type="text"
                    value={tForm.breakGlassReason}
                    onChange={(e) => setTForm({ ...tForm, breakGlassReason: e.target.value })}
                    className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm"
                    placeholder="Patient unconscious, life-threatening — consent unobtainable"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Records to share ({tForm.items.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {ITEM_KINDS.map((k) => {
                    const on = tForm.items.includes(k.id);
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => toggleItem(k.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                          on
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-300 bg-white text-slate-500 hover:border-indigo-300"
                        }`}
                      >
                        {k.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {transferError && (
              <p className="mt-3 text-sm text-rose-700">{transferError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleCreateTransfer}
                disabled={savingTransfer}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingTransfer ? "Sending…" : "Send transfer"}
              </button>
              <button
                onClick={() => setShowTransferForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Transfer list */}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Direction</th>
                <th className="px-3 py-2 font-medium">Partner</th>
                <th className="px-3 py-2 font-medium">Patient</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Urgency</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${
                      t.direction === "inbound" ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"
                    }`}>
                      {t.direction === "inbound" ? "↓ inbound" : "↑ outbound"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{t.partner.name}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{t.patientName}</p>
                    <p className="font-mono text-xs text-slate-400">{t.patientId}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">{TYPE_LABEL[t.type]}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${URGENCY_PILL[t.urgency]}`}>
                      {t.urgency}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[t.status]}`}>
                      {t.status}
                    </span>
                    {t.patientConsent.method === "break_glass" && (
                      <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                        🚨 break-glass
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {t.direction === "inbound" && t.status === "pending" && (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleTransferAction(t.id, "accept")}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => {
                            const reason = window.prompt("Why decline this transfer?");
                            if (reason) handleTransferAction(t.id, "decline", { reason });
                          }}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {t.direction === "outbound" && t.status === "pending" && (
                      <button
                        onClick={() => {
                          const reason = window.prompt("Cancel reason?", "no longer needed");
                          if (reason) handleTransferAction(t.id, "cancel", { reason });
                        }}
                        className="text-xs font-semibold text-slate-500 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                    {t.status === "accepted" && (
                      <button
                        onClick={() => {
                          const notes = window.prompt("Completion notes (optional)?", "");
                          handleTransferAction(t.id, "complete", { completionNotes: notes || undefined });
                        }}
                        className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Mark complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && transfers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">
                    No transfers yet. Connect with a partner hospital and send your first transfer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
