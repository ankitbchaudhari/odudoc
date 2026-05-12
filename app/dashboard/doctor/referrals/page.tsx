"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  useReferrals,
  statusStyle,
  urgencyStyle,
  type Referral,
  type ReferralStatus,
} from "@/lib/referrals-store";

type Tab = "received" | "sent";

export default function DoctorReferralsPage() {
  const { data: session } = useSession();
  const { items, setStatus } = useReferrals();
  const [tab, setTab] = useState<Tab>("received");
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | "all">("all");

  const myEmail = (session?.user?.email || "").toLowerCase();
  const myName = session?.user?.name || "";

  const sent = useMemo(
    () =>
      items.filter(
        (r) => r.fromDoctorEmail.toLowerCase() === myEmail || r.fromDoctorName === myName
      ),
    [items, myEmail, myName]
  );

  // Since there's no strict toDoctorEmail on the doctor-identity side yet,
  // we match received by toDoctorName as a pragmatic demo heuristic.
  const received = useMemo(
    () => items.filter((r) => r.toDoctorName === myName),
    [items, myName]
  );

  const list = tab === "received" ? received : sent;
  const filtered = useMemo(
    () => (statusFilter === "all" ? list : list.filter((r) => r.status === statusFilter)),
    [list, statusFilter]
  );

  const counts = {
    pending: list.filter((r) => r.status === "pending").length,
    accepted: list.filter((r) => r.status === "accepted").length,
    declined: list.filter((r) => r.status === "declined").length,
    completed: list.filter((r) => r.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start gap-3">
          <Link
            href="/dashboard/doctor"
            className="rounded-lg p-2 text-gray-400 dark:text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:bg-slate-800 hover:text-gray-600 dark:text-slate-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Referrals</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
              Patients referred to or from your practice
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pending" value={counts.pending} color="text-amber-700" />
          <Stat label="Accepted" value={counts.accepted} color="text-blue-700" />
          <Stat label="Declined" value={counts.declined} color="text-rose-700" />
          <Stat label="Completed" value={counts.completed} color="text-emerald-700" />
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-white dark:bg-slate-900 p-1 shadow-sm ring-1 ring-gray-100">
            <TabBtn active={tab === "received"} onClick={() => setTab("received")}>
              Received ({received.length})
            </TabBtn>
            <TabBtn active={tab === "sent"} onClick={() => setTab("sent")}>
              Sent ({sent.length})
            </TabBtn>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReferralStatus | "all")}
            className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-primary-500"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-xl">
              ↗
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {tab === "received"
                ? "No incoming referrals yet. Colleagues will send patients your way here."
                : "You haven't sent any referrals yet. Open a consultation and tap \"Refer patient\" to start."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <ReferralCard
                key={r.id}
                referral={r}
                tab={tab}
                onStatus={(s) => setStatus(r.id, s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReferralCard({
  referral: r,
  tab,
  onStatus,
}: {
  referral: Referral;
  tab: Tab;
  onStatus: (s: ReferralStatus) => void;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-gray-900 dark:text-slate-100">{r.patientName}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${urgencyStyle(r.urgency)}`}>
              {r.urgency}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyle(r.status)}`}>
              {r.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
            {r.patientEmail}
            {r.patientPhone ? ` · ${r.patientPhone}` : ""}
          </p>
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400">
          {new Date(r.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-gray-600 dark:text-slate-300 sm:grid-cols-2">
        <div className="rounded-lg bg-gray-50 dark:bg-slate-900 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 dark:text-slate-400">From</p>
          <p className="mt-0.5 font-medium text-gray-900 dark:text-slate-100">{r.fromDoctorName}</p>
          <p className="text-gray-500 dark:text-slate-400">{r.fromSpecialty}</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-slate-900 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 dark:text-slate-400">To</p>
          <p className="mt-0.5 font-medium text-gray-900 dark:text-slate-100">{r.toDoctorName}</p>
          <p className="text-gray-500 dark:text-slate-400">{r.toSpecialty}</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 dark:text-slate-400">
          Reason
        </p>
        <p className="mt-0.5 text-sm text-gray-800 dark:text-slate-200">{r.reason}</p>
      </div>

      {r.clinicalNotes && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 dark:text-slate-400">
            Clinical notes
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300">{r.clinicalNotes}</p>
        </div>
      )}

      {tab === "received" && r.status === "pending" && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <button
            onClick={() => onStatus("accepted")}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            ✓ Accept
          </button>
          <button
            onClick={() => onStatus("declined")}
            className="rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
          >
            ✕ Decline
          </button>
        </div>
      )}

      {tab === "received" && r.status === "accepted" && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <button
            onClick={() => onStatus("completed")}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Mark consultation complete
          </button>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-primary-600 text-white" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, color = "text-gray-900 dark:text-slate-100" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm">
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
