// Housekeeping & Sanitation. Tenant-scoped.
//
// Tracks cleaning zones (wards / OT / ICU / restrooms / lobby, each with a
// risk tier and required frequency) and the cleaning tasks performed against
// them. Supports routine, terminal (post-discharge / post-transfer), spill,
// and deep-clean task types. Inspector sign-off with pass/fail/NA preserves
// a NABH-ready audit trail.
//
// Task lifecycle:
//   scheduled → in_progress → completed
//                 ↘ missed   ↘ rejected (failed inspection)
//
// Overdue detection is computed at read time: any scheduled task whose
// scheduledAt < now is treated as overdue in the UI (no separate state).

import { bindPersistentArray } from "../persistent-array";

export type ZoneType =
  | "ward"
  | "icu"
  | "ot"
  | "opd"
  | "emergency"
  | "lab"
  | "radiology"
  | "pharmacy"
  | "lobby"
  | "restroom"
  | "cafeteria"
  | "corridor"
  | "office"
  | "other";

export type RiskLevel = "high" | "medium" | "low";

export type TaskType = "routine" | "terminal" | "spill" | "deep" | "isolation";

export type TaskStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "missed"
  | "rejected";

export type InspectionResult = "pass" | "fail" | "na";

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface CleaningZone {
  id: string;
  organizationId: string;
  zoneNumber: string; // ZONE-{suffix}-{seq}
  name: string;
  type: ZoneType;
  floor?: string;
  riskLevel: RiskLevel;
  requiredFrequencyHours: number; // e.g. 6 for high-risk, 24 for office
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CleaningTask {
  id: string;
  organizationId: string;
  taskNumber: string; // CLN-{suffix}-{seq}
  zoneId: string;
  zoneName: string; // denormalized for quick read
  type: TaskType;
  scheduledAt: string;
  assignedTo?: string;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;

  checklistItems: ChecklistItem[];

  chemicalsUsed?: string; // sodium hypochlorite, quaternary ammonium, etc.
  linenChanged: boolean;

  inspectorName?: string;
  inspectedAt?: string;
  inspectionResult?: InspectionResult;
  inspectionNotes?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const zones: CleaningZone[] = [];
const tasks: CleaningTask[] = [];

const zoneBinding = bindPersistentArray<CleaningZone>(
  "hospital-hk-zones",
  zones,
  () => []
);
const taskBinding = bindPersistentArray<CleaningTask>(
  "hospital-hk-tasks",
  tasks,
  () => []
);
await zoneBinding.hydrate();
await taskBinding.hydrate();

const flushZones = zoneBinding.flush;
const flushTasks = taskBinding.flush;

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}

function nextZoneNumber(orgId: string): string {
  const n = zones.filter((z) => z.organizationId === orgId).length + 1;
  return `ZONE-${orgSuffix(orgId)}-${String(n).padStart(4, "0")}`;
}

function nextTaskNumber(orgId: string): string {
  const n = tasks.filter((t) => t.organizationId === orgId).length + 1;
  return `CLN-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const ZONE_LABEL: Record<ZoneType, string> = {
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

export const TASK_LABEL: Record<TaskType, string> = {
  routine: "Routine",
  terminal: "Terminal (post-discharge)",
  spill: "Spill / Contamination",
  deep: "Deep clean",
  isolation: "Isolation room",
};

const DEFAULT_CHECKLISTS: Record<TaskType, string[]> = {
  routine: [
    "Floor mopping with disinfectant",
    "Surfaces wiped (bed rails, tables, switches)",
    "Waste bins emptied",
    "Restroom cleaned and replenished",
    "Bedside items organized",
  ],
  terminal: [
    "All linen removed and bagged",
    "Mattress and pillow wiped with disinfectant",
    "All high-touch surfaces disinfected",
    "Bathroom deep-cleaned",
    "Curtains replaced",
    "Final walk-through by supervisor",
  ],
  spill: [
    "Area cordoned off",
    "Absorbent material applied",
    "Disinfectant applied for contact time",
    "Waste segregated per category",
    "Area re-mopped",
  ],
  deep: [
    "Ceilings and vents cleaned",
    "Walls wiped floor-to-ceiling",
    "Floors scrubbed (mechanical if available)",
    "Fixtures detail-cleaned",
    "Air vents and filters checked",
    "Restroom fittings descaled",
  ],
  isolation: [
    "PPE donned prior to entry",
    "All high-touch surfaces disinfected (twice)",
    "Designated cleaning equipment used",
    "Waste bagged as biomedical / infectious",
    "PPE doffed and disposed",
    "Hand hygiene before exit",
  ],
};

// ---------- Zones ----------

export function listZones(organizationId: string): CleaningZone[] {
  return zones
    .filter((z) => z.organizationId === organizationId)
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const riskOrder: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
      const r = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      if (r !== 0) return r;
      return a.name.localeCompare(b.name);
    });
}

export interface ZoneInput {
  name: string;
  type?: ZoneType;
  floor?: string;
  riskLevel?: RiskLevel;
  requiredFrequencyHours?: number;
  notes?: string;
  active?: boolean;
}

export function createZone(organizationId: string, input: ZoneInput): CleaningZone {
  const now = new Date().toISOString();
  const risk = input.riskLevel || "medium";
  const freq =
    input.requiredFrequencyHours ??
    (risk === "high" ? 6 : risk === "medium" ? 12 : 24);
  const z: CleaningZone = {
    id: `zone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    zoneNumber: nextZoneNumber(organizationId),
    name: input.name.trim(),
    type: input.type || "ward",
    floor: input.floor?.trim() || undefined,
    riskLevel: risk,
    requiredFrequencyHours: Math.max(1, freq),
    notes: input.notes?.trim() || undefined,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  zones.unshift(z);
  flushZones();
  return z;
}

export function updateZone(
  id: string,
  organizationId: string,
  patch: Partial<ZoneInput>
): CleaningZone | null {
  const z = zones.find((x) => x.id === id && x.organizationId === organizationId);
  if (!z) return null;
  const now = new Date().toISOString();
  if (patch.name !== undefined) z.name = patch.name.trim();
  if (patch.type !== undefined) z.type = patch.type;
  if (patch.floor !== undefined) z.floor = patch.floor?.trim() || undefined;
  if (patch.riskLevel !== undefined) z.riskLevel = patch.riskLevel;
  if (patch.requiredFrequencyHours !== undefined)
    z.requiredFrequencyHours = Math.max(1, patch.requiredFrequencyHours);
  if (patch.notes !== undefined) z.notes = patch.notes?.trim() || undefined;
  if (patch.active !== undefined) z.active = patch.active;
  z.updatedAt = now;
  flushZones();
  return z;
}

export function deleteZone(id: string, organizationId: string): boolean {
  const idx = zones.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  // refuse if there are open (scheduled / in_progress) tasks for this zone
  const hasOpen = tasks.some(
    (t) =>
      t.zoneId === id &&
      t.organizationId === organizationId &&
      (t.status === "scheduled" || t.status === "in_progress")
  );
  if (hasOpen) return false;
  zones.splice(idx, 1);
  flushZones();
  return true;
}

// ---------- Tasks ----------

export interface TaskInput {
  zoneId?: string;
  type?: TaskType;
  scheduledAt?: string;
  assignedTo?: string;
  status?: TaskStatus;
  checklistItems?: ChecklistItem[];
  chemicalsUsed?: string;
  linenChanged?: boolean;
  inspectorName?: string;
  inspectionResult?: InspectionResult;
  inspectionNotes?: string;
  notes?: string;
}

export function listTasks(opts: {
  organizationId: string;
  zoneId?: string;
  status?: TaskStatus;
  type?: TaskType;
  from?: string;
  to?: string;
}): CleaningTask[] {
  let list = tasks.filter((t) => t.organizationId === opts.organizationId);
  if (opts.zoneId) list = list.filter((t) => t.zoneId === opts.zoneId);
  if (opts.status) list = list.filter((t) => t.status === opts.status);
  if (opts.type) list = list.filter((t) => t.type === opts.type);
  if (opts.from) {
    const f = new Date(opts.from).getTime();
    list = list.filter((t) => new Date(t.scheduledAt).getTime() >= f);
  }
  if (opts.to) {
    const tt = new Date(opts.to).getTime();
    list = list.filter((t) => new Date(t.scheduledAt).getTime() <= tt);
  }
  const statusOrder: Record<TaskStatus, number> = {
    in_progress: 0,
    scheduled: 1,
    rejected: 2,
    missed: 3,
    completed: 4,
  };
  return list.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });
}

