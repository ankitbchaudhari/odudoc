"use client";

// Vaccination tracker.
//
// Pick a subject (yourself, or a child by name + DOB), see the
// recommended schedule with status pills (received/due/upcoming/
// overdue), tap to mark a dose received with the date + clinic
// note. Status calculated server-side off the schedule + recorded
// doses; the page just renders.

import { useCallback, useEffect, useMemo, useState } from "react";

type DoseStatus = "received" | "due" | "upcoming" | "overdue";

interface ScheduleRow {
  id: string;
  vaccine: string;
  doseLabel: string;
  category: "child" | "adult" | "travel";
  dueAtDays: number;
  windowDays?: number;
  note?: string;
  dueDate: string;
  status: DoseStatus;
  receivedDate?: string;
  notes?: string;
}

interface Subject { subjectKey: string; subjectName: string; subjectDob: string; }

const STATUS_TONE: Record<DoseStatus, string> = {
  received: "border-emerald-200 bg-emerald-50 text-emerald-800",
  due: "border-indigo-200 bg-indigo-50 text-indigo-800",
  upcoming: "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300",
  overdue: "border-rose-300 bg-rose-50 text-rose-800",
};
const STATUS_LABEL: Record<DoseStatus, string> = {
  received: "Received", due: "Due now", upcoming: "Upcoming", overdue: "Overdue",
};
const CATEGORY_LABEL = { child: "Child", adult: "Adult", travel: "Travel" };
const CATEGORY_EMOJI = { child: "👶", adult: "🧑", travel: "✈️" };

