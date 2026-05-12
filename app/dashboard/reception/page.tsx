"use client";

// Reception dashboard.
//
// Single-screen operating console for the front desk: today's queue
// with one-click triage / check-in / check-out actions, KPI tiles,
// quick contacts, and an inline new-admission form. Status pills come
// from the canonical lib/clinical-tones palette so the colours match
// every other dashboard.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { tone } from "@/lib/clinical-tones";

type AdmissionStatus =
  | "scheduled" | "checked_in" | "in_consult" | "completed"
  | "admitted" | "in_or" | "post_op" | "discharged"
  | "transferred" | "cancelled" | "no_show";

type Triage = "red" | "yellow" | "green" | "black" | "";

interface Admission {
  id: string;
  patientId: string;
  patientName: string;
  consultingDoctorEmail?: string;
  department?: string;
  location?: string;
  reasonForVisit?: string;
  triage?: Triage;
  status: AdmissionStatus;
  scheduledAt?: string;
  checkedInAt?: string;
  notes?: string;
  updatedAt: string;
}

interface Counts {
  scheduled: number; checked_in: number; in_consult: number;
  completed: number; admitted: number; cancelled: number; no_show: number;
}

const TRIAGE_TONES: Record<Exclude<Triage, "">, "triage_red" | "triage_yellow" | "triage_green" | "triage_black"> = {
  red: "triage_red",
  yellow: "triage_yellow",
  green: "triage_green",
  black: "triage_black",
};

