"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type {
  CleaningZone,
  CleaningTask,
  ZoneType,
  RiskLevel,
  TaskType,
  TaskStatus,
  InspectionResult,
  ChecklistItem,
  HousekeepingStats,
} from "@/lib/hospital/housekeeping-store";
// Inlined from housekeeping-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const ZONE_LABEL: Record<ZoneType, string> = {
  ward: "Ward",
  icu: "ICU",
  ot: "Operating Theatre",
  opd: "OPD",
  emergency: "Emergency",
  lab: "Laboratory",
  radiology: "Radiology",
  pharmacy: "Pharmacy",
  lobby: "Lobby / Reception",
  restroom: "Restroom",
  cafeteria: "Cafeteria / Kitchen",
  corridor: "Corridor",
  office: "Office",
  other: "Other",
};
const TASK_LABEL: Record<TaskType, string> = {
  routine: "Routine",
  terminal: "Terminal (post-discharge)",
  spill: "Spill / Contamination",
  deep: "Deep clean",
  isolation: "Isolation room",
};

const ZONE_TYPES: ZoneType[] = [
  "ward",
  "icu",
  "ot",
  "opd",
  "emergency",
  "lab",
  "radiology",
  "pharmacy",
  "lobby",
  "restroom",
  "cafeteria",
  "corridor",
  "office",
  "other",
];
const RISK_LEVELS: RiskLevel[] = ["high", "medium", "low"];
const TASK_TYPES: TaskType[] = ["routine", "terminal", "spill", "deep", "isolation"];
const TASK_STATUSES: TaskStatus[] = [
  "scheduled",
  "in_progress",
  "completed",
  "missed",
  "rejected",
];

const RISK_COLOR: Record<RiskLevel, string> = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-emerald-100 text-emerald-700",
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  scheduled: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  missed: "bg-rose-100 text-rose-700",
  rejected: "bg-purple-100 text-purple-700",
};

const TYPE_COLOR: Record<TaskType, string> = {
  routine: "bg-slate-100 text-slate-700",
  terminal: "bg-purple-100 text-purple-700",
  spill: "bg-rose-100 text-rose-700",
  deep: "bg-sky-100 text-sky-700",
  isolation: "bg-amber-100 text-amber-800",
};

