"use client";

// CTMS subject enrollment + status transitions.

import { useCallback, useEffect, useState } from "react";

interface Protocol { id: string; protocolNumber: string; title: string; status: string }
type SubjectStatus = "screening" | "enrolled" | "active" | "completed" | "withdrawn" | "lost_to_followup";
interface Subject {
  id: string;
  protocolId: string;
  subjectId: string;
  patientEmail: string;
  status: SubjectStatus;
  enrolledOn?: string;
  exitedAt?: string;
  exitReason?: string;
  baselineDate?: string;
  createdAt: string;
}

const STATUS_PALETTE: Record<SubjectStatus, string> = {
  screening: "bg-sky-100 text-sky-800",
  enrolled: "bg-indigo-100 text-indigo-800",
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-200 text-slate-700",
  withdrawn: "bg-rose-100 text-rose-800",
  lost_to_followup: "bg-amber-100 text-amber-900",
};

export default function CtmsSubjectsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterProtocol, setFilterProtocol] = useState<string>("");
  const [enrolling, setEnrolling] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ctms/protocols").then((r) => r.json()).then((j) => setProtocols(j.protocols || []));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterProtocol ? `/api/ctms/subjects?protocolId=${filterProtocol}` : "/api/ctms/subjects";
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      setSubjects(j.subjects || []);
    } finally { setLoading(false); }
  }, [filterProtocol]);
  useEffect(() => { refresh(); }, [refresh]);

  const transition = async (subjectRowId: string, status: SubjectStatus) => {
    const exitReason = (status === "withdrawn" || status === "lost_to_followup") ? prompt("Exit reason?") || undefined : undefined;
    await fetch(`/api/ctms/subjects?id=${encodeURIComponent(subjectRowId)}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, exitReason }),
    });
    refresh();
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">CTMS · Subjects</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Trial subjects</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Screening → enrolled → active → completed. Withdrawn / lost-to-followup capture exit reasons.
          </p>
        </div>
        <div className="flex gap-2">
          <select value={filterProtocol} onChange={(e) => setFilterProtocol(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="">All protocols</option>
            {protocols.map((p) => <option key={p.id} value={p.id}>{p.protocolNumber}</option>)}
          </select>
          <button onClick={() => setEnrolling(true)}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-bold text-white">
            + Enrol
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading && subjects.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : subjects.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No subjects enrolled.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {subjects.map((s) => {
              const protocol = protocols.find((p) => p.id === s.protocolId);
              return (
                <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{s.subjectId}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[s.status]}`}>
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      Protocol: {protocol?.protocolNumber || s.protocolId} · Patient: {s.patientEmail}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Created {new Date(s.createdAt).toLocaleDateString()}
                      {s.enrolledOn && <> · Enrolled {new Date(s.enrolledOn).toLocaleDateString()}</>}
                      {s.exitedAt && <> · Exited {new Date(s.exitedAt).toLocaleDateString()} ({s.exitReason || "no reason"})</>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.status === "screening" && <Btn label="Enrol" onClick={() => transition(s.id, "enrolled")} color="bg-indigo-600" />}
                    {s.status === "enrolled" && <Btn label="Activate" onClick={() => transition(s.id, "active")} color="bg-emerald-600" />}
                    {s.status === "active" && <Btn label="Complete" onClick={() => transition(s.id, "completed")} color="bg-slate-600" />}
                    {(s.status === "screening" || s.status === "enrolled" || s.status === "active") && (
                      <>
                        <Btn label="Withdraw" onClick={() => transition(s.id, "withdrawn")} color="bg-rose-600" />
                        <Btn label="Lost FU" onClick={() => transition(s.id, "lost_to_followup")} color="bg-amber-600" />
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {enrolling && (
        <EnrolModal protocols={protocols} onClose={() => setEnrolling(false)} onDone={() => { setEnrolling(false); refresh(); }} />
      )}
    </main>
  );
}

function EnrolModal({ protocols, onClose, onDone }: { protocols: Protocol[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    protocolId: protocols[0]?.id || "",
    subjectId: "",
    patientEmail: "",
    baselineDate: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/ctms/subjects", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, baselineDate: form.baselineDate || undefined }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      onDone();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Enrol subject</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Protocol</span>
            <select value={form.protocolId} onChange={(e) => setForm({ ...form, protocolId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
              {protocols.map((p) => <option key={p.id} value={p.id}>{p.protocolNumber} — {p.title}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Subject ID (trial-issued)</span>
            <input value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} placeholder="e.g. 001-S-014"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Patient email (EMR link)</span>
            <input value={form.patientEmail} onChange={(e) => setForm({ ...form, patientEmail: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Baseline date (optional)</span>
            <input type="date" value={form.baselineDate} onChange={(e) => setForm({ ...form, baselineDate: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </label>
          {error && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Cancel
            </button>
            <button onClick={submit} disabled={busy || !form.protocolId || !form.subjectId || !form.patientEmail}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
              {busy ? "Enrolling…" : "Enrol"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Btn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return <button onClick={onClick} className={`rounded-md ${color} px-2 py-1 text-[11px] font-bold text-white`}>{label}</button>;
}
