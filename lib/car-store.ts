// Corrective Action Request (CAR) system — V13 §5 of the Master Spec.
//
// A CAR is a formal record opened against a breach: who must respond,
// by when, with what root-cause analysis, and what corrective action
// was taken. Auto-generated for certain breach types (V13 §5.5
// "Auto-Generated CARs — Trigger Events") or opened manually by a
// quality-management lead from the accountability feed.
//
// Lifecycle (V13 §5.2):
//   OPEN → ACKNOWLEDGED → INVESTIGATING → ACTION_PLANNED → CLOSED
//   (with VERIFIED as a separate closed-state for quality audits)
//
// Deadlines (V13 §5.4):
//   - Critical breach: respond within 4 hours, close within 24 hours
//   - High:    24 h respond, 7 days close
//   - Medium:  72 h respond, 14 days close
//   - Low:     7 days respond, 30 days close
//
// CARs link 1:1 to an AccountabilityEvent so the audit trail is
// continuous — the breach is the immutable substance, the CAR is the
// human-driven response loop on top of it.

import { bindPersistentArray } from "@/lib/persistent-array";
import { recordEvent } from "@/lib/accountability-store";

export type CarStatus =
  | "open"            // Just created, nobody owns it yet
  | "acknowledged"    // Owner accepted assignment
  | "investigating"   // Root-cause work in progress
  | "action_planned"  // Corrective action proposed
  | "closed"          // Owner marked it done
  | "verified";       // QA verified the close (V13 §5.2 terminal good state)

export type CarSeverity = "low" | "medium" | "high" | "critical";

export interface CarUpdate {
  at: string;
  byEmail: string;
  byRole?: string;
  /** Free-form note attached to the lifecycle update. */
  note: string;
  /** Status the CAR moved into with this update, or undefined if the
   *  update is just a comment without a state change. */
  toStatus?: CarStatus;
}

export interface CorrectiveActionRequest {
  id: string;
  /** Linked accountability event id. */
  eventId: string;
  /** Replicate a few fields from the event for cheap listing without
   *  joining the events table on every render. */
  breachRule: string;
  breachLevel: 1 | 2 | 3 | 4 | 5;
  category: "clinical" | "admin" | "financial" | "data_access" | "system";
  tenantId?: string;

  /** What we want done. */
  title: string;
  description: string;

  severity: CarSeverity;
  status: CarStatus;

  /** Who must respond. Set on creation; can be reassigned by a lead. */
  assignedToEmail: string;
  assignedToRole?: string;

  /** Who opened it. */
  openedByEmail: string;
  openedByRole?: string;

  /** Deadlines computed from severity at creation time. */
  respondByAt: string;
  closeByAt: string;

  /** Root-cause analysis filled in by the assignee during INVESTIGATING. */
  rootCause?: string;
  /** Corrective action filled in during ACTION_PLANNED. */
  correctiveAction?: string;

  /** Audit trail of state changes. Append-only. */
  updates: CarUpdate[];

  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  /** True if the CAR was closed past closeByAt — exposed for the
   *  per-person scorecard (V13 §6). */
  closedLate?: boolean;
}

const cars: CorrectiveActionRequest[] = [];
const handle = bindPersistentArray<CorrectiveActionRequest>("corrective_action_requests", cars);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await handle.hydrate();
  hydrated = true;
}

