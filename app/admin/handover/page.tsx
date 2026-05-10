"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type {
  Handover,
  PatientHandoverEntry,
  Shift,
  HandoverStatus,
  PatientPriority,
  HandoverStats,
} from "@/lib/hospital/handover-store";
// Inlined from handover-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const SHIFT_LABEL: Record<Shift, string> = {
  morning: "Morning (07:00–15:00)",
  evening: "Evening (15:00–23:00)",
  night: "Night (23:00–07:00)",
};
const PRIORITY_LABEL: Record<PatientPriority, string> = {
  stable: "Stable",
  watch: "Watch",
  critical: "Critical",
};
const STATUS_LABEL: Record<HandoverStatus, string> = {
  draft: "Draft",
  signed_out: "Awaiting ack",
  acknowledged: "Acknowledged",
  disputed: "Disputed",
  closed: "Closed",
};

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

const SHIFTS: Shift[] = ["morning", "evening", "night"];
const STATUSES: HandoverStatus[] = [
  "draft",
  "signed_out",
  "acknowledged",
  "disputed",
  "closed",
];
const PRIORITIES: PatientPriority[] = ["stable", "watch", "critical"];

const PRIORITY_COLOR: Record<PatientPriority, string> = {
  stable: "bg-emerald-100 text-emerald-700 border-emerald-200",
  watch: "bg-amber-100 text-amber-800 border-amber-200",
  critical: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_COLOR: Record<HandoverStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  signed_out: "bg-blue-100 text-blue-700",
  acknowledged: "bg-emerald-100 text-emerald-700",
  disputed: "bg-rose-100 text-rose-700",
  closed: "bg-slate-100 text-slate-600",
};

const SHIFT_COLOR: Record<Shift, string> = {
  morning: "bg-amber-50 text-amber-800",
  evening: "bg-orange-50 text-orange-800",
  night: "bg-indigo-50 text-indigo-800",
};

function emptyEntry(): PatientHandoverEntry {
  return {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    patientName: "",
    priority: "stable",
    situation: "",
    background: "",
    assessment: "",
    recommendation: "",
  };
}

