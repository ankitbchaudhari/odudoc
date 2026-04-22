// Duty Handover with SBAR (Situation / Background / Assessment / Recommendation).
// Tenant-scoped.
//
// Each handover is a shift-to-shift briefing between an outgoing and incoming
// nurse / doctor. It carries a list of patient-level SBAR entries plus
// general shift notes, pending tasks, and critical alerts.
//
// Lifecycle:
//   draft → signed_out (by outgoing) → acknowledged (by incoming) → closed
//                                    ↘ disputed (incoming flags issues)
//
// Dispute auto-reopens: status moves back to signed_out and the incoming
// nurse is expected to re-read / re-ack after resolution.

import { bindPersistentArray } from "../persistent-array";

export type Shift = "morning" | "evening" | "night";

export type HandoverStatus =
  | "draft"
  | "signed_out"
  | "acknowledged"
  | "disputed"
  | "closed";

export type PatientPriority = "stable" | "watch" | "critical";

export interface PatientHandoverEntry {
  id: string; // local to the handover
  patientId?: string;
  patientName: string;
  bedLocation?: string;
  priority: PatientPriority;
  situation: string; // S
  background: string; // B
  assessment: string; // A
  recommendation: string; // R
  pendingTasks?: string;
  alerts?: string; // allergies, code status, falls risk, etc.
}

export interface Handover {
  id: string;
  organizationId: string;
  handoverNumber: string; // HO-{suffix}-{seq}

  shift: Shift;
  shiftDate: string; // YYYY-MM-DD
  department?: string;
  ward?: string;

  fromStaff: string; // outgoing
  toStaff?: string; // incoming (optional at draft)

  status: HandoverStatus;

  generalNotes?: string;
  criticalAlerts?: string; // ward-wide: isolation, code blue risk, MRSA bed, etc.
  pendingTasks?: string; // ward-wide

  entries: PatientHandoverEntry[];

  signedOutAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  disputedAt?: string;
  disputeReason?: string;
  closedAt?: string;

  createdAt: string;
  updatedAt: string;
}

const handovers: Handover[] = [];
const { hydrate, flush } = bindPersistentArray<Handover>(
  "hospital-handovers",
  handovers,
  () => []
);
await hydrate();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextHandoverNumber(orgId: string): string {
  const n = handovers.filter((h) => h.organizationId === orgId).length + 1;
  return `HO-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const SHIFT_LABEL: Record<Shift, string> = {
  morning: "Morning (07:00–15:00)",
  evening: "Evening (15:00–23:00)",
  night: "Night (23:00–07:00)",
};

export const PRIORITY_LABEL: Record<PatientPriority, string> = {
  stable: "Stable",
  watch: "Watch",
  critical: "Critical",
};

export const STATUS_LABEL: Record<HandoverStatus, string> = {
  draft: "Draft",
  signed_out: "Awaiting ack",
  acknowledged: "Acknowledged",
  disputed: "Disputed",
  closed: "Closed",
};

export function listHandovers(opts: {
  organizationId: string;
  shift?: Shift;
  status?: HandoverStatus;
  department?: string;
  ward?: string;
  from?: string;
  to?: string;
}): Handover[] {
  let list = handovers.filter(
    (h) => h.organizationId === opts.organizationId
  );
  if (opts.shift) list = list.filter((h) => h.shift === opts.shift);
  if (opts.status) list = list.filter((h) => h.status === opts.status);
  if (opts.department)
    list = list.filter((h) => h.department === opts.department);
  if (opts.ward) list = list.filter((h) => h.ward === opts.ward);
  if (opts.from) {
    const f = new Date(opts.from).getTime();
    list = list.filter((h) => new Date(h.shiftDate).getTime() >= f);
  }
  if (opts.to) {
    const t = new Date(opts.to).getTime();
    list = list.filter((h) => new Date(h.shiftDate).getTime() <= t);
  }
  const statusOrder: Record<HandoverStatus, number> = {
    disputed: 0,
    signed_out: 1,
    draft: 2,
    acknowledged: 3,
    closed: 4,
  };
  return list.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return (
      new Date(b.shiftDate).getTime() - new Date(a.shiftDate).getTime()
    );
  });
}

export interface HandoverInput {
  shift?: Shift;
  shiftDate?: string;
  department?: string;
  ward?: string;
  fromStaff?: string;
  toStaff?: string;
  generalNotes?: string;
  criticalAlerts?: string;
  pendingTasks?: string;
  entries?: PatientHandoverEntry[];
  status?: HandoverStatus;
  acknowledgedBy?: string;
  disputeReason?: string;
}

function sanitizeEntries(
  input?: PatientHandoverEntry[]
): PatientHandoverEntry[] {
  if (!Array.isArray(input)) return [];
  return input.map((e, idx) => ({
    id:
      e.id ||
      `ent-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    patientId: e.patientId || undefined,
    patientName: (e.patientName || "").trim(),
    bedLocation: e.bedLocation?.trim() || undefined,
    priority: e.priority || "stable",
    situation: (e.situation || "").trim(),
    background: (e.background || "").trim(),
    assessment: (e.assessment || "").trim(),
    recommendation: (e.recommendation || "").trim(),
    pendingTasks: e.pendingTasks?.trim() || undefined,
    alerts: e.alerts?.trim() || undefined,
  }));
}

