"use client";

// /clinic/[clinicId]/referrals
// Two tabs: Inbound (referrals sent TO this clinic) and Outbound
// (referrals this clinic sent elsewhere). Plus a "Refer a patient"
// form that picks any clinic in the OduDoc network as destination.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Status = "sent" | "accepted" | "declined" | "completed" | "cancelled";
type Urgency = "routine" | "urgent" | "emergency";

interface Referral {
  id: string;
  fromClinicId: string;
  fromClinicName: string;
  toClinicId: string;
  toClinicName: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  reason: string;
  specialty?: string;
  urgency: Urgency;
  note?: string;
  status: Status;
  statusReason?: string;
  acknowledgedAt?: string;
  sourceBookingId?: string;
  createdAt: string;
  updatedAt: string;
}

interface NetworkClinic {
  id: string;
  name: string;
  city: string;
  country: string;
  addressLine1: string;
  specialty?: string;
  doctorName: string;
  self: boolean;
}

const URGENCY_TONE: Record<Urgency, string> = {
  routine: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  urgent: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  emergency: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
};

const STATUS_TONE: Record<Status, string> = {
  sent: "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300",
  accepted: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  declined: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
  completed: "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300",
  cancelled: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
};

export default function ReferralsPage() {
  const params = useParams<{ clinicId: string }>();
  const router = useRouter();
  const clinicId = params.clinicId;
  const [inbound, setInbound] = useState<Referral[]>([]);
  const [outbound, setOutbound] = useState<Referral[]>([]);
  const [network, setNetwork] = useState<NetworkClinic[]>([]);
  const [tab, setTab] = useState<"inbound" | "outbound">("inbound");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/clinic/referrals", { cache: "no-store" }),
        fetch("/api/clinic/network", { cache: "no-store" }),
      ]);
      if (r1.status === 401) {
        router.replace(`/clinic/${clinicId}/login`);
        return;
      }
      const d1 = await r1.json();
      const d2 = await r2.json().catch(() => ({ network: [] }));
      setInbound(d1.inbound || []);
      setOutbound(d1.outbound || []);
      setNetwork(d2.network || []);
    } finally {
      setLoading(false);
    }
  }, [clinicId, router]);
  useEffect(() => { load(); }, [load]);

  const pendingInbound = useMemo(() => inbound.filter((r) => r.status === "sent").length, [inbound]);

  return (
    <main className="relative mx-auto max-w-5xl px-4 py-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-400/25 via-fuchsia-400/25 to-emerald-300/25 blur-3xl dark:from-indigo-600/25 dark:via-fuchsia-600/25 dark:to-emerald-500/15" />
      </div>

      <Link href={`/clinic/${clinicId}/dashboard`} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-indigo-600 transition">
        ← Dashboard
      </Link>

      <header className="mb-6 overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg shadow-indigo-500/5">
        <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-6 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Patient referrals</p>
          <h1 className="mt-1 text-2xl font-bold">Send and receive across the OduDoc network</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/80">
            Refer patients to another clinic or hospital on OduDoc. Receiving clinics see your referral on their dashboard and can accept, decline, or complete.
          </p>
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full border-2 border-white/10" />
        </div>
      </header>

      <NewReferralForm clinicId={clinicId} network={network} onCreated={load} />

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTab("inbound")}
            className={
              tab === "inbound"
                ? "rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/30"
                : "rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 hover:border-indigo-300"
            }
          >
            📥 Inbound {pendingInbound > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {pendingInbound}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("outbound")}
            className={
              tab === "outbound"
                ? "rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/30"
                : "rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 hover:border-indigo-300"
            }
          >
            📤 Outbound
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading…</p>
        ) : (
          <ReferralList
            referrals={tab === "inbound" ? inbound : outbound}
            direction={tab}
            onAction={load}
            emptyHint={tab === "inbound" ? "Nothing inbound yet." : "You haven't referred anyone yet."}
          />
        )}
      </div>
    </main>
  );
}