export default function HousekeepingPage() {
  const [tab, setTab] = useState<"tasks" | "zones">("tasks");
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [zones, setZones] = useState<CleaningZone[]>([]);
  const [stats, setStats] = useState<HousekeepingStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");
  const [filterType, setFilterType] = useState<TaskType | "">("");
  const [filterZone, setFilterZone] = useState<string>("");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editZone, setEditZone] = useState<CleaningZone | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState<CleaningTask | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterType) params.set("type", filterType);
    if (filterZone) params.set("zoneId", filterZone);
    const [tRes, zRes] = await Promise.all([
      fetch(`/api/hospital/housekeeping?${params.toString()}`, { cache: "no-store" }),
      fetch("/api/hospital/housekeeping/zones", { cache: "no-store" }),
    ]);
    if (tRes.ok) {
      const d = await tRes.json();
      setTasks(d.tasks || []);
      setStats(d.stats || null);
    }
    if (zRes.ok) {
      const d = await zRes.json();
      setZones(d.zones || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filterStatus, filterType, filterZone]);

  async function updateTaskStatus(id: string, status: TaskStatus) {
    const res = await fetch("/api/hospital/housekeeping", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) load();
  }

  async function toggleChecklist(task: CleaningTask, idx: number) {
    const updated = task.checklistItems.map((item, i) =>
      i === idx ? { ...item, done: !item.done } : item
    );
    await fetch("/api/hospital/housekeeping", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: task.id, checklistItems: updated }),
    });
    load();
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    await fetch("/api/hospital/housekeeping", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function deleteZone(id: string) {
    if (!confirm("Delete this zone?")) return;
    const res = await fetch("/api/hospital/housekeeping/zones", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(
        d.error === "has_open_tasks_or_not_found"
          ? "Cannot delete: this zone has open tasks."
          : d.error || "Failed"
      );
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🧹"
        eyebrow="Sanitation"
        title="Housekeeping & Sanitation"
        subtitle="NABH-aligned zone cleaning roster with inspector sign-off"
        tone="emerald"
        primaryAction={
          tab === "tasks"
            ? { label: "+ New Task", onClick: () => setShowTaskForm(true) }
            : { label: "+ New Zone", onClick: () => { setEditZone(null); setShowZoneForm(true); } }
        }
      />

      {stats && (
        <StatGrid cols={5}>
          <StatCard label="Today scheduled" value={stats.todayScheduled} tone="sky" icon="📅" />
          <StatCard label="In progress" value={stats.inProgress} tone="amber" icon="🔄" />
          <StatCard label="Overdue" value={stats.overdue} tone={stats.overdue > 0 ? "rose" : "emerald"} icon="⏰" />
          <StatCard label="Completed today" value={stats.completedToday} tone="teal" icon="✓" />
          <StatCard label="Inspection fails today" value={stats.inspectionFailsToday} tone={stats.inspectionFailsToday > 0 ? "rose" : "violet"} hint={`${stats.zonesActive} active zones · ${stats.zonesHigh} high-risk`} icon="🛡️" />
        </StatGrid>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        <TabBtn active={tab === "tasks"} onClick={() => setTab("tasks")}>
          Cleaning Tasks
        </TabBtn>
        <TabBtn active={tab === "zones"} onClick={() => setTab("zones")}>
          Zones ({zones.length})
        </TabBtn>
      </div>

      {tab === "tasks" && (
        <Section>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "")} className="inp">
              <option value="">All statuses</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as TaskType | "")} className="inp">
              <option value="">All types</option>
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>{TASK_LABEL[t]}</option>
              ))}
            </select>
            <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)} className="inp">
              <option value="">All zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No tasks.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Ref</th>
                    <th className="py-2 pr-3">Zone</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Scheduled</th>
                    <th className="py-2 pr-3">Assigned</th>
                    <th className="py-2 pr-3">Checklist</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Inspection</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      expanded={expanded === t.id}
                      onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
                      onInspect={() => setInspecting(t)}
                      onStatus={updateTaskStatus}
                      onCheck={toggleChecklist}
                      onDelete={() => deleteTask(t.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {tab === "zones" && (
        <Section>
          {zones.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No zones defined. Create one to start scheduling cleaning tasks.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Ref</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Floor</th>
                    <th className="py-2 pr-3">Risk</th>
                    <th className="py-2 pr-3">Freq (hrs)</th>
                    <th className="py-2 pr-3">Active</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {zones.map((z) => (
                    <tr key={z.id} className={z.active ? "" : "opacity-50"}>
                      <td className="py-2 pr-3 font-mono text-xs text-slate-700">{z.zoneNumber}</td>
                      <td className="py-2 pr-3 font-medium text-slate-800">{z.name}</td>
                      <td className="py-2 pr-3 text-slate-600">{ZONE_LABEL[z.type]}</td>
                      <td className="py-2 pr-3 text-slate-600">{z.floor || "—"}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${RISK_COLOR[z.riskLevel]}`}>
                          {z.riskLevel}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{z.requiredFrequencyHours}h</td>
                      <td className="py-2 pr-3">{z.active ? "✓" : "—"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditZone(z); setShowZoneForm(true); }}
                            className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteZone(z.id)}
                            className="rounded border border-rose-300 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {showTaskForm && (
        <TaskFormModal
          zones={zones}
          onClose={() => setShowTaskForm(false)}
          onSaved={() => { setShowTaskForm(false); load(); }}
        />
      )}

      {showZoneForm && (
        <ZoneFormModal
          zone={editZone}
          onClose={() => { setShowZoneForm(false); setEditZone(null); }}
          onSaved={() => { setShowZoneForm(false); setEditZone(null); load(); }}
        />
      )}

      {inspecting && (
        <InspectionModal
          task={inspecting}
          onClose={() => setInspecting(null)}
          onSaved={() => { setInspecting(null); load(); }}
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

function TaskRow({
  task,
  expanded,
  onToggle,
  onInspect,
  onStatus,
  onCheck,
  onDelete,
}: {
  task: CleaningTask;
  expanded: boolean;
  onToggle: () => void;
  onInspect: () => void;
  onStatus: (id: string, st: TaskStatus) => void;
  onCheck: (task: CleaningTask, idx: number) => void;
  onDelete: () => void;
}) {
  const overdue =
    task.status === "scheduled" &&
    new Date(task.scheduledAt).getTime() < Date.now();
  const done = task.checklistItems.filter((c) => c.done).length;
  const total = task.checklistItems.length;

  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-slate-50 ${overdue ? "bg-rose-50/50" : ""}`}
        onClick={onToggle}
      >
        <td className="py-2 pr-3 font-mono text-xs text-slate-700">{task.taskNumber}</td>
        <td className="py-2 pr-3 font-medium text-slate-800">{task.zoneName}</td>
        <td className="py-2 pr-3">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${TYPE_COLOR[task.type]}`}>
            {TASK_LABEL[task.type]}
          </span>
        </td>
        <td className={`py-2 pr-3 text-xs ${overdue ? "font-semibold text-rose-700" : "text-slate-600"}`}>
          {new Date(task.scheduledAt).toLocaleString()}
          {overdue && <div className="text-[10px] font-semibold">OVERDUE</div>}
        </td>
        <td className="py-2 pr-3 text-sm text-slate-700">{task.assignedTo || "—"}</td>
        <td className="py-2 pr-3 text-xs">
          <span className={done === total ? "text-emerald-700 font-semibold" : "text-slate-600"}>
            {done}/{total}
          </span>
        </td>
        <td className="py-2 pr-3">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[task.status]}`}>
            {task.status}
          </span>
        </td>
        <td className="py-2 pr-3 text-xs">
          {task.inspectionResult === "pass" && <span className="text-emerald-700 font-semibold">✓ Pass</span>}
          {task.inspectionResult === "fail" && <span className="text-rose-700 font-semibold">✗ Fail</span>}
          {task.inspectionResult === "na" && <span className="text-slate-500">N/A</span>}
          {!task.inspectionResult && <span className="text-slate-400">—</span>}
        </td>
        <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            {task.status === "scheduled" && (
              <button onClick={() => onStatus(task.id, "in_progress")} className="rounded bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700">Start</button>
            )}
            {task.status === "in_progress" && (
              <button onClick={() => onStatus(task.id, "completed")} className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">Complete</button>
            )}
            {task.status === "completed" && !task.inspectionResult && (
              <button onClick={onInspect} className="rounded bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700">Inspect</button>
            )}
            {task.status === "scheduled" && (
              <button onClick={() => onStatus(task.id, "missed")} className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100">Miss</button>
            )}
            <button onClick={onDelete} className="rounded border border-rose-300 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50">Del</button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={9} className="px-3 py-3">
            <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <KV k="Started" v={task.startedAt ? new Date(task.startedAt).toLocaleString() : "—"} />
              <KV k="Completed" v={task.completedAt ? new Date(task.completedAt).toLocaleString() : "—"} />
              <KV k="Chemicals" v={task.chemicalsUsed || "—"} />
              <KV k="Linen changed" v={task.linenChanged ? "Yes" : "No"} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Checklist</div>
              <div className="space-y-1">
                {task.checklistItems.map((item, i) => (
                  <label key={i} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => onCheck(task, i)}
                      disabled={task.status === "completed" || task.status === "rejected"}
                    />
                    <span className={item.done ? "line-through text-slate-400" : ""}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {task.inspectorName && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-sm">
                <div className="text-[10px] uppercase tracking-wide text-amber-700">
                  Inspected by {task.inspectorName}{task.inspectedAt ? ` · ${new Date(task.inspectedAt).toLocaleString()}` : ""}
                </div>
                {task.inspectionNotes && <div className="mt-1 text-slate-700">{task.inspectionNotes}</div>}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function TaskFormModal({
  zones,
  onClose,
  onSaved,
}: {
  zones: CleaningZone[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    zoneId: zones[0]?.id || "",
    type: "routine" as TaskType,
    scheduledAt: new Date().toISOString().slice(0, 16),
    assignedTo: "",
    chemicalsUsed: "",
    linenChanged: false,
    notes: "",
  });

  async function save() {
    if (!form.zoneId) return alert("Select a zone");
    const res = await fetch("/api/hospital/housekeeping", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      }),
    });
    if (res.ok) onSaved();
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed");
    }
  }

  return (
    <Modal onClose={onClose} title="Schedule cleaning task">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Zone">
            <select value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} className="inp w-full">
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} ({z.riskLevel})</option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TaskType })} className="inp w-full">
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>{TASK_LABEL[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="Scheduled at">
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="inp w-full" />
          </Field>
          <Field label="Assigned to">
            <input type="text" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="inp w-full" placeholder="Housekeeper name" />
          </Field>
          <Field label="Chemicals used">
            <input type="text" value={form.chemicalsUsed} onChange={(e) => setForm({ ...form, chemicalsUsed: e.target.value })} className="inp w-full" placeholder="e.g. 1% sodium hypochlorite" />
          </Field>
          <Field label="Linen change">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.linenChanged} onChange={(e) => setForm({ ...form, linenChanged: e.target.checked })} />
              Linen changed
            </label>
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp min-h-[60px] w-full" />
        </Field>
        <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-xs text-sky-800">
          A default checklist for <span className="font-semibold">{TASK_LABEL[form.type]}</span> will be auto-generated.
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={save} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Schedule</button>
        </div>
      </div>
    </Modal>
  );
}

function ZoneFormModal({
  zone,
  onClose,
  onSaved,
}: {
  zone: CleaningZone | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: zone?.name || "",
    type: (zone?.type || "ward") as ZoneType,
    floor: zone?.floor || "",
    riskLevel: (zone?.riskLevel || "medium") as RiskLevel,
    requiredFrequencyHours: zone?.requiredFrequencyHours || 12,
    notes: zone?.notes || "",
    active: zone?.active ?? true,
  });

  async function save() {
    if (!form.name.trim()) return alert("Name required");
    const res = zone
      ? await fetch("/api/hospital/housekeeping/zones", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: zone.id, ...form }),
        })
      : await fetch("/api/hospital/housekeeping/zones", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        });
    if (res.ok) onSaved();
    else alert("Failed");
  }

  return (
    <Modal onClose={onClose} title={zone ? "Edit zone" : "New cleaning zone"}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="inp w-full" placeholder="Ward 3A" />
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ZoneType })} className="inp w-full">
              {ZONE_TYPES.map((t) => (
                <option key={t} value={t}>{ZONE_LABEL[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="Floor">
            <input type="text" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} className="inp w-full" placeholder="3" />
          </Field>
          <Field label="Risk level">
            <select value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value as RiskLevel })} className="inp w-full">
              {RISK_LEVELS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Required frequency (hours)">
            <input type="number" min={1} value={form.requiredFrequencyHours} onChange={(e) => setForm({ ...form, requiredFrequencyHours: Number(e.target.value) })} className="inp w-full" />
          </Field>
          <Field label="Status">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp min-h-[60px] w-full" />
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={save} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Save</button>
        </div>
      </div>
    </Modal>
  );
}