export default function ReceptionDashboard() {
  const [rows, setRows] = useState<Admission[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AdmissionStatus | "All">("All");
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newRow, setNewRow] = useState({
    patientId: "",
    patientName: "",
    department: "OPD",
    location: "",
    reasonForVisit: "",
    triage: "green" as Triage,
  });

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ today: "1" });
    if (filter !== "All") sp.set("status", filter);
    if (search.trim()) sp.set("search", search.trim());
    try {
      const r = await fetch(`/api/emr/admissions?${sp}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setRows(d.admissions || []);
        setCounts(d.counts || null);
      }
    } catch {
      /* ignore */
    }
  }, [filter, search]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const flip = async (id: string, status: AdmissionStatus) => {
    setBusy(true);
    await fetch(`/api/emr/admissions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setBusy(false);
  };

  /** Cancel an admission mid-flow. Always asks for confirmation +
   *  an optional reason that gets appended to the row's notes so
   *  there's an audit trail of why the patient bailed. Works from
   *  any non-terminal state (scheduled / checked_in / in_consult /
   *  completed not yet discharged / admitted). */
  const cancelMidFlow = async (id: string, currentNotes?: string) => {
    if (!confirm("Cancel this admission? This will release the slot.")) return;
    const reason = window.prompt("Reason for cancellation (optional):") || "";
    setBusy(true);
    const cancelStamp = `[Cancelled ${new Date().toLocaleString()}${reason ? ` — ${reason}` : ""}]`;
    const notes = [currentNotes, cancelStamp].filter(Boolean).join("\n");
    await fetch(`/api/emr/admissions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "cancelled", notes }),
    });
    await load();
    setBusy(false);
  };

  const setTriage = async (id: string, triage: Triage) => {
    setBusy(true);
    await fetch(`/api/emr/admissions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ triage }),
    });
    await load();
    setBusy(false);
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRow.patientId || !newRow.patientName) return;
    setBusy(true);
    await fetch("/api/emr/admissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...newRow, scheduledAt: new Date().toISOString() }),
    });
    setNewRow({
      patientId: "",
      patientName: "",
      department: "OPD",
      location: "",
      reasonForVisit: "",
      triage: "green",
    });
    setShowNew(false);
    await load();
    setBusy(false);
  };

  const kpis = useMemo(
    () => [
      { key: "scheduled", label: "Scheduled" },
      { key: "checked_in", label: "Checked in" },
      { key: "in_consult", label: "In consult" },
      { key: "completed", label: "Completed" },
      { key: "admitted", label: "Admitted" },
      { key: "no_show", label: "No-show" },
    ] as Array<{ key: keyof Counts; label: string }>,
    [],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/40 to-sky-50/40">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-600 p-8 text-white shadow-xl">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                Front desk · Today
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Reception console</h1>
              <p className="mt-2 max-w-md text-sm text-white/90">
                Schedule, triage, check patients in and out, and keep doctors,
                nurses, and labs in sync. Auto-refreshes every 30s.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNew((v) => !v)}
                className="rounded-full bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-cyan-700 shadow-md transition hover:-translate-y-0.5"
              >
                + New admission
              </button>
              <button
                onClick={load}
                className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
        </div>

        {/* KPI tiles */}
        {counts && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {kpis.map((k) => {
              const v = counts[k.key];
              const T = tone(k.key === "scheduled" ? "scheduled"
                : k.key === "checked_in" ? "checked_in"
                : k.key === "in_consult" ? "in_consult"
                : k.key === "completed" ? "completed"
                : k.key === "admitted" ? "admitted"
                : "no_show");
              return (
                <div key={k.key} className="rounded-2xl border border-white/60 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{T.emoji}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                      {k.label}
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{v}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* New admission form */}
        {showNew && (
          <form onSubmit={submitNew} className="mb-6 rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Schedule a patient</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Patient ID" required value={newRow.patientId} onChange={(v) => setNewRow({ ...newRow, patientId: v })} />
              <Field label="Patient name" required value={newRow.patientName} onChange={(v) => setNewRow({ ...newRow, patientName: v })} />
              <Field label="Department" value={newRow.department} onChange={(v) => setNewRow({ ...newRow, department: v })} placeholder="OPD / ER / Lab" />
              <Field label="Location" value={newRow.location} onChange={(v) => setNewRow({ ...newRow, location: v })} placeholder="OPD-1 / Bed 12" />
              <Field label="Reason" value={newRow.reasonForVisit} onChange={(v) => setNewRow({ ...newRow, reasonForVisit: v })} placeholder="Fever, follow-up, …" />
              <div>
                <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Triage</label>
                <select
                  value={newRow.triage}
                  onChange={(e) => setNewRow({ ...newRow, triage: e.target.value as Triage })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm"
                >
                  <option value="green">🟩 Routine</option>
                  <option value="yellow">🟨 Urgent</option>
                  <option value="red">🟥 Immediate</option>
                  <option value="black">⬛ Expectant</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Schedule"}
              </button>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name / location / reason…"
            className="min-w-[260px] flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as AdmissionStatus | "All")}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm"
          >
            {(["All", "scheduled", "checked_in", "in_consult", "completed", "admitted", "cancelled", "no_show"] as Array<AdmissionStatus | "All">).map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>

        {/* Queue */}
        <div className="space-y-3">
          {rows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 text-center shadow-sm">
              <span className="text-4xl">🗒️</span>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No admissions in this filter today.</p>
            </div>
          ) : rows.map((a) => {
            const triageTone = a.triage
              ? TRIAGE_TONES[a.triage as Exclude<Triage, "">]
              : null;
            return (
              <article
                key={a.id}
                className={`overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md ${triageTone ? tone(triageTone).row : "border-slate-100"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{a.patientName}</p>
                      <StatusBadge status={a.status} />
                      {triageTone && <StatusBadge status={triageTone} />}
                      {a.location && (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          📍 {a.location}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {a.department || "—"}
                      {a.reasonForVisit && <> · {a.reasonForVisit}</>}
                      {a.scheduledAt && <> · {new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
                    </p>
                    {a.notes && <p className="mt-1 text-[11px] italic text-slate-500 dark:text-slate-400">{a.notes}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Triage quick-set */}
                    <div className="flex gap-1">
                      {(["red", "yellow", "green"] as Exclude<Triage, "" | "black">[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTriage(a.id, t)}
                          className={`h-7 w-7 rounded-md text-xs transition hover:scale-105 ${tone(TRIAGE_TONES[t]).dot} ${a.triage === t ? "ring-2 ring-offset-1 ring-slate-700" : "opacity-60 hover:opacity-100"}`}
                          title={`Set triage: ${t}`}
                        />
                      ))}
                    </div>
                    {/* Status flips */}
                    {a.status === "scheduled" && (
                      <>
                        <Btn onClick={() => flip(a.id, "checked_in")}>Check in</Btn>
                        <Btn onClick={() => flip(a.id, "no_show")} tone="ghost">No-show</Btn>
                      </>
                    )}
                    {a.status === "checked_in" && (
                      <Btn onClick={() => flip(a.id, "in_consult")}>Send to doctor</Btn>
                    )}
                    {a.status === "in_consult" && (
                      <Btn onClick={() => flip(a.id, "completed")}>Mark done</Btn>
                    )}
                    {a.status === "completed" && (
                      <>
                        <Btn onClick={() => flip(a.id, "admitted")}>Admit</Btn>
                        <Btn onClick={() => flip(a.id, "discharged")} tone="ghost">Discharge</Btn>
                      </>
                    )}
                    {a.status === "admitted" && (
                      <Btn onClick={() => flip(a.id, "discharged")}>Discharge</Btn>
                    )}
                    {/* Cancel works at any non-terminal state. Asks for
                        confirmation + reason so the audit trail is rich. */}
                    {a.status !== "cancelled" && a.status !== "discharged" && a.status !== "no_show" && (
                      <Btn onClick={() => cancelMidFlow(a.id, a.notes)} tone="danger">Cancel</Btn>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Quick contacts */}
        <section className="mt-10 rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Quick contacts</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Maintain this list under <Link href="/dashboard/doctor/staff" className="text-cyan-600 hover:underline">Staff</Link>; reception keeps it visible for inquiries.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            <li className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
              <span className="text-lg">📞</span> <span className="font-semibold text-slate-900 dark:text-slate-100">Admin</span>
              <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">Set in Staff settings</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
              <span className="text-lg">🩺</span> <span className="font-semibold text-slate-900 dark:text-slate-100">On-call doctor</span>
              <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">Set in Staff settings</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
              <span className="text-lg">🧪</span> <span className="font-semibold text-slate-900 dark:text-slate-100">Laboratory</span>
              <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">Ext / direct line</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
              <span className="text-lg">💊</span> <span className="font-semibold text-slate-900 dark:text-slate-100">Pharmacy</span>
              <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">Ext / direct line</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, required, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200"
      />
    </label>
  );
}

function Btn({
  onClick, children, tone: t = "primary",
}: { onClick: () => void; children: React.ReactNode; tone?: "primary" | "ghost" | "danger" }) {
  const cls = t === "primary"
    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm hover:-translate-y-0.5 hover:shadow"
    : t === "danger"
      ? "border border-rose-200 bg-white dark:bg-slate-900 text-rose-700 hover:bg-rose-50"
      : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900";
  return (
    <button onClick={onClick} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${cls}`}>
      {children}
    </button>
  );
}
