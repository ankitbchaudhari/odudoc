"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type {
  OperationTheatre,
  OTType,
  SurgeryBooking,
  SurgeryStatus,
  AnesthesiaType,
  SurgeryTeamMember,
  PreOpChecklist,
} from "@/lib/hospital/surgery-store";
import type { Patient } from "@/lib/patients-store";

const OT_TYPES: OTType[] = [
  "major",
  "minor",
  "emergency",
  "ophthalmic",
  "obstetric",
  "dental",
  "other",
];
const STATUSES: SurgeryStatus[] = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "postponed",
];
const ANES: AnesthesiaType[] = [
  "general",
  "regional",
  "spinal",
  "epidural",
  "local",
  "mac",
  "none",
];
const PRIORITIES: Array<SurgeryBooking["priority"]> = [
  "elective",
  "urgent",
  "emergency",
];

const STATUS_COLOR: Record<SurgeryStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-200 text-slate-600",
  postponed: "bg-purple-100 text-purple-700",
};

interface BookingForm {
  patientId: string;
  otId: string;
  procedureName: string;
  procedureCode: string;
  priority: SurgeryBooking["priority"];
  anesthesiaType: AnesthesiaType;
  primarySurgeon: string;
  teamText: string; // "role:name\nrole:name"
  scheduledStart: string;
  scheduledEnd: string;
  estimatedCost: string;
}

const EMPTY_BOOKING: BookingForm = {
  patientId: "",
  otId: "",
  procedureName: "",
  procedureCode: "",
  priority: "elective",
  anesthesiaType: "general",
  primarySurgeon: "",
  teamText: "",
  scheduledStart: "",
  scheduledEnd: "",
  estimatedCost: "",
};

function parseTeam(text: string): SurgeryTeamMember[] {
  return text
    .split(/\r?\n/)
    .map((ln) => ln.trim())
    .filter(Boolean)
    .map((ln) => {
      const idx = ln.indexOf(":");
      if (idx < 0) return { role: "Assistant", name: ln };
      return { role: ln.slice(0, idx).trim(), name: ln.slice(idx + 1).trim() };
    })
    .filter((m) => m.name);
}

function teamToText(team: SurgeryTeamMember[]): string {
  return team.map((m) => `${m.role}: ${m.name}`).join("\n");
}