function InspectionModal({
  task,
  onClose,
  onSaved,
}: {
  task: CleaningTask;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [inspectorName, setInspectorName] = useState(task.inspectorName || "");
  const [result, setResult] = useState<InspectionResult>("pass");
  const [notes, setNotes] = useState(task.inspectionNotes || "");

  const remaining = useMemo(
    () => task.checklistItems.filter((c) => !c.done).length,
    [task]
  );

  async function save() {
    if (!inspectorName.trim()) return alert("Inspector name required");
    const res = await fetch("/api/hospital/housekeeping", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: task.id,
        inspectorName,
        inspectionResult: result,
        inspectionNotes: notes,
      }),
    });
    if (res.ok) onSaved();
    else alert("Failed");
  }

  return (
    <Modal onClose={onClose} title={`Inspect ${task.taskNumber}`}>
      <div className="space-y-3">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="font-semibold text-slate-800">{task.zoneName} · {TASK_LABEL[task.type]}</div>
          <div className="text-xs text-slate-600">
            Completed: {task.completedAt ? new Date(task.completedAt).toLocaleString() : "—"} ·
            Checklist: {task.checklistItems.length - remaining}/{task.checklistItems.length}
          </div>
        </div>
        <Field label="Inspector name">
          <input type="text" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} className="inp w-full" />
        </Field>
        <Field label="Result">
          <div className="flex gap-2">
            {(["pass", "fail", "na"] as InspectionResult[]).map((r) => (
              <button
                key={r}
                onClick={() => setResult(r)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  result === r
                    ? r === "pass"
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : r === "fail"
                      ? "border-rose-500 bg-rose-500 text-white"
                      : "border-slate-400 bg-slate-400 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="inp min-h-[80px] w-full" placeholder={result === "fail" ? "Why did it fail? What needs redoing?" : ""} />
        </Field>
        {result === "fail" && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-700">
            Marking as fail will move the task to <span className="font-semibold">rejected</span>.
            You&apos;ll need to schedule a new task to rectify.
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={save} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Submit inspection</button>
        </div>
      </div>
    </Modal>
  );
}

function Stat({
  label,
  value,
  sub,
  color = "slate",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "slate" | "emerald" | "amber" | "rose" | "blue";
}) {
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

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
        active ? "border-primary-500 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
