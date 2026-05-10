"use client";

// Auto-Roster admin console.
//
// Three tabs:
//   1. Roster — generate draft, view grid, publish
//   2. Staff   — registry + add + leave queue
//   3. Coverage — minimum staffing rules per shift period
//
// Distinct from /admin/roster (manual roster builder against
// hospital staff-store) — this one drives the constraint solver
// in lib/roster/solver.ts and ships its own staff registry.

import { useCallback, useEffect, useMemo, useState } from "react";

type ShiftPeriod = "morning" | "afternoon" | "evening" | "night";
type StaffRole = "doctor" | "nurse" | "receptionist" | "lab_tech" | "pharmacist" | "radiology_tech" | "ot_tech";

interface RosterStaff {
  id: string; name: string; role: StaffRole; specialty?: string;
  email?: string; phone?: string;
  maxHoursPerWeek?: number;
  preferredShifts?: ShiftPeriod[]; blockedShifts?: ShiftPeriod[];
  active: boolean;
}
interface CoverageReq {
  dayClass: "weekday" | "weekend" | "any"; period: ShiftPeriod;
  role: StaffRole; minCount: number; requiredSpecialty?: string;
}
interface CoveragePolicy { requirements: CoverageReq[] }
interface LeaveReq {
  id: string; staffId: string; staffName: string;
  fromDate: string; toDate: string; reason?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
}
interface Assignment {
  staffId: string; staffName: string; role: StaffRole;
  specialty?: string; date: string; period: ShiftPeriod;
}
interface RosterRow {
  id: string; fromDate: string; toDate: string;
  status: "draft" | "published" | "archived";
  assignments: Assignment[];
  workloadSummary: Array<{ staffId: string; staffName: string; role: StaffRole; totalShifts: number; nightShifts: number; weekendShifts: number }>;
  warnings: Array<{ severity: string; message: string }>;
}

const ROLES: StaffRole[] = ["doctor", "nurse", "receptionist", "lab_tech", "pharmacist", "radiology_tech", "ot_tech"];
const ROLE_LABEL: Record<StaffRole, string> = {
  doctor: "Doctor", nurse: "Nurse", receptionist: "Receptionist",
  lab_tech: "Lab tech", pharmacist: "Pharmacist", radiology_tech: "Radiology", ot_tech: "OT tech",
};
const PERIODS: ShiftPeriod[] = ["morning", "afternoon", "evening", "night"];
const PERIOD_LABEL: Record<ShiftPeriod, string> = { morning: "AM", afternoon: "PM", evening: "Eve", night: "Night" };
const PERIOD_TONE: Record<ShiftPeriod, string> = {
  morning: "bg-amber-100 text-amber-900",
  afternoon: "bg-sky-100 text-sky-900",
  evening: "bg-violet-100 text-violet-900",
  night: "bg-slate-700 text-slate-100",
};
const STATUS_PILL: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  archived: "bg-slate-200 text-slate-600",
};