function localInput(iso: string): string {
  // YYYY-MM-DDTHH:mm for datetime-local input
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SurgeriesPage() {
  const [bookings, setBookings] = useState<SurgeryBooking[]>([]);
  const [theatres, setTheatres] = useState<OperationTheatre[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterOT, setFilterOT] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BookingForm>(EMPTY_BOOKING);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [preOpEdit, setPreOpEdit] = useState<Record<string, PreOpChecklist>>({});
  const [postOpEdit, setPostOpEdit] = useState<
    Record<
      string,
      { operativeNotes: string; postOpInstructions: string; complications: string }
    >
  >({});

  // Theatre quick-add
  const [showOT, setShowOT] = useState(false);
  const [otForm, setOtForm] = useState({
    name: "",
    type: "major" as OTType,
    floor: "",
  });

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      if (filterStatus) q.set("status", filterStatus);
      if (filterOT) q.set("otId", filterOT);
      const [bRes, tRes, pRes] = await Promise.all([
        fetch(`/api/hospital/surgeries?${q.toString()}`, { cache: "no-store" }),
        fetch("/api/hospital/theatres", { cache: "no-store" }),
        fetch("/api/patients", { cache: "no-store" }),
      ]);
      const b = await bRes.json();
      const t = await tRes.json();
      const p = await pRes.json();
      if (!bRes.ok) throw new Error(b.error || "load_failed");
      setBookings(b.bookings || []);
      setTheatres(t.theatres || []);
      setPatients(p.patients || []);
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patientMap = useMemo(() => {
    const m = new Map<string, Patient>();
    patients.forEach((p) => m.set(p.id, p));
    return m;
  }, [patients]);
  const otMap = useMemo(() => {
    const m = new Map<string, OperationTheatre>();
    theatres.forEach((t) => m.set(t.id, t));
    return m;
  }, [theatres]);

  function reset() {
    setForm(EMPTY_BOOKING);
    setEditingId(null);
    setShowForm(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      patientId: form.patientId,
      otId: form.otId,
      procedureName: form.procedureName.trim(),
      procedureCode: form.procedureCode.trim() || undefined,
      priority: form.priority,
      anesthesiaType: form.anesthesiaType,
      primarySurgeon: form.primarySurgeon.trim(),
      team: parseTeam(form.teamText),
      scheduledStart: form.scheduledStart
        ? new Date(form.scheduledStart).toISOString()
        : undefined,
      scheduledEnd: form.scheduledEnd
        ? new Date(form.scheduledEnd).toISOString()
        : undefined,
      estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
    };
    const res = await fetch("/api/hospital/surgeries", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    reset();
    load();
  }

  function startEdit(b: SurgeryBooking) {
    setEditingId(b.id);
    setForm({
      patientId: b.patientId,
      otId: b.otId,
      procedureName: b.procedureName,
      procedureCode: b.procedureCode || "",
      priority: b.priority,
      anesthesiaType: b.anesthesiaType,
      primarySurgeon: b.primarySurgeon,
      teamText: teamToText(b.team),
      scheduledStart: localInput(b.scheduledStart),
      scheduledEnd: localInput(b.scheduledEnd),
      estimatedCost: b.estimatedCost !== undefined ? String(b.estimatedCost) : "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function setStatus(id: string, status: SurgeryStatus) {
    const res = await fetch("/api/hospital/surgeries", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    load();
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this surgery booking?")) return;
    await fetch("/api/hospital/surgeries", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, cancel: true }),
    });
    load();
  }

  async function removeBooking(id: string) {
    if (!confirm("Delete booking permanently?")) return;
    const res = await fetch("/api/hospital/surgeries", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    load();
  }

  async function savePreOp(id: string) {
    const preOp = preOpEdit[id];
    if (!preOp) return;
    const res = await fetch("/api/hospital/surgeries", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, preOp }),
    });
    if (res.ok) load();
  }

  async function savePostOp(id: string) {
    const po = postOpEdit[id];
    if (!po) return;
    const res = await fetch("/api/hospital/surgeries", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...po }),
    });
    if (res.ok) load();
  }

  async function submitOT(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/hospital/theatres", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(otForm),
    });
    if (res.ok) {
      setOtForm({ name: "", type: "major", floor: "" });
      setShowOT(false);
      load();
    }
  }

  async function removeOT(id: string) {
    if (!confirm("Delete this OT? (blocked if it has active bookings)")) return;
    const res = await fetch("/api/hospital/theatres", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    load();
  }

  const activeCount = bookings.filter(
    (b) => b.status === "scheduled" || b.status === "in_progress"
  ).length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayCount = bookings.filter((b) => {
    const t = new Date(b.scheduledStart).getTime();
    return t >= todayStart.getTime() && t <= todayEnd.getTime();
  }).length;

  return (
    <div className="space-y-6">
      <PageHero
        icon="⚕️"
        eyebrow="Surgical Suite"
        title="Operation Theatre"
        subtitle="OT rooms and surgical bookings with conflict detection, pre-op checklists, and operative notes"
        tone="rose"
        primaryAction={{ label: showForm ? "Close" : "+ Schedule surgery", onClick: () => (showForm ? reset() : setShowForm(true)) }}
        secondaryAction={{ label: showOT ? "Close OT" : "+ New OT", onClick: () => setShowOT((v) => !v) }}
      />

      <StatGrid cols={4}>
        <StatCard label="Theatres" value={theatres.length} tone="indigo" icon="🚪" />
        <StatCard label="Active bookings" value={activeCount} tone={activeCount > 0 ? "amber" : "slate"} icon="🔄" />
        <StatCard label="Today" value={todayCount} tone="emerald" icon="📅" />
        <StatCard label="Total bookings" value={bookings.length} tone="violet" icon="📊" />
      </StatGrid>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      )}

      {/* OT form */}
      {showOT && (
        <form onSubmit={submitOT} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">New operation theatre</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Name*">
              <input required value={otForm.name} onChange={(e) => setOtForm({ ...otForm, name: e.target.value })} className="input" placeholder="OT-1" />
            </Field>
            <Field label="Type*">
              <select value={otForm.type} onChange={(e) => setOtForm({ ...otForm, type: e.target.value as OTType })} className="input">
                {OT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Floor">
              <input value={otForm.floor} onChange={(e) => setOtForm({ ...otForm, floor: e.target.value })} className="input" />
            </Field>
          </div>
          <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white">Create OT</button>
        </form>
      )}

      {/* Theatre chips */}
      {theatres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {theatres.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs">
              <span className="font-semibold">{t.name}</span>
              <span className="text-slate-500">({t.type})</span>
              <button onClick={() => removeOT(t.id)} className="text-red-500 hover:text-red-700" title="Delete OT">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Booking form */}
      {showForm && (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">{editingId ? "Edit booking" : "Schedule surgery"}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Patient*">
              <select required value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="input">
                <option value="">— select —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                ))}
              </select>
            </Field>
            <Field label="OT*">
              <select required value={form.otId} onChange={(e) => setForm({ ...form, otId: e.target.value })} className="input">
                <option value="">— select —</option>
                {theatres.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as SurgeryBooking["priority"] })} className="input">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Procedure*">
              <input required value={form.procedureName} onChange={(e) => setForm({ ...form, procedureName: e.target.value })} className="input" />
            </Field>
            <Field label="Procedure code">
              <input value={form.procedureCode} onChange={(e) => setForm({ ...form, procedureCode: e.target.value })} className="input" placeholder="CPT / ICD-10-PCS" />
            </Field>
            <Field label="Anesthesia">
              <select value={form.anesthesiaType} onChange={(e) => setForm({ ...form, anesthesiaType: e.target.value as AnesthesiaType })} className="input">
                {ANES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Primary surgeon*">
              <input required value={form.primarySurgeon} onChange={(e) => setForm({ ...form, primarySurgeon: e.target.value })} className="input" />
            </Field>
            <Field label="Scheduled start*">
              <input type="datetime-local" required value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })} className="input" />
            </Field>
            <Field label="Scheduled end*">
              <input type="datetime-local" required value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })} className="input" />
            </Field>
            <Field label="Estimated cost">
              <input type="number" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} className="input" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Team (one per line, 'Role: Name')">
                <textarea value={form.teamText} onChange={(e) => setForm({ ...form, teamText: e.target.value })} className="input min-h-[60px]" placeholder="Assistant: Dr. X&#10;Anesthetist: Dr. Y&#10;Scrub Nurse: Ms. Z" />
              </Field>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white">
              {editingId ? "Save" : "Schedule"}
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="Status">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="OT">
          <select value={filterOT} onChange={(e) => setFilterOT(e.target.value)} className="input">
            <option value="">All</option>
            {theatres.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <button onClick={load} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white">Apply</button>
      </div>

      {/* Bookings */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Procedure</th>
              <th className="px-4 py-3">OT</th>
              <th className="px-4 py-3">Surgeon</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No bookings.</td></tr>
            ) : (
              bookings.map((b) => {
                const p = patientMap.get(b.patientId);
                const ot = otMap.get(b.otId);
                const isOpen = expanded === b.id;
                const preOp = preOpEdit[b.id] || b.preOp;
                const po =
                  postOpEdit[b.id] || {
                    operativeNotes: b.operativeNotes || "",
                    postOpInstructions: b.postOpInstructions || "",
                    complications: b.complications || "",
                  };
                return (
                  <>
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(b.scheduledStart).toLocaleString()}
                        <div className="text-[11px] text-slate-500">
                          → {new Date(b.scheduledEnd).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p ? `${p.firstName} ${p.lastName}` : b.patientId}</div>
                        <div className="text-[11px] text-slate-500">{b.priority}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{b.procedureName}</div>
                        {b.procedureCode && <div className="text-[11px] font-mono text-slate-500">{b.procedureCode}</div>}
                      </td>
                      <td className="px-4 py-3">{ot?.name || "—"}</td>
                      <td className="px-4 py-3">{b.primarySurgeon}</td>
                      <td className="px-4 py-3">
                        <select
                          value={b.status}
                          onChange={(e) => setStatus(b.id, e.target.value as SurgeryStatus)}
                          className={`rounded-full border-0 px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[b.status]}`}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button onClick={() => setExpanded(isOpen ? null : b.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                            {isOpen ? "Hide" : "View"}
                          </button>
                          <button onClick={() => startEdit(b)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Edit</button>
                          {b.status !== "completed" && b.status !== "cancelled" && (
                            <button onClick={() => cancel(b.id)} className="rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50">Cancel</button>
                          )}
                          <button onClick={() => removeBooking(b.id)} className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50">Del</button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={b.id + "-d"} className="bg-slate-50/50 dark:bg-slate-800/30">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Pre-op checklist */}
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">Pre-op checklist</div>
                              {([
                                ["consentSigned", "Consent signed"],
                                ["fastingConfirmed", "Fasting confirmed"],
                                ["allergiesReviewed", "Allergies reviewed"],
                                ["siteMarked", "Surgical site marked"],
                                ["bloodAvailable", "Blood available"],
                                ["imagingAvailable", "Imaging available"],
                              ] as const).map(([k, lbl]) => (
                                <label key={k} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={preOp[k]}
                                    onChange={(e) =>
                                      setPreOpEdit({ ...preOpEdit, [b.id]: { ...preOp, [k]: e.target.checked } })
                                    }
                                  />
                                  {lbl}
                                </label>
                              ))}
                              <textarea
                                value={preOp.notes || ""}
                                onChange={(e) =>
                                  setPreOpEdit({ ...preOpEdit, [b.id]: { ...preOp, notes: e.target.value } })
                                }
                                placeholder="Pre-op notes"
                                className="input mt-2 min-h-[50px]"
                              />
                              <button onClick={() => savePreOp(b.id)} className="mt-2 rounded-lg bg-slate-800 px-3 py-1 text-xs text-white">Save checklist</button>
                            </div>

                            {/* Operative / post-op */}
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">Operative & post-op</div>
                              <Field label="Operative notes">
                                <textarea
                                  value={po.operativeNotes}
                                  onChange={(e) => setPostOpEdit({ ...postOpEdit, [b.id]: { ...po, operativeNotes: e.target.value } })}
                                  className="input min-h-[50px]"
                                />
                              </Field>
                              <Field label="Post-op instructions">
                                <textarea
                                  value={po.postOpInstructions}
                                  onChange={(e) => setPostOpEdit({ ...postOpEdit, [b.id]: { ...po, postOpInstructions: e.target.value } })}
                                  className="input min-h-[50px]"
                                />
                              </Field>
                              <Field label="Complications">
                                <input
                                  value={po.complications}
                                  onChange={(e) => setPostOpEdit({ ...postOpEdit, [b.id]: { ...po, complications: e.target.value } })}
                                  className="input"
                                />
                              </Field>
                              <button onClick={() => savePostOp(b.id)} className="mt-2 rounded-lg bg-slate-800 px-3 py-1 text-xs text-white">Save notes</button>
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-slate-600">
                            <b>Team:</b>{" "}
                            {b.team.length === 0 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              b.team.map((m, i) => (
                                <span key={i} className="mr-2">{m.role}: {m.name}</span>
                              ))
                            )}
                          </div>
                          <div className="text-xs text-slate-600">
                            <b>Anesthesia:</b> {b.anesthesiaType}
                            {" · "}<b>Actual:</b>{" "}
                            {b.actualStart ? new Date(b.actualStart).toLocaleTimeString() : "—"} →{" "}
                            {b.actualEnd ? new Date(b.actualEnd).toLocaleTimeString() : "—"}
                            {b.estimatedCost !== undefined && <> {" · "}<b>Est. cost:</b> ₹{b.estimatedCost}</>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