export function createTask(
  organizationId: string,
  input: TaskInput
): { ok: false; error: string } | { ok: true; task: CleaningTask } {
  if (!input.zoneId) return { ok: false, error: "missing_zone" };
  const zone = zones.find(
    (z) => z.id === input.zoneId && z.organizationId === organizationId
  );
  if (!zone) return { ok: false, error: "zone_not_found" };
  const now = new Date().toISOString();
  const type = input.type || "routine";
  const checklist =
    input.checklistItems && input.checklistItems.length > 0
      ? input.checklistItems
      : DEFAULT_CHECKLISTS[type].map((label) => ({ label, done: false }));
  const t: CleaningTask = {
    id: `cln-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    taskNumber: nextTaskNumber(organizationId),
    zoneId: zone.id,
    zoneName: zone.name,
    type,
    scheduledAt: input.scheduledAt || now,
    assignedTo: input.assignedTo?.trim() || undefined,
    status: input.status || "scheduled",
    checklistItems: checklist,
    chemicalsUsed: input.chemicalsUsed?.trim() || undefined,
    linenChanged: input.linenChanged ?? false,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  tasks.unshift(t);
  flushTasks();
  return { ok: true, task: t };
}

export function updateTask(
  id: string,
  organizationId: string,
  patch: Partial<TaskInput>
): CleaningTask | null {
  const t = tasks.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!t) return null;
  const now = new Date().toISOString();

  if (patch.zoneId !== undefined) {
    const zone = zones.find(
      (z) => z.id === patch.zoneId && z.organizationId === organizationId
    );
    if (zone) {
      t.zoneId = zone.id;
      t.zoneName = zone.name;
    }
  }
  if (patch.type !== undefined) t.type = patch.type;
  if (patch.scheduledAt !== undefined) t.scheduledAt = patch.scheduledAt;
  if (patch.assignedTo !== undefined)
    t.assignedTo = patch.assignedTo?.trim() || undefined;
  if (patch.checklistItems !== undefined) t.checklistItems = patch.checklistItems;
  if (patch.chemicalsUsed !== undefined)
    t.chemicalsUsed = patch.chemicalsUsed?.trim() || undefined;
  if (patch.linenChanged !== undefined) t.linenChanged = patch.linenChanged;
  if (patch.inspectorName !== undefined)
    t.inspectorName = patch.inspectorName?.trim() || undefined;
  if (patch.inspectionNotes !== undefined)
    t.inspectionNotes = patch.inspectionNotes?.trim() || undefined;
  if (patch.notes !== undefined) t.notes = patch.notes?.trim() || undefined;

  if (patch.inspectionResult !== undefined) {
    t.inspectionResult = patch.inspectionResult;
    t.inspectedAt = now;
    if (patch.inspectionResult === "fail") {
      t.status = "rejected";
    }
  }

  if (patch.status !== undefined && patch.status !== t.status) {
    const prev = t.status;
    t.status = patch.status;
    if (patch.status === "in_progress" && !t.startedAt) t.startedAt = now;
    if (patch.status === "completed" && prev !== "completed") {
      t.completedAt = now;
      if (!t.startedAt) t.startedAt = now;
    }
    if (prev === "completed" && patch.status !== "completed") {
      t.completedAt = undefined;
    }
  }

  t.updatedAt = now;
  flushTasks();
  return t;
}

export function deleteTask(id: string, organizationId: string): boolean {
  const idx = tasks.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  tasks.splice(idx, 1);
  flushTasks();
  return true;
}

// ---------- Analytics ----------

export interface HousekeepingStats {
  todayScheduled: number;
  inProgress: number;
  overdue: number; // scheduled + scheduledAt < now
  completedToday: number;
  inspectionFailsToday: number;
  zonesActive: number;
  zonesHigh: number;
}

export function computeStats(organizationId: string): HousekeepingStats {
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const s = startOfDay.getTime();
  const endOfDay = s + 24 * 3600 * 1000;

  const orgTasks = tasks.filter((t) => t.organizationId === organizationId);
  const todayScheduled = orgTasks.filter((t) => {
    const at = new Date(t.scheduledAt).getTime();
    return at >= s && at < endOfDay;
  }).length;
  const inProgress = orgTasks.filter((t) => t.status === "in_progress").length;
  const overdue = orgTasks.filter(
    (t) => t.status === "scheduled" && new Date(t.scheduledAt).getTime() < now
  ).length;
  const completedToday = orgTasks.filter(
    (t) =>
      t.status === "completed" &&
      t.completedAt &&
      new Date(t.completedAt).getTime() >= s
  ).length;
  const inspectionFailsToday = orgTasks.filter(
    (t) =>
      t.inspectionResult === "fail" &&
      t.inspectedAt &&
      new Date(t.inspectedAt).getTime() >= s
  ).length;

  const orgZones = zones.filter((z) => z.organizationId === organizationId);
  return {
    todayScheduled,
    inProgress,
    overdue,
    completedToday,
    inspectionFailsToday,
    zonesActive: orgZones.filter((z) => z.active).length,
    zonesHigh: orgZones.filter((z) => z.active && z.riskLevel === "high").length,
  };
}