function NewReferralForm({
  clinicId,
  network,
  onCreated,
}: {
  clinicId: string;
  network: NetworkClinic[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [toClinicId, setTo] = useState("");
  const [patientName, setPN] = useState("");
  const [patientPhone, setPP] = useState("");
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("routine");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOk] = useState<string | null>(null);

  const eligible = useMemo(() => network.filter((c) => !c.self), [network]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (!toClinicId) { setErr("Pick a destination clinic."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/clinic/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toClinicId,
          patientName,
          patientPhone,
          reason,
          urgency,
          note: note || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "Failed to send");
        return;
      }
      setOk(`Referral ${d.referral.id} sent to ${d.referral.toClinicName}.`);
      setTo(""); setPN(""); setPP(""); setReason(""); setNote(""); setUrgency("routine");
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  const inputBase =
    "w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition";

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-base text-white shadow-md shadow-emerald-500/30">↗️</span>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Refer a patient</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">{eligible.length} clinics in the network</p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:shadow-md transition"
        >
          {open ? "Close" : "+ New referral"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Refer to *</span>
            <select required value={toClinicId} onChange={(e) => setTo(e.target.value)} className={inputBase}>
              <option value="">— Pick a clinic / hospital —</option>
              {eligible.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.city}, {c.country} · {c.doctorName}{c.specialty ? ` · ${c.specialty}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Patient name *</span>
            <input required value={patientName} onChange={(e) => setPN(e.target.value)} className={inputBase} placeholder="Riya Sharma" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Patient phone *</span>
            <input required type="tel" value={patientPhone} onChange={(e) => setPP(e.target.value)} className={inputBase} placeholder="+91 98XXXXXXXX" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Reason *</span>
            <input required value={reason} onChange={(e) => setReason(e.target.value)} className={inputBase} placeholder="Needs cardiology consult for chest pain workup" />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Urgency</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["routine", "urgent", "emergency"] as const).map((u) => (
                <button
                  type="button"
                  key={u}
                  onClick={() => setUrgency(u)}
                  className={
                    urgency === u
                      ? `rounded-xl border-2 ${u === "emergency" ? "border-rose-500" : u === "urgent" ? "border-amber-500" : "border-indigo-500"} px-3 py-2 text-xs font-semibold ${URGENCY_TONE[u]}`
                      : "rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-300 hover:border-indigo-300"
                  }
                >
                  {u === "routine" ? "🟢 Routine" : u === "urgent" ? "🟡 Urgent" : "🔴 Emergency"}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Clinical note (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputBase} placeholder="Vitals, current meds, history — anything the receiving doctor should know." />
          </label>

          {err && (
            <p className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 sm:col-span-2">
              {err}
            </p>
          )}
          {okMsg && (
            <p className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 sm:col-span-2">
              {okMsg}
            </p>
          )}

          <button
            disabled={busy}
            className="rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition sm:col-span-2"
          >
            {busy ? "Sending…" : "Send referral →"}
          </button>
        </form>
      )}
    </div>
  );
}

function ReferralList({
  referrals,
  direction,
  onAction,
  emptyHint,
}: {
  referrals: Referral[];
  direction: "inbound" | "outbound";
  onAction: () => void;
  emptyHint: string;
}) {
  if (referrals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/40 p-8 text-center">
        <p className="text-sm text-gray-500 dark:text-slate-400">{emptyHint}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {referrals.map((r) => (
        <ReferralCard key={r.id} referral={r} direction={direction} onAction={onAction} />
      ))}
    </ul>
  );
}

function ReferralCard({
  referral,
  direction,
  onAction,
}: {
  referral: Referral;
  direction: "inbound" | "outbound";
  onAction: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const act = async (status: Status, reason?: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/clinic/referrals/${referral.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      if (r.ok) onAction();
    } finally {
      setBusy(false);
    }
  };

  const showInboundActions = direction === "inbound" && referral.status === "sent";
  const showCompleteAction = direction === "inbound" && referral.status === "accepted";
  const showCancelAction = direction === "outbound" && referral.status === "sent";

  return (
    <li className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md hover:shadow-indigo-500/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-gray-400 dark:text-slate-500">{referral.id}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATUS_TONE[referral.status]}`}>
              {referral.status}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${URGENCY_TONE[referral.urgency]}`}>
              {referral.urgency === "emergency" ? "🔴" : referral.urgency === "urgent" ? "🟡" : "🟢"} {referral.urgency}
            </span>
          </div>
          <p className="mt-2 text-base font-semibold text-gray-900 dark:text-slate-100">{referral.patientName}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            📱 {referral.patientPhone}
            {referral.patientEmail ? ` · ✉️ ${referral.patientEmail}` : ""}
          </p>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">{referral.reason}</p>
          {referral.note && (
            <p className="mt-1 rounded-lg bg-gray-50 dark:bg-slate-950/60 px-3 py-2 text-xs text-gray-600 dark:text-slate-400 whitespace-pre-wrap">
              {referral.note}
            </p>
          )}
          <p className="mt-2 text-[11px] text-gray-500 dark:text-slate-500">
            {direction === "inbound" ? "From" : "To"}{" "}
            <span className="font-semibold text-gray-700 dark:text-slate-300">
              {direction === "inbound" ? referral.fromClinicName : referral.toClinicName}
            </span>
            {" · "}
            {new Date(referral.createdAt).toLocaleString()}
          </p>
          {referral.statusReason && (
            <p className="mt-1 text-[11px] italic text-gray-500 dark:text-slate-500">
              Reason: {referral.statusReason}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {showInboundActions && (
            <>
              <button
                disabled={busy}
                onClick={() => act("accepted")}
                className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/30 hover:shadow-md disabled:opacity-50 transition"
              >
                Accept
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  const reason = prompt("Reason for declining (optional)") || undefined;
                  act("declined", reason);
                }}
                className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50 transition"
              >
                Decline
              </button>
            </>
          )}
          {showCompleteAction && (
            <button
              disabled={busy}
              onClick={() => act("completed")}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-violet-500/30 hover:shadow-md disabled:opacity-50 transition"
            >
              Mark completed
            </button>
          )}
          {showCancelAction && (
            <button
              disabled={busy}
              onClick={() => {
                const reason = prompt("Reason for cancelling (optional)") || undefined;
                act("cancelled", reason);
              }}
              className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