function nextMondayIso(): string {
  const d = new Date();
  const dow = d.getDay();
  const diff = ((1 - dow) + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function plusDays(iso: string, n: number): string {
  return new Date(new Date(iso).getTime() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function AdminAutoRosterPage() {
  const [tab, setTab] = useState<"roster" | "staff" | "coverage">("roster");
  const [staff, setStaff] = useState<RosterStaff[]>([]);
  const [policy, setPolicy] = useState<CoveragePolicy | null>(null);
  const [leaves, setLeaves] = useState<LeaveReq[]>([]);
  const [rosters, setRosters] = useState<RosterRow[]>([]);
  const [activeRoster, setActiveRoster] = useState<RosterRow | null>(null);
  const [draftRange, setDraftRange] = useState({ fromDate: nextMondayIso(), toDate: plusDays(nextMondayIso(), 13) });
  const [staffForm, setStaffForm] = useState({ name: "", role: "doctor" as StaffRole, specialty: "", email: "", phone: "" });
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ staffId: "", fromDate: "", toDate: "", reason: "" });
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [r1, r2, r3, r4] = await Promise.all([
      fetch("/api/roster/staff", { cache: "no-store" }),
      fetch("/api/roster/policy", { cache: "no-store" }),
      fetch("/api/roster/leave", { cache: "no-store" }),
      fetch("/api/roster/rosters", { cache: "no-store" }),
    ]);
    if (r1.ok) setStaff((await r1.json()).staff || []);
    if (r2.ok) setPolicy((await r2.json()).policy);
    if (r3.ok) setLeaves((await r3.json()).requests || []);
    if (r4.ok) {
      const list = (await r4.json()).rosters as RosterRow[];
      setRosters(list || []);
      if (list && list.length > 0) setActiveRoster((prev) => prev ? list.find((x) => x.id === prev.id) || list[0] : list[0]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addStaffMember = async () => {
    if (!staffForm.name.trim()) return;
    const r = await fetch("/api/roster/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(staffForm) });
    if (r.ok) { setToast({ kind: "ok", text: "Staff added." }); setShowStaffForm(false); setStaffForm({ name: "", role: "doctor", specialty: "", email: "", phone: "" }); await load(); }
  };

  const fileLeave = async () => {
    if (!leaveForm.staffId || !leaveForm.fromDate || !leaveForm.toDate) return;
    const r = await fetch("/api/roster/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(leaveForm) });
    if (r.ok) { setToast({ kind: "ok", text: "Leave filed." }); setShowLeaveForm(false); setLeaveForm({ staffId: "", fromDate: "", toDate: "", reason: "" }); await load(); }
  };

  const reviewLeave = async (id: string, decision: "approved" | "rejected") => {
    const r = await fetch("/api/roster/leave", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision }) });
    if (r.ok) { setToast({ kind: "ok", text: `Leave ${decision}.` }); await load(); }
  };

  const generateDraft = async () => {
    const r = await fetch("/api/roster/rosters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "draft", ...draftRange }) });
    if (r.ok) {
      const d = await r.json();
      setToast({ kind: "ok", text: "Draft generated." });
      setActiveRoster(d.roster);
      await load();
    } else {
      const body = await r.json().catch(() => ({}));
      setToast({ kind: "err", text: `Failed: ${body.error || "unknown"}` });
    }
  };

  const publishActive = async () => {
    if (!activeRoster) return;
    const r = await fetch("/api/roster/rosters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", id: activeRoster.id }) });
    if (r.ok) { setToast({ kind: "ok", text: "Roster published." }); await load(); }
  };

  const setMin = async (req: CoverageReq, newMin: number) => {
    if (!policy) return;
    const next = policy.requirements.map((r) => r.dayClass === req.dayClass && r.period === req.period && r.role === req.role ? { ...r, minCount: newMin } : r);
    const r = await fetch("/api/roster/policy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requirements: next }) });
    if (r.ok) setPolicy((await r.json()).policy);
  };

  const dates = useMemo(() => {
    if (!activeRoster) return [] as string[];
    const out: string[] = [];
    let t = new Date(activeRoster.fromDate).getTime();
    const end = new Date(activeRoster.toDate).getTime();
    while (t <= end) { out.push(new Date(t).toISOString().slice(0, 10)); t += 24 * 60 * 60 * 1000; }
    return out;
  }, [activeRoster]);

  const cellAssignments = useCallback((date: string, period: ShiftPeriod) => activeRoster?.assignments.filter((a) => a.date === date && a.period === period) || [], [activeRoster]);

  return (
    <div>
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Auto-Roster</h2>
        <p className="mt-1 text-sm text-gray-500">
          Coverage rules + staff registry + leave window → solver builds a 2-week roster respecting fairness, rest gaps, and specialty mix.
        </p>
      </div>

      <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1">
        {(["roster", "staff", "coverage"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>{t}</button>
        ))}
      </div>

      {tab === "roster" && (
        <div className="space-y-4">
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">From</label>
                <input type="date" value={draftRange.fromDate} onChange={(e) => setDraftRange({ ...draftRange, fromDate: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">To</label>
                <input type="date" value={draftRange.toDate} onChange={(e) => setDraftRange({ ...draftRange, toDate: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              </div>
              <button onClick={generateDraft} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Generate draft</button>
              {rosters.length > 0 && (
                <select value={activeRoster?.id || ""} onChange={(e) => setActiveRoster(rosters.find((r) => r.id === e.target.value) || null)} className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  {rosters.map((r) => <option key={r.id} value={r.id}>{r.fromDate} → {r.toDate} ({r.status})</option>)}
                </select>
              )}
            </div>
          </section>

          {activeRoster ? (
            <>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    {activeRoster.fromDate} — {activeRoster.toDate}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${STATUS_PILL[activeRoster.status]}`}>{activeRoster.status}</span>
                  </p>
                  <div className="flex gap-2">
                    {activeRoster.status === "draft" && (
                      <button onClick={publishActive} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Publish</button>
                    )}
                  </div>
                </div>
                {activeRoster.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {activeRoster.warnings.slice(0, 8).map((w, i) => (
                      <li key={i} className={`rounded-md px-2 py-1 text-xs ${w.severity === "critical" ? "bg-rose-50 text-rose-800" : w.severity === "warn" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-800"}`}>
                        {w.severity === "critical" ? "🚫" : w.severity === "warn" ? "⚠" : "ℹ"} {w.message}
                      </li>
                    ))}
                    {activeRoster.warnings.length > 8 && <li className="text-xs text-slate-500">+{activeRoster.warnings.length - 8} more…</li>}
                  </ul>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-white p-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Date</th>
                      {PERIODS.map((p) => <th key={p} className="p-2 text-center text-[10px] font-bold uppercase tracking-wider">{PERIOD_LABEL[p]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((date) => {
                      const dow = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
                      const wk = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                      return (
                        <tr key={date} className={wk ? "bg-rose-50/40" : ""}>
                          <td className="sticky left-0 bg-inherit p-2">
                            <p className="font-bold text-slate-900">{dow}</p>
                            <p className="text-[10px] text-slate-500">{date.slice(5)}</p>
                          </td>
                          {PERIODS.map((p) => {
                            const cells = cellAssignments(date, p);
                            return (
                              <td key={p} className="border border-slate-100 p-1 align-top">
                                <div className={`min-h-[42px] rounded-md p-1 ${PERIOD_TONE[p]}`}>
                                  {cells.length === 0 ? (
                                    <p className="text-center text-[10px] opacity-70">—</p>
                                  ) : (
                                    <ul className="space-y-0.5">
                                      {cells.map((a, i) => (
                                        <li key={i} className="text-[10px] leading-tight"><strong>{a.staffName}</strong> <span className="opacity-70">{a.role[0].toUpperCase()}</span></li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {activeRoster.workloadSummary.length > 0 && (
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-bold text-slate-900">Workload distribution</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left p-1">Staff</th>
                        <th className="text-left p-1">Role</th>
                        <th className="text-right p-1">Total</th>
                        <th className="text-right p-1">Night</th>
                        <th className="text-right p-1">Weekend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRoster.workloadSummary.map((w) => (
                        <tr key={w.staffId} className="border-t border-slate-100">
                          <td className="p-1 font-semibold">{w.staffName}</td>
                          <td className="p-1 text-slate-500">{ROLE_LABEL[w.role]}</td>
                          <td className="p-1 text-right font-mono">{w.totalShifts}</td>
                          <td className="p-1 text-right font-mono text-violet-700">{w.nightShifts}</td>
                          <td className="p-1 text-right font-mono text-rose-700">{w.weekendShifts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">No rosters yet — generate one above.</p>
          )}
        </div>
      )}

      {tab === "staff" && (
        <div className="space-y-4">
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Active staff ({staff.length})</p>
              <div className="flex gap-2">
                <button onClick={() => setShowLeaveForm(true)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">+ File leave</button>
                <button onClick={() => setShowStaffForm(true)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">+ Add staff</button>
              </div>
            </div>
            {staff.length === 0 ? (
              <p className="text-sm text-slate-400">No staff yet.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {staff.map((s) => (
                  <li key={s.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-[11px] text-slate-500">{ROLE_LABEL[s.role]}{s.specialty ? ` · ${s.specialty}` : ""}</p>
                    {(s.email || s.phone) && <p className="text-[10px] text-slate-400">{s.email}{s.phone ? ` · ${s.phone}` : ""}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-900">Leave requests ({leaves.length})</p>
            {leaves.length === 0 ? (
              <p className="text-sm text-slate-400">None.</p>
            ) : (
              <ul className="space-y-2">
                {leaves.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{l.staffName} · {l.fromDate} → {l.toDate}</p>
                      {l.reason && <p className="text-xs italic text-slate-600">&ldquo;{l.reason}&rdquo;</p>}
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">{l.status}</p>
                    </div>
                    {l.status === "pending" && (
                      <div className="flex gap-1">
                        <button onClick={() => reviewLeave(l.id, "approved")} className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">Approve</button>
                        <button onClick={() => reviewLeave(l.id, "rejected")} className="rounded-md border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600">Reject</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "coverage" && policy && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-bold text-slate-900">Minimum staffing rules ({policy.requirements.length})</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="p-2 text-left">Day class</th>
                <th className="p-2 text-left">Period</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Specialty</th>
                <th className="p-2 text-right">Min</th>
              </tr>
            </thead>
            <tbody>
              {policy.requirements.map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-2">{r.dayClass}</td>
                  <td className="p-2"><span className={`rounded px-2 py-0.5 ${PERIOD_TONE[r.period]}`}>{PERIOD_LABEL[r.period]}</span></td>
                  <td className="p-2">{ROLE_LABEL[r.role]}</td>
                  <td className="p-2 text-slate-500">{r.requiredSpecialty || "—"}</td>
                  <td className="p-2 text-right">
                    <input type="number" min={0} max={20} defaultValue={r.minCount} onBlur={(e) => { const n = Number(e.target.value); if (n !== r.minCount) setMin(r, n); }} className="w-14 rounded border border-slate-300 px-1 text-right" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showStaffForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowStaffForm(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Add staff</h3>
            <div className="mt-3 space-y-2">
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Name" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
              <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as StaffRole })}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Specialty (optional)" value={staffForm.specialty} onChange={(e) => setStaffForm({ ...staffForm, specialty: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Phone" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowStaffForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button onClick={addStaffMember} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Add</button>
            </div>
          </div>
        </div>
      )}

      {showLeaveForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowLeaveForm(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">File leave</h3>
            <div className="mt-3 space-y-2">
              <select value={leaveForm.staffId} onChange={(e) => setLeaveForm({ ...leaveForm, staffId: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Pick staff…</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({ROLE_LABEL[s.role]})</option>)}
              </select>
              <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={leaveForm.fromDate} onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })} />
              <input type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={leaveForm.toDate} onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })} />
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Reason (optional)" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowLeaveForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button onClick={fileLeave} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">File</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