export default function VaccinationsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | DoseStatus | "child" | "adult" | "travel">("all");
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    const r = await fetch("/api/vaccinations", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setSubjects(d.subjects || []);
      if (!activeSubject && d.subjects?.length) setActiveSubject(d.subjects[0]);
    }
    setLoading(false);
  }, [activeSubject]);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);

  const loadSchedule = useCallback(async (s: Subject) => {
    const r = await fetch(`/api/vaccinations?subjectKey=${encodeURIComponent(s.subjectKey)}&dob=${encodeURIComponent(s.subjectDob)}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setSchedule(d.schedule || []);
    }
  }, []);

  useEffect(() => { if (activeSubject) loadSchedule(activeSubject); }, [activeSubject, loadSchedule]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: schedule.length, received: 0, due: 0, upcoming: 0, overdue: 0, child: 0, adult: 0, travel: 0 };
    for (const r of schedule) { c[r.status]++; c[r.category]++; }
    return c;
  }, [schedule]);

  const filtered = useMemo(() => {
    if (filter === "all") return schedule;
    if (filter === "received" || filter === "due" || filter === "upcoming" || filter === "overdue") {
      return schedule.filter((r) => r.status === filter);
    }
    return schedule.filter((r) => r.category === filter);
  }, [schedule, filter]);

  const markDose = async (row: ScheduleRow, receivedDate: string, notes?: string) => {
    if (!activeSubject) return;
    await fetch("/api/vaccinations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectKey: activeSubject.subjectKey,
        subjectName: activeSubject.subjectName,
        subjectDob: activeSubject.subjectDob,
        vaccineId: row.id,
        receivedDate, notes,
      }),
    });
    await loadSchedule(activeSubject);
    setMarkingId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-start gap-4">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white p-3 rounded-2xl shadow-lg shadow-cyan-500/30 text-2xl">
          💉
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-300 dark:to-blue-300 bg-clip-text text-transparent">Vaccinations</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Track doses against the Indian National Immunization Schedule. Add a subject to see what&apos;s due.
          </p>
        </div>
      </div>

      {/* Subject picker */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {subjects.map((s) => (
          <button
            key={s.subjectKey}
            onClick={() => setActiveSubject(s)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeSubject?.subjectKey === s.subjectKey ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-cyan-300 hover:shadow-md"
            }`}
          >
            {s.subjectName}
            <span className={`text-[10px] ${activeSubject?.subjectKey === s.subjectKey ? "text-white/80" : "text-slate-400"}`}>
              DOB {new Date(s.subjectDob).toLocaleDateString()}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowSubjectForm((v) => !v)}
          className="rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-300 ring-1 ring-dashed ring-cyan-300 hover:bg-cyan-50 dark:hover:bg-slate-800 transition"
        >
          + Add subject
        </button>
      </div>

      {showSubjectForm && (
        <SubjectForm
          onAdded={(s) => {
            setSubjects((cur) => [...cur, s]);
            setActiveSubject(s);
            setShowSubjectForm(false);
          }}
        />
      )}

      {loading && <p className="rounded-2xl bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">Loading…</p>}
      {!loading && subjects.length === 0 && !showSubjectForm && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-10 text-center shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-950/40 dark:to-blue-950/40 flex items-center justify-center text-4xl">💉</div>
          <p className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">Add a subject to start tracking</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">You can track yourself plus each family member separately.</p>
          <button onClick={() => setShowSubjectForm(true)} className="mt-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 rounded-xl px-5 py-2.5 text-sm font-bold transition">+ Add subject</button>
        </div>
      )}

      {activeSubject && schedule.length > 0 && (
        <>
          {/* Stat strip */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Received" value={counts.received} tone="ok" />
            <Stat label="Due now" value={counts.due} tone="info" />
            <Stat label="Overdue" value={counts.overdue} tone="bad" />
            <Stat label="Upcoming" value={counts.upcoming} tone="neutral" />
          </div>

          {/* Filter chips */}
          <div className="mb-4 flex flex-wrap gap-2">
            {(["all", "due", "overdue", "upcoming", "received", "child", "adult", "travel"] as const).map((k) => (
              <Chip key={k} active={filter === k} onClick={() => setFilter(k)} count={counts[k]}>
                {k === "all" ? "All" : k === "child" || k === "adult" || k === "travel" ? `${CATEGORY_EMOJI[k]} ${CATEGORY_LABEL[k]}` : STATUS_LABEL[k]}
              </Chip>
            ))}
          </div>

          {/* Rows */}
          <ul className="space-y-2">
            {filtered.map((row) => (
              <li key={row.id} className={`rounded-2xl p-4 shadow-sm hover:shadow-md transition ring-1 ${row.status === "overdue" ? "ring-rose-200 bg-gradient-to-r from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-900" : row.status === "due" ? "ring-cyan-200 bg-gradient-to-r from-cyan-50 to-white dark:from-cyan-950/30 dark:to-slate-900" : "ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{row.vaccine}</p>
                      <span className="text-xs text-slate-500 dark:text-slate-400">· {row.doseLabel}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                      <span className="text-[10px] text-slate-400">{CATEGORY_EMOJI[row.category]} {CATEGORY_LABEL[row.category]}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {row.status === "received" && row.receivedDate
                        ? <>Given on <b>{new Date(row.receivedDate).toLocaleDateString()}</b></>
                        : <>Due <b>{new Date(row.dueDate).toLocaleDateString()}</b></>}
                    </p>
                    {row.note && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 italic">{row.note}</p>}
                    {row.notes && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Note: {row.notes}</p>}
                  </div>
                  {row.status !== "received" ? (
                    <button onClick={() => setMarkingId(row.id)} className="flex-none rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition">Mark received</button>
                  ) : (
                    <button onClick={() => setMarkingId(row.id)} className="flex-none rounded-lg bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 ring-1 ring-slate-300">Edit</button>
                  )}
                </div>
                {markingId === row.id && (
                  <MarkForm row={row} onCancel={() => setMarkingId(null)} onSave={(date, notes) => markDose(row, date, notes)} />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "info" | "bad" | "neutral" }) {
  const cls =
    tone === "ok" ? "ring-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 dark:ring-emerald-900"
    : tone === "info" ? "ring-cyan-200 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-slate-900 dark:ring-cyan-900"
    : tone === "bad" ? "ring-rose-200 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-900 dark:ring-rose-900"
    : "ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900";
  return (
    <div className={`rounded-2xl p-3 ring-1 shadow-sm ${cls}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
    </div>
  );
}

function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: React.ReactNode; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-cyan-300 hover:shadow-sm"}`}
    >
      {children}
      <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>{count}</span>
    </button>
  );
}

function SubjectForm({ onAdded }: { onAdded: (s: Subject) => void }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (!name.trim()) { setError("Add a name."); return; }
    if (!dob) { setError("Add date of birth."); return; }
    const subjectKey = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    onAdded({ subjectKey, subjectName: name.trim(), subjectDob: dob });
  };

  return (
    <div className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">New subject</p>
      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder='Yourself, "Aarav", "Mom"…' className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Date of birth
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal" />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={submit} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 rounded-xl px-5 py-2.5 text-sm font-bold transition">Add</button>
      </div>
    </div>
  );
}

function MarkForm({ row, onCancel, onSave }: { row: ScheduleRow; onCancel: () => void; onSave: (date: string, notes?: string) => void }) {
  const [date, setDate] = useState(row.receivedDate || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(row.notes || "");
  return (
    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Date received
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Notes (optional)
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Clinic, batch, lot…" className="mt-1 w-full rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-normal" />
        </label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">Cancel</button>
        <button onClick={() => onSave(date, notes.trim() || undefined)} className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition">Save</button>
      </div>
    </div>
  );
}