export function createHandover(
  organizationId: string,
  input: HandoverInput
): Handover {
  const now = new Date().toISOString();
  const h: Handover = {
    id: `ho-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    handoverNumber: nextHandoverNumber(organizationId),
    shift: input.shift || "morning",
    shiftDate: input.shiftDate || new Date().toISOString().slice(0, 10),
    department: input.department?.trim() || undefined,
    ward: input.ward?.trim() || undefined,
    fromStaff: input.fromStaff?.trim() || "",
    toStaff: input.toStaff?.trim() || undefined,
    status: input.status || "draft",
    generalNotes: input.generalNotes?.trim() || undefined,
    criticalAlerts: input.criticalAlerts?.trim() || undefined,
    pendingTasks: input.pendingTasks?.trim() || undefined,
    entries: sanitizeEntries(input.entries),
    createdAt: now,
    updatedAt: now,
  };
  handovers.unshift(h);
  flush();
  return h;
}

export function updateHandover(
  id: string,
  organizationId: string,
  patch: HandoverInput
): Handover | null {
  const h = handovers.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!h) return null;
  const now = new Date().toISOString();

  if (patch.shift !== undefined) h.shift = patch.shift;
  if (patch.shiftDate !== undefined) h.shiftDate = patch.shiftDate;
  if (patch.department !== undefined)
    h.department = patch.department?.trim() || undefined;
  if (patch.ward !== undefined) h.ward = patch.ward?.trim() || undefined;
  if (patch.fromStaff !== undefined) h.fromStaff = patch.fromStaff.trim();
  if (patch.toStaff !== undefined)
    h.toStaff = patch.toStaff?.trim() || undefined;
  if (patch.generalNotes !== undefined)
    h.generalNotes = patch.generalNotes?.trim() || undefined;
  if (patch.criticalAlerts !== undefined)
    h.criticalAlerts = patch.criticalAlerts?.trim() || undefined;
  if (patch.pendingTasks !== undefined)
    h.pendingTasks = patch.pendingTasks?.trim() || undefined;
  if (patch.entries !== undefined) h.entries = sanitizeEntries(patch.entries);

  if (patch.status !== undefined && patch.status !== h.status) {
    const prev = h.status;
    h.status = patch.status;
    if (patch.status === "signed_out" && prev === "draft") {
      h.signedOutAt = now;
    }
    if (patch.status === "acknowledged" && prev !== "acknowledged") {
      h.acknowledgedAt = now;
      if (patch.acknowledgedBy) h.acknowledgedBy = patch.acknowledgedBy.trim();
    }
    if (patch.status === "disputed") {
      h.disputedAt = now;
      if (patch.disputeReason) h.disputeReason = patch.disputeReason.trim();
    }
    if (patch.status === "closed") {
      h.closedAt = now;
    }
    if (prev === "closed" && patch.status !== "closed") {
      h.closedAt = undefined;
    }
  } else {
    if (patch.acknowledgedBy !== undefined)
      h.acknowledgedBy = patch.acknowledgedBy?.trim() || undefined;
    if (patch.disputeReason !== undefined)
      h.disputeReason = patch.disputeReason?.trim() || undefined;
  }

  h.updatedAt = now;
  flush();
  return h;
}

export function deleteHandover(
  id: string,
  organizationId: string
): boolean {
  const idx = handovers.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  handovers.splice(idx, 1);
  flush();
  return true;
}

// Patient cascade: strip this patient from all handover entries, but keep
// the handover itself (shift record retained).
export function unlinkPatientFromHandovers(
  patientId: string,
  organizationId: string
): number {
  let n = 0;
  for (const h of handovers) {
    if (h.organizationId !== organizationId) continue;
    const before = h.entries.length;
    h.entries = h.entries.filter((e) => e.patientId !== patientId);
    if (h.entries.length !== before) n++;
  }
  if (n) flush();
  return n;
}

export interface HandoverStats {
  todayHandovers: number;
  pendingAck: number;
  disputed: number;
  criticalPatients: number; // sum of critical entries across non-closed
}

export function computeStats(organizationId: string): HandoverStats {
  const today = new Date().toISOString().slice(0, 10);
  const orgList = handovers.filter(
    (h) => h.organizationId === organizationId
  );
  const todayHandovers = orgList.filter((h) => h.shiftDate === today).length;
  const pendingAck = orgList.filter(
    (h) => h.status === "signed_out"
  ).length;
  const disputed = orgList.filter((h) => h.status === "disputed").length;
  const criticalPatients = orgList
    .filter((h) => h.status !== "closed")
    .reduce(
      (sum, h) =>
        sum + h.entries.filter((e) => e.priority === "critical").length,
      0
    );
  return { todayHandovers, pendingAck, disputed, criticalPatients };
}