function uid(): string {
  return `car_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── V13 §5.4 deadlines ────────────────────────────────────────────

function deadlineForSeverity(severity: CarSeverity): { respondMs: number; closeMs: number } {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  switch (severity) {
    case "critical": return { respondMs: 4 * HOUR,  closeMs: 1 * DAY  };
    case "high":     return { respondMs: 24 * HOUR, closeMs: 7 * DAY  };
    case "medium":   return { respondMs: 72 * HOUR, closeMs: 14 * DAY };
    case "low":      return { respondMs: 7 * DAY,   closeMs: 30 * DAY };
  }
}

function severityFromLevel(level: 1 | 2 | 3 | 4 | 5): CarSeverity {
  return level >= 5 ? "critical" : level === 4 ? "high" : level === 3 ? "medium" : "low";
}

// ── Create ────────────────────────────────────────────────────────

export interface OpenCarInput {
  eventId: string;
  breachRule: string;
  breachLevel: 1 | 2 | 3 | 4 | 5;
  category: CorrectiveActionRequest["category"];
  tenantId?: string;
  title: string;
  description: string;
  assignedToEmail: string;
  assignedToRole?: string;
  openedByEmail: string;
  openedByRole?: string;
}

export async function openCar(input: OpenCarInput): Promise<CorrectiveActionRequest> {
  await ensureHydrated();
  const severity = severityFromLevel(input.breachLevel);
  const { respondMs, closeMs } = deadlineForSeverity(severity);
  const now = new Date();
  const car: CorrectiveActionRequest = {
    id: uid(),
    eventId: input.eventId,
    breachRule: input.breachRule,
    breachLevel: input.breachLevel,
    category: input.category,
    tenantId: input.tenantId,
    title: input.title,
    description: input.description,
    severity,
    status: "open",
    assignedToEmail: input.assignedToEmail,
    assignedToRole: input.assignedToRole,
    openedByEmail: input.openedByEmail,
    openedByRole: input.openedByRole,
    respondByAt: new Date(now.getTime() + respondMs).toISOString(),
    closeByAt: new Date(now.getTime() + closeMs).toISOString(),
    updates: [
      { at: now.toISOString(), byEmail: input.openedByEmail, byRole: input.openedByRole, note: "CAR opened.", toStatus: "open" },
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  cars.push(car);
  handle.flush();

  // Record the CAR opening as its own accountability event.
  await recordEvent({
    category: "admin",
    action: "car.opened",
    severity: severity === "critical" ? "critical" : severity === "high" ? "high" : "medium",
    actorEmail: input.openedByEmail,
    actorRole: input.openedByRole,
    tenantId: input.tenantId,
    subjectKind: "car",
    subjectId: car.id,
    summary: `CAR opened: ${input.title} (severity ${severity}, assigned to ${input.assignedToEmail})`,
    after: { eventId: input.eventId, breachRule: input.breachRule, severity },
  }).catch(() => {/* never block CAR creation on audit log */});

  return car;
}

// ── Read ──────────────────────────────────────────────────────────

export interface CarFilter {
  status?: CarStatus;
  severity?: CarSeverity;
  assignedToEmail?: string;
  tenantId?: string;
  overdueOnly?: boolean;
  limit?: number;
}

export async function listCars(filter: CarFilter = {}): Promise<CorrectiveActionRequest[]> {
  await ensureHydrated();
  let rows = [...cars];
  if (filter.status)          rows = rows.filter((c) => c.status === filter.status);
  if (filter.severity)        rows = rows.filter((c) => c.severity === filter.severity);
  if (filter.assignedToEmail) rows = rows.filter((c) => c.assignedToEmail === filter.assignedToEmail);
  if (filter.tenantId)        rows = rows.filter((c) => c.tenantId === filter.tenantId);
  if (filter.overdueOnly) {
    const nowIso = new Date().toISOString();
    rows = rows.filter((c) =>
      c.status !== "closed" && c.status !== "verified" &&
      (c.respondByAt < nowIso || c.closeByAt < nowIso),
    );
  }
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return rows.slice(0, filter.limit || 200);
}

export async function getCar(id: string): Promise<CorrectiveActionRequest | null> {
  await ensureHydrated();
  return cars.find((c) => c.id === id) || null;
}

// ── State transitions ────────────────────────────────────────────

interface TransitionInput {
  carId: string;
  byEmail: string;
  byRole?: string;
  note: string;
  rootCause?: string;
  correctiveAction?: string;
}

/** Move the CAR forward in the lifecycle. The next valid status is
 *  determined by the current one — the helper enforces the V13 §5.2
 *  ordering rather than letting callers jump arbitrarily. */
export async function advanceCar(
  current: CarStatus,
  input: TransitionInput,
): Promise<CorrectiveActionRequest | null> {
  await ensureHydrated();
  const c = cars.find((x) => x.id === input.carId);
  if (!c) return null;
  if (c.status !== current) {
    throw new Error(`CAR ${input.carId} not in expected state ${current}; actually ${c.status}`);
  }

  const order: CarStatus[] = ["open", "acknowledged", "investigating", "action_planned", "closed", "verified"];
  const idx = order.indexOf(current);
  const next = order[idx + 1];
  if (!next) throw new Error("CAR already in terminal state");

  c.status = next;
  c.updatedAt = new Date().toISOString();
  if (input.rootCause) c.rootCause = input.rootCause;
  if (input.correctiveAction) c.correctiveAction = input.correctiveAction;
  if (next === "closed" || next === "verified") {
    c.closedAt = c.updatedAt;
    c.closedLate = c.closedAt > c.closeByAt;
  }
  c.updates.push({
    at: c.updatedAt,
    byEmail: input.byEmail,
    byRole: input.byRole,
    note: input.note,
    toStatus: next,
  });
  handle.flush();
  return c;
}

/** Append a comment without changing state. Used for back-and-forth
 *  during INVESTIGATING. */
export async function commentOnCar(input: TransitionInput): Promise<CorrectiveActionRequest | null> {
  await ensureHydrated();
  const c = cars.find((x) => x.id === input.carId);
  if (!c) return null;
  c.updates.push({
    at: new Date().toISOString(),
    byEmail: input.byEmail,
    byRole: input.byRole,
    note: input.note,
  });
  c.updatedAt = new Date().toISOString();
  handle.flush();
  return c;
}
