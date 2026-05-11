"use client";

// Inter-org Network console — tabbed.
//
// Tabs:
//   - Inbox        unread transfers across both directions
//   - Transfers    full create/accept/decline/complete UI
//   - Connections  partner directory + handshake + revenue split
//   - Doctors      cross-network doctor directory (one-click refer)
//   - Beds         live bed-availability feed + publish own snapshot
//   - Analytics    cross-org KPIs + per-partner conversion + payouts

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

type Tab = "inbox" | "transfers" | "connections" | "doctors" | "beds" | "analytics";

interface PartnerOrg { id: string; name: string; slug: string; country?: string; plan?: string; }

interface OrgConnection {
  id: string; orgAId: string; orgBId: string; requestedByOrgId: string;
  status: "pending" | "connected" | "declined" | "revoked";
  note?: string; createdAt: string; acceptedAt?: string;
  partner: PartnerOrg; isInbound: boolean;
  revenueSplitPct?: number;
}

interface InterOrgTransfer {
  id: string; fromOrgId: string; toOrgId: string;
  patientId: string; patientName: string;
  type: "patient_transfer" | "records_share" | "referral";
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
  urgency: "routine" | "urgent" | "emergency";
  reason: string;
  items: Array<{ kind: string }>;
  patientConsent: { granted: boolean; method?: string; breakGlassReason?: string };
  requestedByEmail: string; requestedAt: string;
  acceptedAt?: string; declinedReason?: string; completedAt?: string;
  direction: "inbound" | "outbound";
  partner: PartnerOrg;
  readByOrgIds: string[];
  referral?: {
    splitPct: number; grossAmountMinor?: number; currency?: string;
    payoutAmountMinor?: number;
    payoutStatus: "pending" | "owed" | "paid" | "waived";
  };
}

interface InboxItem {
  id: string; direction: "inbound" | "outbound";
  partnerName: string; partnerId: string;
  patientName: string; type: string; urgency: string;
  status: string; requestedAt: string; reason: string; breakGlass: boolean;
}

interface DirectoryDoctor {
  doctorId: string; name: string; specialty: string;
  qualifications?: string; experience?: number;
  city?: string; rating?: number; fee?: number; photoUrl?: string;
  instantAvailable: boolean; verified: boolean;
  orgId: string; orgName: string;
}

interface BedRow {
  orgId: string; orgName: string; country?: string;
  capacity: Record<string, number>;
  available: Record<string, number>;
  totalAvailable: number; totalCapacity: number;
  staffShortage: boolean; notice?: string;
  updatedAt?: string; isSelf: boolean; stale: boolean;
}

interface PartnerStats {
  partnerId: string; partnerName: string; partnerCountry?: string;
  outboundCount: number; inboundCount: number;
  acceptedCount: number; declinedCount: number; completedCount: number;
  totalGrossMinor: number; totalPayoutOwedMinor: number; totalPayoutPaidMinor: number;
  currency?: string; lastActivityAt?: string;
}