export default function HandoverPage() {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<HandoverStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<HandoverStatus | "">("");
  const [filterShift, setFilterShift] = useState<Shift | "">("");

  const [editing, setEditing] = useState<Handover | null>(null);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ackModal, setAckModal] = useState<Handover | null>(null);
  const [disputeModal, setDisputeModal] = useState<Handover | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterShift) params.set("shift", filterShift);
    const [hRes, pRes] = await Promise.all([
      fetch(`/api/hospital/handover?${params.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (hRes.ok) {
      const d = await hRes.json();
      setHandovers(d.handovers || []);
      setStats(d.stats || null);
    }
    if (pRes.ok) {
      const d = await pRes.json();
      setPatients(d.patients || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filterStatus, filterShift]);

  async function updateStatus(
    id: string,
    status: HandoverStatus,
    extra: Record<string, unknown> = {}
  ) {
    await fetch("/api/hospital/handover", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, ...extra }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this handover?")) return;
    await fetch("/api/hospital/handover", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🔄"
        eyebrow="Shift Continuity"
        title="Duty Handover — SBAR"
        subtitle="Shift-to-shift handoffs using Situation / Background / Assessment / Recommendation"
        tone="indigo"
        primaryAction={{ label: "+ New Handover", onClick: () => { setEditing(null); setCreating(true); } }}
      />

      {stats && (
        <StatGrid cols={4}>
          <StatCard label="Today's shifts" value={stats.todayHandovers} tone="sky" icon="📋" />
          <StatCard label="Awaiting ack" value={stats.pendingAck} tone={stats.pendingAck > 0 ? "amber" : "slate"} icon="⏳" />
          <StatCard label="Disputed" value={stats.disputed} tone={stats.disputed > 0 ? "rose" : "emerald"} icon="⚠️" />
          <StatCard label="Critical patients" value={stats.criticalPatients} tone={stats.criticalPatients > 0 ? "rose" : "violet"} hint="Across open handovers" icon="🚨" />
        </StatGrid>
      )}

      <Section>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as HandoverStatus | "")}
            className="inp"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value as Shift | "")}
            className="inp"
          >
            <option value="">All shifts</option>
            {SHIFTS.map((s) => (
              <option key={s} value={s}>
                {SHIFT_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
        ) : handovers.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No handovers yet.</div>
        ) : (
          <div className="space-y-3">
            {handovers.map((h) => (
              <HandoverCard
                key={h.id}
                handover={h}
                expanded={expanded === h.id}
                onToggle={() => setExpanded(expanded === h.id ? null : h.id)}
                onEdit={() => {
                  setEditing(h);
                  setCreating(true);
                }}
                onSignOut={() => updateStatus(h.id, "signed_out")}
                onAck={() => setAckModal(h)}
                onDispute={() => setDisputeModal(h)}
                onClose={() => updateStatus(h.id, "closed")}
                onDelete={() => remove(h.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {creating && (
        <HandoverFormModal
          handover={editing}
          patients={patients}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {ackModal && (
        <AckModal
          handover={ackModal}
          onClose={() => setAckModal(null)}
          onSaved={(by) => {
            updateStatus(ackModal.id, "acknowledged", { acknowledgedBy: by });
            setAckModal(null);
          }}
        />
      )}

      {disputeModal && (
        <DisputeModal
          handover={disputeModal}
          onClose={() => setDisputeModal(null)}
          onSaved={(reason) => {
            updateStatus(disputeModal.id, "disputed", {
              disputeReason: reason,
            });
            setDisputeModal(null);
          }}
        />
      )}

      <style jsx>{`
        .inp {
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .inp:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 3px rgb(191 219 254 / 0.4);
        }
      `}</style>
    </div>
  );
}

function HandoverCard({
  handover: h,
  expanded,
  onToggle,
  onEdit,
  onSignOut,
  onAck,
  onDispute,
  onClose,
  onDelete,
}: {
  handover: Handover;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSignOut: () => void;
  onAck: () => void;
  onDispute: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const critCount = h.entries.filter((e) => e.priority === "critical").length;
  const watchCount = h.entries.filter((e) => e.priority === "watch").length;

  return (
    <div
      className={`rounded-xl border ${
        h.status === "disputed"
          ? "border-rose-300"
          : h.status === "signed_out"
          ? "border-blue-300"
          : "border-slate-200"
      } bg-white`}
    >
      <div
        className="flex cursor-pointer items-center gap-3 p-4 hover:bg-slate-50"
        onClick={onToggle}
      >
        <div className="flex-shrink-0">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-xs font-bold ${SHIFT_COLOR[h.shift]}`}>
            {h.shift.slice(0, 3).toUpperCase()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{h.handoverNumber}</span>
            <span className="text-sm font-semibold text-slate-800">
              {h.shiftDate}
            </span>
            {h.ward && <span className="text-sm text-slate-600">· {h.ward}</span>}
            {h.department && <span className="text-xs text-slate-500">({h.department})</span>}
          </div>
          <div className="mt-1 text-[12px] text-slate-600">
            <span className="font-medium">{h.fromStaff || "—"}</span>
            {" → "}
            <span className="font-medium">{h.toStaff || "—"}</span>
            {" · "}
            <span>{h.entries.length} patient{h.entries.length === 1 ? "" : "s"}</span>
            {critCount > 0 && (
              <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                {critCount} critical
              </span>
            )}
            {watchCount > 0 && (
              <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                {watchCount} watch
              </span>
            )}
          </div>
        </div>
        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[h.status]}`}>
          {STATUS_LABEL[h.status]}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4">
          {h.criticalAlerts && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
              <div className="text-[10px] uppercase tracking-wide text-rose-700 font-semibold">
                Critical alerts (ward-wide)
              </div>
              <div className="mt-1 text-sm text-slate-800">{h.criticalAlerts}</div>
            </div>
          )}
          {h.generalNotes && (
            <div className="mb-3 rounded-lg bg-slate-50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                General notes
              </div>
              <div className="mt-1 text-sm text-slate-700">{h.generalNotes}</div>
            </div>
          )}
          {h.pendingTasks && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">
                Pending tasks (ward-wide)
              </div>
              <div className="mt-1 text-sm text-slate-700">{h.pendingTasks}</div>
            </div>
          )}

          {h.entries.length > 0 && (
            <div className="mb-3 space-y-2">
              {h.entries.map((e) => (
                <div
                  key={e.id}
                  className={`rounded-lg border p-3 ${PRIORITY_COLOR[e.priority]}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">{e.patientName}</span>
                      {e.bedLocation && (
                        <span className="ml-2 text-xs text-slate-600">
                          · Bed {e.bedLocation}
                        </span>
                      )}
                    </div>
                    <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      {PRIORITY_LABEL[e.priority]}
                    </span>
                  </div>
                  {e.alerts && (
                    <div className="mb-2 text-xs font-semibold text-rose-700">
                      ⚠ {e.alerts}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <SbarCell letter="S" label="Situation" value={e.situation} />
                    <SbarCell letter="B" label="Background" value={e.background} />
                    <SbarCell letter="A" label="Assessment" value={e.assessment} />
                    <SbarCell letter="R" label="Recommendation" value={e.recommendation} />
                  </div>
                  {e.pendingTasks && (
                    <div className="mt-2 text-xs text-slate-700">
                      <span className="font-semibold">Pending: </span>
                      {e.pendingTasks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mb-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
            <KV k="Signed out" v={h.signedOutAt ? new Date(h.signedOutAt).toLocaleString() : "—"} />
            <KV k="Acknowledged" v={h.acknowledgedAt ? new Date(h.acknowledgedAt).toLocaleString() : "—"} />
            <KV k="Ack by" v={h.acknowledgedBy || "—"} />
            <KV k="Closed" v={h.closedAt ? new Date(h.closedAt).toLocaleString() : "—"} />
          </div>

          {h.disputeReason && (
            <div className="mb-3 rounded-lg border border-rose-300 bg-rose-50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-rose-700 font-semibold">
                Dispute reason
              </div>
              <div className="mt-1 text-sm text-slate-800">{h.disputeReason}</div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {h.status === "draft" && (
              <>
                <button onClick={onEdit} className="rounded bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">Edit</button>
                <button onClick={onSignOut} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Sign out</button>
              </>
            )}
            {h.status === "signed_out" && (
              <>
                <button onClick={onAck} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Acknowledge</button>
                <button onClick={onDispute} className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Dispute</button>
              </>
            )}
            {h.status === "disputed" && (
              <button onClick={onSignOut} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Re-sign out</button>
            )}
            {h.status === "acknowledged" && (
              <button onClick={onClose} className="rounded bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">Close</button>
            )}
            <button onClick={onDelete} className="rounded border border-rose-300 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50">Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SbarCell({ letter, label, value }: { letter: string; label: string; value: string }) {
  return (
    <div className="rounded bg-white/80 p-2">
      <div className="flex items-center gap-1">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-white">
          {letter}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className="mt-1 text-xs text-slate-800 whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}

function HandoverFormModal({
  handover,
  patients,
  onClose,
  onSaved,
}: {
  handover: Handover | null;
  patients: Patient[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    shift: (handover?.shift || "morning") as Shift,
    shiftDate: handover?.shiftDate || new Date().toISOString().slice(0, 10),
    department: handover?.department || "",
    ward: handover?.ward || "",
    fromStaff: handover?.fromStaff || "",
    toStaff: handover?.toStaff || "",
    generalNotes: handover?.generalNotes || "",
    criticalAlerts: handover?.criticalAlerts || "",
    pendingTasks: handover?.pendingTasks || "",
    entries: handover?.entries || [],
  });

  function updateEntry(idx: number, patch: Partial<PatientHandoverEntry>) {
    const next = [...form.entries];
    next[idx] = { ...next[idx], ...patch };
    setForm({ ...form, entries: next });
  }
  function addEntry() {
    setForm({ ...form, entries: [...form.entries, emptyEntry()] });
  }
  function removeEntry(idx: number) {
    setForm({ ...form, entries: form.entries.filter((_, i) => i !== idx) });
  }

  async function save(signOut: boolean) {
    if (!form.fromStaff.trim()) {
      alert("From-staff (outgoing) is required");
      return;
    }
    const payload: Record<string, unknown> = {
      ...form,
      status: signOut ? "signed_out" : "draft",
    };
    const res = handover
      ? await fetch("/api/hospital/handover", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: handover.id, ...payload }),
        })
      : await fetch("/api/hospital/handover", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (res.ok) onSaved();
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed");
    }
  }

  return (
    <Modal onClose={onClose} title={handover ? "Edit handover" : "New shift handover"} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Shift">
            <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value as Shift })} className="inp w-full">
              {SHIFTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" value={form.shiftDate} onChange={(e) => setForm({ ...form, shiftDate: e.target.value })} className="inp w-full" />
          </Field>
          <Field label="Ward">
            <input type="text" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} className="inp w-full" placeholder="3-A" />
          </Field>
          <Field label="Department">
            <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="inp w-full" />
          </Field>
          <Field label="From staff (outgoing)">
            <input type="text" value={form.fromStaff} onChange={(e) => setForm({ ...form, fromStaff: e.target.value })} className="inp w-full" />
          </Field>
          <Field label="To staff (incoming)">
            <input type="text" value={form.toStaff} onChange={(e) => setForm({ ...form, toStaff: e.target.value })} className="inp w-full" />
          </Field>
        </div>

        <Field label="Ward-wide critical alerts">
          <textarea value={form.criticalAlerts} onChange={(e) => setForm({ ...form, criticalAlerts: e.target.value })} className="inp min-h-[50px] w-full" placeholder="e.g. Bed 12 isolation (MRSA), Code-blue risk in Bed 7" />
        </Field>
        <Field label="General shift notes">
          <textarea value={form.generalNotes} onChange={(e) => setForm({ ...form, generalNotes: e.target.value })} className="inp min-h-[50px] w-full" />
        </Field>
        <Field label="Ward-wide pending tasks">
          <textarea value={form.pendingTasks} onChange={(e) => setForm({ ...form, pendingTasks: e.target.value })} className="inp min-h-[50px] w-full" placeholder="e.g. Pharmacy pickup at 14:00, Blood sample for Bed 4" />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">SBAR patient entries ({form.entries.length})</div>
            <button onClick={addEntry} className="rounded bg-primary-600 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-700">
              + Add patient
            </button>
          </div>
          <div className="space-y-3">
            {form.entries.map((e, i) => (
              <div key={e.id} className={`rounded-lg border p-3 ${PRIORITY_COLOR[e.priority]}`}>
                <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Field label="Patient">
                    <select
                      value={e.patientId || ""}
                      onChange={(ev) => {
                        const pid = ev.target.value;
                        const p = patients.find((x) => x.id === pid);
                        updateEntry(i, {
                          patientId: pid || undefined,
                          patientName: p ? `${p.firstName} ${p.lastName}` : e.patientName,
                        });
                      }}
                      className="inp w-full"
                    >
                      <option value="">— Manual —</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Name">
                    <input type="text" value={e.patientName} onChange={(ev) => updateEntry(i, { patientName: ev.target.value })} className="inp w-full" />
                  </Field>
                  <Field label="Bed">
                    <input type="text" value={e.bedLocation || ""} onChange={(ev) => updateEntry(i, { bedLocation: ev.target.value })} className="inp w-full" placeholder="3A-12" />
                  </Field>
                  <Field label="Priority">
                    <select
                      value={e.priority}
                      onChange={(ev) => updateEntry(i, { priority: ev.target.value as PatientPriority })}
                      className="inp w-full"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Alerts (allergies, falls risk, code status)">
                  <input type="text" value={e.alerts || ""} onChange={(ev) => updateEntry(i, { alerts: ev.target.value })} className="inp w-full" />
                </Field>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Field label="S — Situation">
                    <textarea value={e.situation} onChange={(ev) => updateEntry(i, { situation: ev.target.value })} className="inp min-h-[60px] w-full" />
                  </Field>
                  <Field label="B — Background">
                    <textarea value={e.background} onChange={(ev) => updateEntry(i, { background: ev.target.value })} className="inp min-h-[60px] w-full" />
                  </Field>
                  <Field label="A — Assessment">
                    <textarea value={e.assessment} onChange={(ev) => updateEntry(i, { assessment: ev.target.value })} className="inp min-h-[60px] w-full" />
                  </Field>
                  <Field label="R — Recommendation">
                    <textarea value={e.recommendation} onChange={(ev) => updateEntry(i, { recommendation: ev.target.value })} className="inp min-h-[60px] w-full" />
                  </Field>
                </div>
                <Field label="Pending tasks for this patient">
                  <input type="text" value={e.pendingTasks || ""} onChange={(ev) => updateEntry(i, { pendingTasks: ev.target.value })} className="inp w-full" />
                </Field>
                <div className="mt-2 flex justify-end">
                  <button onClick={() => removeEntry(i)} className="rounded border border-rose-300 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50">Remove patient</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => save(false)} className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Save draft</button>
          <button onClick={() => save(true)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Save & Sign out</button>
        </div>
      </div>
    </Modal>
  );
}

function AckModal({ handover, onClose, onSaved }: { handover: Handover; onClose: () => void; onSaved: (by: string) => void }) {
  const [name, setName] = useState(handover.toStaff || "");
  return (
    <Modal onClose={onClose} title="Acknowledge handover">
      <div className="space-y-3">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          Signing as incoming nurse confirms you have read and understood the full handover for{" "}
          <span className="font-semibold">{handover.ward || handover.department || "this shift"}</span>
          {" "}({handover.entries.length} patient{handover.entries.length === 1 ? "" : "s"}).
        </div>
        <Field label="Your name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="inp w-full" />
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => {
              if (!name.trim()) return alert("Name required");
              onSaved(name);
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            I acknowledge
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DisputeModal({ handover: _h, onClose, onSaved }: { handover: Handover; onClose: () => void; onSaved: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal onClose={onClose} title="Dispute handover">
      <div className="space-y-3">
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-800">
          Marking this handover as disputed sends it back to the outgoing staff to correct. Describe what&apos;s missing or wrong.
        </div>
        <Field label="Dispute reason">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="inp min-h-[100px] w-full" />
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => {
              if (!reason.trim()) return alert("Reason required");
              onSaved(reason);
            }}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Submit dispute
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, sub, color = "slate" }: { label: string; value: string | number; sub?: string; color?: "slate" | "emerald" | "amber" | "rose" | "blue" }) {
  const colors: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    blue: "text-blue-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${colors[color]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5">{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className="text-sm text-slate-800">{v}</div>
    </div>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12" onClick={onClose}>
      <div
        className={`w-full ${wide ? "max-w-4xl" : "max-w-2xl"} rounded-xl bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