interface AnalyticsData {
  kpis: {
    totalOutbound: number; totalInbound: number;
    totalCompleted: number; totalDeclined: number;
    conversionPct: number;
    payoutOwedMinor: number; payoutPaidMinor: number; grossMinor: number;
    partnerCount: number; windowDays: number;
  };
  partners: PartnerStats[];
  timeline: Array<{ date: string; outbound: number; inbound: number }>;
  topSpecialties: Array<{ name: string; count: number }>;
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
const BED_CATS: Array<{ id: string; label: string }> = [
  { id: "icu", label: "ICU" },
  { id: "hdu", label: "HDU" },
  { id: "ventilator", label: "Ventilator" },
  { id: "general", label: "General" },
  { id: "private", label: "Private" },
  { id: "maternity", label: "Maternity" },
  { id: "nicu", label: "NICU" },
  { id: "paediatric", label: "Paediatric" },
  { id: "emergency", label: "Emergency" },
  { id: "isolation", label: "Isolation" },
  { id: "post_op", label: "Post-op" },
];

function fmtMoneyMinor(minor: number, currency = "INR"): string {
  if (!minor) return "—";
  const major = (minor / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${currency} ${major}`;
}
function timeAgo(iso?: string): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminNetworkPage() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // ────── Shared data ───────────────────────────────────────────────
  const [connections, setConnections] = useState<OrgConnection[]>([]);
  const [directory, setDirectory] = useState<PartnerOrg[]>([]);
  const [transfers, setTransfers] = useState<InterOrgTransfer[]>([]);
  const [inbox, setInbox] = useState<{ unread: number; items: InboxItem[] }>({ unread: 0, items: [] });
  const [doctors, setDoctors] = useState<DirectoryDoctor[]>([]);
  const [beds, setBeds] = useState<BedRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // ────── Doctor-directory filters ─────────────────────────────────
  const [docFilter, setDocFilter] = useState({ q: "", specialty: "", city: "", instant: false });

  // ────── Bed-publish form ─────────────────────────────────────────
  const [bedForm, setBedForm] = useState<{
    capacity: Record<string, number>;
    available: Record<string, number>;
    staffShortage: boolean; notice: string;
  }>({ capacity: {}, available: {}, staffShortage: false, notice: "" });
  const [savingBeds, setSavingBeds] = useState(false);

  // ────── Connect form ─────────────────────────────────────────────
  const [connectTarget, setConnectTarget] = useState("");
  const [connectNote, setConnectNote] = useState("");

  // ────── Transfer form ────────────────────────────────────────────
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [tForm, setTForm] = useState({
    toOrgId: "", patientId: "", patientName: "",
    type: "patient_transfer" as InterOrgTransfer["type"],
    urgency: "routine" as InterOrgTransfer["urgency"],
    reason: "", items: [] as string[],
    consentGranted: true,
    consentMethod: "in_person" as "in_person" | "esign" | "phone_otp" | "break_glass",
    breakGlassReason: "",
  });
  const [transferError, setTransferError] = useState("");

  const connectedPartners = useMemo(
    () => connections.filter((c) => c.status === "connected"),
    [connections],
  );
  const inboundReq = connections.filter((c) => c.status === "pending" && c.isInbound);
  const outboundReq = connections.filter((c) => c.status === "pending" && !c.isInbound);

  // ────── Loaders ──────────────────────────────────────────────────
  const loadCore = useCallback(async () => {
    const [n, x, ib] = await Promise.all([
      fetch("/api/inter-org/network", { cache: "no-store" }),
      fetch("/api/inter-org/transfers", { cache: "no-store" }),
      fetch("/api/inter-org/inbox", { cache: "no-store" }),
    ]);
    if (n.ok) {
      const d = await n.json();
      setConnections(d.connections || []);
      setDirectory(d.directory || []);
    }
    if (x.ok) {
      const d = await x.json();
      setTransfers(d.transfers || []);
    }
    if (ib.ok) setInbox(await ib.json());
  }, []);

  const loadDoctors = useCallback(async () => {
    const qs = new URLSearchParams();
    if (docFilter.q) qs.set("q", docFilter.q);
    if (docFilter.specialty) qs.set("specialty", docFilter.specialty);
    if (docFilter.city) qs.set("city", docFilter.city);
    if (docFilter.instant) qs.set("instant", "1");
    const r = await fetch(`/api/inter-org/doctors?${qs}`, { cache: "no-store" });
    if (r.ok) setDoctors((await r.json()).doctors || []);
  }, [docFilter]);

  const loadBeds = useCallback(async () => {
    const r = await fetch("/api/inter-org/beds", { cache: "no-store" });
    if (r.ok) {
      const data = await r.json();
      setBeds(data.feed || []);
      const self = (data.feed || []).find((b: BedRow) => b.isSelf);
      if (self) {
        setBedForm({
          capacity: self.capacity || {},
          available: self.available || {},
          staffShortage: self.staffShortage || false,
          notice: self.notice || "",
        });
      }
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    const r = await fetch("/api/inter-org/analytics?days=90", { cache: "no-store" });
    if (r.ok) setAnalytics(await r.json());
  }, []);

  useEffect(() => { loadCore(); }, [loadCore]);
  useEffect(() => { if (tab === "doctors") loadDoctors(); }, [tab, loadDoctors]);
  useEffect(() => { if (tab === "beds") loadBeds(); }, [tab, loadBeds]);
  useEffect(() => { if (tab === "analytics") loadAnalytics(); }, [tab, loadAnalytics]);

  // ────── Actions ──────────────────────────────────────────────────
  async function api(url: string, init: RequestInit, okMsg: string) {
    const r = await fetch(url, init);
    if (r.ok) {
      setToast({ kind: "ok", text: okMsg });
      await loadCore();
      return await r.json().catch(() => ({}));
    }
    const body = await r.json().catch(() => ({}));
    setToast({ kind: "err", text: `Failed: ${body.error || r.statusText}` });
    return null;
  }

  const markRead = (id: string) =>
    api(`/api/inter-org/inbox`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }, "Marked read");
  const markAllRead = () =>
    api(`/api/inter-org/inbox`, { method: "DELETE" }, "All marked read");

  const connect = () => {
    if (!connectTarget) return;
    api("/api/inter-org/network", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toOrgId: connectTarget, note: connectNote }),
    }, "Connection request sent.").then(() => { setConnectTarget(""); setConnectNote(""); });
  };
  const connAction = (id: string, action: string, extra: Record<string, unknown> = {}) =>
    api(`/api/inter-org/network/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    }, `Connection ${action}.`);
  const xferAction = (id: string, action: string, extra: Record<string, unknown> = {}) =>
    api(`/api/inter-org/transfers/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    }, `Transfer ${action}.`);
  const payoutAction = (id: string, action: string, extra: Record<string, unknown> = {}) =>
    api(`/api/inter-org/transfers/${id}/payout`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    }, `Payout ${action}.`);

  const referFromDirectory = (d: DirectoryDoctor) => {
    setTab("transfers");
    setShowTransferForm(true);
    setTForm({
      toOrgId: d.orgId, patientId: "", patientName: "",
      type: "referral", urgency: "routine",
      reason: `Referral to Dr. ${d.name} (${d.specialty}) at ${d.orgName}.`,
      items: ["demographics", "encounter_notes"],
      consentGranted: true, consentMethod: "in_person", breakGlassReason: "",
    });
  };

  const toggleItem = (kind: string) => setTForm((f) => ({
    ...f, items: f.items.includes(kind) ? f.items.filter((x) => x !== kind) : [...f.items, kind],
  }));

  const createTransfer = async () => {
    setTransferError("");
    if (!tForm.toOrgId || !tForm.patientId.trim() || !tForm.patientName.trim() || !tForm.reason.trim() || tForm.items.length === 0) {
      setTransferError("Fill destination, patient ID, name, reason and at least one record kind.");
      return;
    }
    if (tForm.consentMethod === "break_glass" && !tForm.breakGlassReason.trim()) {
      setTransferError("Break-glass requires a written reason.");
      return;
    }
    const r = await fetch("/api/inter-org/transfers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toOrgId: tForm.toOrgId, patientId: tForm.patientId.trim(),
        patientName: tForm.patientName.trim(), type: tForm.type,
        urgency: tForm.urgency, reason: tForm.reason.trim(),
        items: tForm.items.map((kind) => ({ kind })),
        patientConsent: {
          granted: tForm.consentGranted, method: tForm.consentMethod,
          breakGlassReason: tForm.consentMethod === "break_glass" ? tForm.breakGlassReason.trim() : undefined,
        },
      }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: "Transfer sent." });
      setShowTransferForm(false);
      await loadCore();
    } else {
      const body = await r.json().catch(() => ({}));
      setTransferError(body.error || r.statusText);
    }
  };

  const publishBeds = async () => {
    setSavingBeds(true);
    try {
      const r = await fetch("/api/inter-org/beds", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bedForm),
      });
      if (r.ok) { setToast({ kind: "ok", text: "Bed snapshot published." }); await loadBeds(); }
      else {
        const body = await r.json().catch(() => ({}));
        setToast({ kind: "err", text: `Failed: ${body.error || r.statusText}` });
      }
    } finally { setSavingBeds(false); }
  };

  // ────── Render ───────────────────────────────────────────────────
  return (
    <div>
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
          toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
        }`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6">
        <PageHero
          icon="🔗"
          eyebrow="Inter-Hospital"
          title="Network & Transfers"
          subtitle="Hospitals on OduDoc work as one network — discover doctors, check live bed availability, transfer patients & records, and settle referral payouts."
          tone="violet"
        />
      </div>

      {/* Tab strip */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        {([
          ["inbox", `Inbox${inbox.unread ? ` (${inbox.unread})` : ""}`],
          ["transfers", "Transfers"],
          ["connections", "Connections"],
          ["doctors", "Find doctors"],
          ["beds", "Bed availability"],
          ["analytics", "Analytics"],
        ] as Array<[Tab, string]>).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── INBOX ─────────────────────────────────────────────────── */}
      {tab === "inbox" && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Records inbox</h3>
              <p className="text-xs text-slate-500">{inbox.unread} unread item{inbox.unread === 1 ? "" : "s"}</p>
            </div>
            {inbox.unread > 0 && (
              <button onClick={markAllRead} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Mark all read
              </button>
            )}
          </div>
          {inbox.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Inbox zero. Nothing waiting.</p>
          ) : (
            <ul className="space-y-2">
              {inbox.items.map((it) => (
                <li key={it.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    it.direction === "inbound" ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"
                  }`}>{it.direction === "inbound" ? "↓" : "↑"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {TYPE_LABEL[it.type]} · {it.patientName}
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${URGENCY_PILL[it.urgency]}`}>{it.urgency}</span>
                      {it.breakGlass && <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">🚨 break-glass</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {it.direction === "inbound" ? "from" : "to"} {it.partnerName} · {timeAgo(it.requestedAt)} · status: {it.status}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{it.reason}</p>
                  </div>
                  <button onClick={() => markRead(it.id)} className="text-xs font-semibold text-indigo-600 hover:underline">Mark read</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── TRANSFERS ─────────────────────────────────────────────── */}
      {tab === "transfers" && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Patient & records transfers</h3>
            <button
              onClick={() => setShowTransferForm((v) => !v)}
              disabled={connectedPartners.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {showTransferForm ? "Close" : "+ New transfer"}
            </button>
          </div>

          {showTransferForm && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Destination hospital">
                  <select value={tForm.toOrgId} onChange={(e) => setTForm({ ...tForm, toOrgId: e.target.value })} className="form-input">
                    <option value="">Select partner…</option>
                    {connectedPartners.map((c) => <option key={c.partner.id} value={c.partner.id}>{c.partner.name}</option>)}
                  </select>
                </Field>
                <Field label="Type">
                  <select value={tForm.type} onChange={(e) => setTForm({ ...tForm, type: e.target.value as InterOrgTransfer["type"] })} className="form-input">
                    <option value="patient_transfer">Patient transfer</option>
                    <option value="records_share">Records share</option>
                    <option value="referral">Referral</option>
                  </select>
                </Field>
                <Field label="Patient ID"><input className="form-input font-mono" value={tForm.patientId} onChange={(e) => setTForm({ ...tForm, patientId: e.target.value })} /></Field>
                <Field label="Patient name"><input className="form-input" value={tForm.patientName} onChange={(e) => setTForm({ ...tForm, patientName: e.target.value })} /></Field>
                <Field label="Urgency">
                  <select value={tForm.urgency} onChange={(e) => setTForm({ ...tForm, urgency: e.target.value as InterOrgTransfer["urgency"] })} className="form-input">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency (break-glass eligible)</option>
                  </select>
                </Field>
                <Field label="Consent method">
                  <select value={tForm.consentMethod} onChange={(e) => setTForm({ ...tForm, consentMethod: e.target.value as typeof tForm.consentMethod })} className="form-input">
                    <option value="in_person">Captured in person</option>
                    <option value="esign">E-signed consent</option>
                    <option value="phone_otp">Phone OTP</option>
                    <option value="break_glass">Break-glass</option>
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Clinical reason">
                    <textarea rows={2} className="form-input" value={tForm.reason} onChange={(e) => setTForm({ ...tForm, reason: e.target.value })} />
                  </Field>
                </div>
                {tForm.consentMethod === "break_glass" && (
                  <div className="sm:col-span-2">
                    <Field label="Break-glass reason (audited)">
                      <input className="form-input border-rose-300" value={tForm.breakGlassReason} onChange={(e) => setTForm({ ...tForm, breakGlassReason: e.target.value })} />
                    </Field>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Records to share ({tForm.items.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {ITEM_KINDS.map((k) => {
                      const on = tForm.items.includes(k.id);
                      return (
                        <button key={k.id} type="button" onClick={() => toggleItem(k.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                            on ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 bg-white text-slate-500"
                          }`}>{k.label}</button>
                      );
                    })}
                  </div>
                </div>
                {tForm.type === "referral" && tForm.toOrgId && (() => {
                  const c = connectedPartners.find((x) => x.partner.id === tForm.toOrgId);
                  const pct = c?.revenueSplitPct || 0;
                  return (
                    <div className="sm:col-span-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      Referral revenue split with {c?.partner.name}: <strong>{pct}%</strong>
                      {pct === 0 && " — set a split on the Connections tab to enable kickbacks."}
                    </div>
                  );
                })()}
              </div>
              {transferError && <p className="mt-3 text-sm text-rose-700">{transferError}</p>}
              <div className="mt-4 flex gap-2">
                <button onClick={createTransfer} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Send transfer</button>
                <button onClick={() => setShowTransferForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Dir</th>
                  <th className="px-3 py-2 font-medium">Partner</th>
                  <th className="px-3 py-2 font-medium">Patient</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Urgency</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Payout</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${t.direction === "inbound" ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}>
                        {t.direction === "inbound" ? "↓" : "↑"}
                      </span>
                    </td>
                    <td className="px-3 py-2">{t.partner.name}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{t.patientName}</p>
                      <p className="font-mono text-xs text-slate-400">{t.patientId}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">{TYPE_LABEL[t.type]}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${URGENCY_PILL[t.urgency]}`}>{t.urgency}</span></td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[t.status]}`}>{t.status}</span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {t.referral ? (
                        <div>
                          <p className="font-semibold">{t.referral.splitPct}% split</p>
                          {t.referral.payoutStatus === "owed" && <p className="text-amber-700">{fmtMoneyMinor(t.referral.payoutAmountMinor || 0, t.referral.currency)} owed</p>}
                          {t.referral.payoutStatus === "paid" && <p className="text-emerald-700">paid</p>}
                          {t.referral.payoutStatus === "waived" && <p className="text-slate-500">waived</p>}
                          {t.referral.payoutStatus === "pending" && <p className="text-slate-400">awaiting gross</p>}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {t.direction === "inbound" && t.status === "pending" && (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => xferAction(t.id, "accept")} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">Accept</button>
                          <button onClick={() => { const r = window.prompt("Decline reason?"); if (r) xferAction(t.id, "decline", { reason: r }); }} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700">Decline</button>
                        </div>
                      )}
                      {t.status === "accepted" && t.direction === "inbound" && t.referral && t.referral.payoutStatus === "pending" && (
                        <button onClick={() => {
                          const g = window.prompt("Gross charged to patient (in INR rupees)?");
                          if (g) payoutAction(t.id, "record_gross", { grossAmountMinor: Math.floor(parseFloat(g) * 100), currency: "INR" });
                        }} className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white">Record gross</button>
                      )}
                      {t.referral?.payoutStatus === "owed" && t.direction === "outbound" && (
                        <button onClick={() => payoutAction(t.id, "mark_paid")} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">Mark paid</button>
                      )}
                      {t.status === "accepted" && (
                        <button onClick={() => { const n = window.prompt("Completion notes?", ""); xferAction(t.id, "complete", { completionNotes: n || undefined }); }} className="ml-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white">Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
                {transfers.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400">No transfers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── CONNECTIONS ───────────────────────────────────────────── */}
      {tab === "connections" && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Partner connections</h3>
            <span className="text-xs text-slate-500">{connectedPartners.length} connected · {inboundReq.length} inbound · {outboundReq.length} outbound</span>
          </div>

          <div className="mb-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Connect to another hospital</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
              <select value={connectTarget} onChange={(e) => setConnectTarget(e.target.value)} className="form-input">
                <option value="">Select hospital…</option>
                {directory.map((d) => <option key={d.id} value={d.id}>{d.name} {d.country ? `· ${d.country}` : ""}</option>)}
              </select>
              <input type="text" placeholder="Optional note" value={connectNote} onChange={(e) => setConnectNote(e.target.value)} className="form-input" />
              <button onClick={connect} disabled={!connectTarget} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Send request</button>
            </div>
          </div>

          {inboundReq.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Inbound requests</p>
              <div className="space-y-2">
                {inboundReq.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{c.partner.name}</p>
                      {c.note && <p className="mt-0.5 text-xs text-slate-600">&ldquo;{c.note}&rdquo;</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => connAction(c.id, "accept")} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Accept</button>
                      <button onClick={() => connAction(c.id, "decline")} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Hospital</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Revenue split</th>
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
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[c.status]}`}>{c.status}</span></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} max={50} defaultValue={c.revenueSplitPct || 0}
                          className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                          onBlur={(e) => {
                            const pct = parseInt(e.target.value, 10) || 0;
                            if (pct !== (c.revenueSplitPct || 0)) connAction(c.id, "set_revenue_split", { pct });
                          }} />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{c.acceptedAt ? new Date(c.acceptedAt).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => connAction(c.id, "revoke")} className="text-xs font-semibold text-rose-600 hover:underline">Disconnect</button></td>
                  </tr>
                ))}
                {outboundReq.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 bg-slate-50/50">
                    <td className="px-3 py-2"><p className="font-medium text-slate-900">{c.partner.name}</p><p className="text-xs text-slate-500">awaiting their acceptance</p></td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[c.status]}`}>pending</span></td>
                    <td className="px-3 py-2 text-xs text-slate-400">—</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => connAction(c.id, "revoke")} className="text-xs font-semibold text-slate-500 hover:underline">Cancel</button></td>
                  </tr>
                ))}
                {connectedPartners.length === 0 && outboundReq.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-400">No partner hospitals yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── DOCTORS ───────────────────────────────────────────────── */}
      {tab === "doctors" && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Find doctors across the network</h3>
            <p className="text-xs text-slate-500">Across {connectedPartners.length + 1} hospital{connectedPartners.length === 0 ? "" : "s"}. One-click refer.</p>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            <input className="form-input" placeholder="Search name / specialty / hospital" value={docFilter.q} onChange={(e) => setDocFilter({ ...docFilter, q: e.target.value })} />
            <input className="form-input" placeholder="Specialty (e.g. cardiology)" value={docFilter.specialty} onChange={(e) => setDocFilter({ ...docFilter, specialty: e.target.value })} />
            <input className="form-input" placeholder="City" value={docFilter.city} onChange={(e) => setDocFilter({ ...docFilter, city: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={docFilter.instant} onChange={(e) => setDocFilter({ ...docFilter, instant: e.target.checked })} /> Available now</label>
          </div>
          <button onClick={loadDoctors} className="mb-3 rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">Apply filters</button>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d) => (
              <div key={`${d.orgId}-${d.doctorId}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-center font-bold leading-10 text-white">
                    {d.name.replace(/^Dr\.?\s*/i, "").split(" ").map(w => w[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{d.name} {d.verified && <span title="Verified">✓</span>}</p>
                    <p className="text-xs text-slate-500">{d.specialty}{d.experience ? ` · ${d.experience} yrs` : ""}</p>
                    <p className="text-xs text-slate-400">{d.orgName}{d.city ? ` · ${d.city}` : ""}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-600">{d.rating ? `★ ${d.rating.toFixed(1)}` : ""}{d.fee ? ` · ₹${d.fee}` : ""}</span>
                  {d.instantAvailable && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">Available now</span>}
                </div>
                <button onClick={() => referFromDirectory(d)} className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Refer patient →</button>
              </div>
            ))}
            {doctors.length === 0 && <p className="col-span-full py-8 text-center text-sm text-slate-400">No doctors match these filters.</p>}
          </div>
        </section>
      )}

      {/* ── BEDS ──────────────────────────────────────────────────── */}
      {tab === "beds" && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Bed availability — live network feed</h3>
            <p className="text-xs text-slate-500">Snapshot published by each hospital. Stale rows (no update in 24h) are dimmed.</p>
          </div>

          {/* Publish own snapshot */}
          <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p className="mb-3 text-sm font-semibold text-indigo-900">Publish your hospital&apos;s snapshot</p>
            <div className="grid gap-2 md:grid-cols-3">
              {BED_CATS.map((c) => (
                <div key={c.id} className="rounded-md bg-white p-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{c.label}</p>
                  <div className="flex items-center gap-1 text-sm">
                    <input type="number" min={0} placeholder="free"
                      value={bedForm.available[c.id] ?? ""}
                      onChange={(e) => setBedForm({ ...bedForm, available: { ...bedForm.available, [c.id]: parseInt(e.target.value) || 0 } })}
                      className="w-14 rounded border border-slate-300 px-1 text-sm" />
                    <span className="text-slate-400">/</span>
                    <input type="number" min={0} placeholder="cap"
                      value={bedForm.capacity[c.id] ?? ""}
                      onChange={(e) => setBedForm({ ...bedForm, capacity: { ...bedForm.capacity, [c.id]: parseInt(e.target.value) || 0 } })}
                      className="w-14 rounded border border-slate-300 px-1 text-sm" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={bedForm.staffShortage} onChange={(e) => setBedForm({ ...bedForm, staffShortage: e.target.checked })} /> Staff shortage</label>
              <input className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs" placeholder="Notice (e.g. 'OT closed for maintenance Mon-Tue')" value={bedForm.notice} onChange={(e) => setBedForm({ ...bedForm, notice: e.target.value })} />
              <button onClick={publishBeds} disabled={savingBeds} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {savingBeds ? "Publishing…" : "Publish snapshot"}
              </button>
            </div>
          </div>

          {/* Network feed */}
          <div className="space-y-2">
            {beds.map((b) => (
              <div key={b.orgId} className={`rounded-lg border p-4 ${b.stale ? "border-slate-200 bg-slate-50 opacity-60" : "border-emerald-200 bg-white"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {b.orgName}{b.isSelf && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">You</span>}
                      {b.staffShortage && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">Staff shortage</span>}
                    </p>
                    <p className="text-xs text-slate-500">{b.country || "—"} · updated {timeAgo(b.updatedAt)}{b.stale ? " (stale)" : ""}</p>
                    {b.notice && <p className="mt-1 text-xs italic text-slate-600">&ldquo;{b.notice}&rdquo;</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-emerald-600">{b.totalAvailable}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">free / {b.totalCapacity} total</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {BED_CATS.map((c) => {
                    const av = b.available[c.id] ?? 0;
                    const cap = b.capacity[c.id] ?? 0;
                    if (cap === 0) return null;
                    return (
                      <span key={c.id} className={`rounded-md px-2 py-0.5 text-xs font-medium ${av === 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"}`}>
                        {c.label}: {av}/{cap}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
            {beds.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No bed feeds in your network yet.</p>}
          </div>
        </section>
      )}

      {/* ── ANALYTICS ─────────────────────────────────────────────── */}
      {tab === "analytics" && analytics && (
        <section className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <Kpi label="Outbound" value={analytics.kpis.totalOutbound} />
            <Kpi label="Inbound" value={analytics.kpis.totalInbound} />
            <Kpi label="Conversion" value={`${analytics.kpis.conversionPct}%`} subtle={`${analytics.kpis.totalCompleted} completed`} />
            <Kpi label="Active partners" value={analytics.kpis.partnerCount} />
            <Kpi label="Gross referred" value={fmtMoneyMinor(analytics.kpis.grossMinor)} subtle="patients you sent" />
            <Kpi label="Payout owed" value={fmtMoneyMinor(analytics.kpis.payoutOwedMinor)} accent="amber" />
            <Kpi label="Payout paid" value={fmtMoneyMinor(analytics.kpis.payoutPaidMinor)} accent="emerald" />
            <Kpi label="Window" value={`${analytics.kpis.windowDays}d`} />
          </div>

          {/* Sparkline-ish timeline */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-900">Daily transfers (last {analytics.kpis.windowDays} days)</p>
            <Sparkline data={analytics.timeline} />
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-900">Per-partner breakdown</p>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Partner</th>
                    <th className="px-3 py-2 font-medium">Out</th>
                    <th className="px-3 py-2 font-medium">In</th>
                    <th className="px-3 py-2 font-medium">Done</th>
                    <th className="px-3 py-2 font-medium">Decl.</th>
                    <th className="px-3 py-2 font-medium">Gross</th>
                    <th className="px-3 py-2 font-medium">Owed</th>
                    <th className="px-3 py-2 font-medium">Paid</th>
                    <th className="px-3 py-2 font-medium">Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.partners.map((p) => (
                    <tr key={p.partnerId} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">{p.partnerName}</td>
                      <td className="px-3 py-2">{p.outboundCount}</td>
                      <td className="px-3 py-2">{p.inboundCount}</td>
                      <td className="px-3 py-2 text-emerald-700">{p.completedCount}</td>
                      <td className="px-3 py-2 text-rose-700">{p.declinedCount}</td>
                      <td className="px-3 py-2 text-xs">{fmtMoneyMinor(p.totalGrossMinor, p.currency || "INR")}</td>
                      <td className="px-3 py-2 text-xs text-amber-700">{fmtMoneyMinor(p.totalPayoutOwedMinor, p.currency || "INR")}</td>
                      <td className="px-3 py-2 text-xs text-emerald-700">{fmtMoneyMinor(p.totalPayoutPaidMinor, p.currency || "INR")}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{timeAgo(p.lastActivityAt)}</td>
                    </tr>
                  ))}
                  {analytics.partners.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-400">No partner activity in this window.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {analytics.topSpecialties.length > 0 && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-slate-900">Most-referred specialties</p>
              <div className="flex flex-wrap gap-2">
                {analytics.topSpecialties.map((s) => (
                  <span key={s.name} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {s.name} <span className="ml-1 font-bold text-indigo-600">{s.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          background: #fff;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #0f172a;
        }
        :global(.form-input:focus) {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function Kpi({ label, value, subtle, accent }: { label: string; value: string | number; subtle?: string; accent?: "amber" | "emerald" }) {
  const accentClass = accent === "amber" ? "text-amber-700" : accent === "emerald" ? "text-emerald-700" : "text-slate-900";
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${accentClass}`}>{value}</p>
      {subtle && <p className="text-[11px] text-slate-400">{subtle}</p>}
    </div>
  );
}

function Sparkline({ data }: { data: Array<{ date: string; outbound: number; inbound: number }> }) {
  if (data.length === 0) return <p className="text-sm text-slate-400">No data.</p>;
  const max = Math.max(1, ...data.map((d) => Math.max(d.outbound, d.inbound)));
  const w = 800;
  const h = 80;
  const step = w / (data.length - 1 || 1);
  const path = (key: "outbound" | "inbound") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${i * step},${h - (d[key] / max) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
      <path d={path("outbound")} stroke="#7c3aed" strokeWidth={2} fill="none" />
      <path d={path("inbound")} stroke="#0284c7" strokeWidth={2} fill="none" />
    </svg>
  );
}
