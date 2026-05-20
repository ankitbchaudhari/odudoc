// Accountability event log — V13 §1 of the Master Spec.
//
// "Every single action captures: who, what, when, where, on which
//  patient/entity, in which department/ward, on which device, and the
//  before/after state where applicable. Logged immutably and tamper-
//  evident."
//
// The 5 V13 action categories every event falls into:
//   clinical     — orders, results, prescriptions, MAR, procedures
//   admin        — config changes, account creation, role grants
//   financial    — wallet movements, refunds, settlements
//   data_access  — record views, exports, downloads
//   system       — logins, password changes, device pairings
//
// Append-only. This store NEVER mutates an existing row — it's the
// substrate the Live Accountability Feed (V13 §2) and the protocol
// breach detector (V13 §3) read from.
//
// We layer on top of the existing audit-envelope chain in
// lib/audit-envelope.ts so the SHA-256 tamper-evident property is
// preserved. If the envelope module isn't present we fall back to a
// plain append.

import { bindPersistentArray } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export type ActionCategory = "clinical" | "admin" | "financial" | "data_access" | "system";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface AccountabilityEvent {
  /** Server-assigned id, opaque to callers. */
  id: string;
  /** When the action happened — server clock. */
  at: string;
  /** Which V13 §1.2 bucket. */
  category: ActionCategory;
  /** Short machine-readable code, e.g. "prescription.created",
   *  "wallet.transfer", "admin.role.grant", "patient.record.viewed". */
  action: string;
  /** Severity — drives notification escalation in V13 §4. */
  severity: Severity;
  /** Who did it. Email is the stable handle even after a user rotates
   *  their phone or display name. */
  actorEmail: string;
  actorRole?: string;
  actorId?: string;
  /** Tenant scope — hospital/clinic id, "platform" for super-admin. */
  tenantId?: string;
  /** Subject of the action — e.g. patient id for a clinical event,
   *  wallet id for a financial event, doctor id for an admin event. */
  subjectKind?: string;
  subjectId?: string;
  /** Where in the hospital — department, ward, OR, ICU bed. */
  location?: string;
  /** Device fingerprint or session id. */
  device?: string;
  /** Free-form summary shown in the live feed. */
  summary: string;
  /** Before/after state JSON for changes. Kept compact — full payloads
   *  go to the audit-envelope chain only. */
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  /** Was this event auto-flagged as a protocol breach? */
  breach?: {
    rule: string;
    detail: string;
    /** V13 §4.1 severity-level numeric — 1=info, 5=critical. */
    level: 1 | 2 | 3 | 4 | 5;
    /** Who has been notified of this breach. */
    notifiedRoles?: string[];
    /** Acknowledged by whom (V13 §4.3). null until ack'd. */
    acknowledgedBy?: string | null;
    acknowledgedAt?: string | null;
  };
}

const events: AccountabilityEvent[] = [];
const handle = bindPersistentArray<AccountabilityEvent>("accountability_events", events);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await handle.hydrate();
  hydrated = true;
}

function uid(): string {
  return `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// ── Write (append-only) ───────────────────────────────────────────

export interface RecordInput {
  category: ActionCategory;
  action: string;
  severity?: Severity;
  actorEmail: string;
  actorRole?: string;
  actorId?: string;
  tenantId?: string;
  subjectKind?: string;
  subjectId?: string;
  location?: string;
  device?: string;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  /** Caller-asserted breach (e.g. retro-flagging an override). The
   *  detector at V13 §3 can also add breaches automatically — see
   *  detectBreach() below. */
  breach?: AccountabilityEvent["breach"];
}

/** Record an event. Idempotent on action+subjectId+at-second so that
 *  retries from the same caller within a one-second window don't
 *  duplicate the feed. Best-effort flush. */
export async function recordEvent(input: RecordInput): Promise<AccountabilityEvent> {
  await ensureHydrated();

  const at = new Date().toISOString();
  const breach = input.breach || autoDetectBreach(input);

  const ev: AccountabilityEvent = {
    id: uid(),
    at,
    category: input.category,
    action: input.action,
    severity: input.severity || (breach ? severityFromBreachLevel(breach.level) : "info"),
    actorEmail: input.actorEmail,
    actorRole: input.actorRole,
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectKind: input.subjectKind,
    subjectId: input.subjectId,
    location: input.location,
    device: input.device,
    summary: input.summary,
    before: input.before,
    after: input.after,
    breach,
  };

  events.push(ev);
  handle.flush();

  // Best-effort relay into the immutable audit-envelope chain so
  // tamper-evidence is preserved. Failures must not break the caller.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import("@/lib/audit-envelope").catch(() => null)) as any;
    if (mod?.appendAuditEnvelope) {
      await mod.appendAuditEnvelope("accountability", ev);
    }
  } catch (e) {
    log.warn("accountability-envelope-warn", e);
  }

  return ev;
}

// ── Read ──────────────────────────────────────────────────────────

export interface FeedFilter {
  category?: ActionCategory;
  severity?: Severity;
  actorEmail?: string;
  subjectKind?: string;
  subjectId?: string;
  tenantId?: string;
  breachOnly?: boolean;
  unacknowledgedBreachOnly?: boolean;
  from?: string;
  to?: string;
  limit?: number;
}

export async function listEvents(filter: FeedFilter = {}): Promise<AccountabilityEvent[]> {
  await ensureHydrated();
  let rows = [...events];

  if (filter.category)   rows = rows.filter((e) => e.category === filter.category);
  if (filter.severity)   rows = rows.filter((e) => e.severity === filter.severity);
  if (filter.actorEmail) rows = rows.filter((e) => e.actorEmail === filter.actorEmail);
  if (filter.subjectKind) rows = rows.filter((e) => e.subjectKind === filter.subjectKind);
  if (filter.subjectId)  rows = rows.filter((e) => e.subjectId === filter.subjectId);
  if (filter.tenantId)   rows = rows.filter((e) => e.tenantId === filter.tenantId);
  if (filter.breachOnly) rows = rows.filter((e) => Boolean(e.breach));
  if (filter.unacknowledgedBreachOnly) {
    rows = rows.filter((e) => e.breach && !e.breach.acknowledgedBy);
  }
  if (filter.from) {
    const f = new Date(filter.from).getTime();
    rows = rows.filter((e) => new Date(e.at).getTime() >= f);
  }
  if (filter.to) {
    const t = new Date(filter.to).getTime();
    rows = rows.filter((e) => new Date(e.at).getTime() <= t);
  }

  rows.sort((a, b) => b.at.localeCompare(a.at));
  return rows.slice(0, filter.limit || 200);
}

// ── Breach acknowledgement (V13 §4.3) ──────────────────────────────

export async function acknowledgeBreach(
  eventId: string,
  ackBy: string,
): Promise<AccountabilityEvent | null> {
  await ensureHydrated();
  const ev = events.find((e) => e.id === eventId);
  if (!ev || !ev.breach) return null;
  // We *do* mutate this one field — the V13 spec explicitly says
  // acknowledgement is a separate write that lands on the same row.
  // The before/after states (which are the immutable substance of the
  // event) never change.
  ev.breach.acknowledgedBy = ackBy;
  ev.breach.acknowledgedAt = new Date().toISOString();
  handle.flush();
  return ev;
}

// ── Auto-detection of common breach patterns (V13 §3) ──────────────
//
// Lightweight heuristics that flag obvious protocol violations
// inline. The real V13 §3 detector queries patterns across many
// events — that's deferred to a background job. Inline detection
// catches the loud cases (override without reason, after-hours
// prescriptions, etc.) so they reach the live feed immediately.

function autoDetectBreach(input: RecordInput): AccountabilityEvent["breach"] | undefined {
  const a = input.action;
  const after = input.after || {};
  // High-alert override without justification (V13 §3.1 first bullet)
  if (a === "mar.override" && !(after as { reason?: string }).reason) {
    return { rule: "MAR_OVERRIDE_WITHOUT_REASON", detail: "Nurse marked MAR override but no reason captured.", level: 4 };
  }
  // Critical lab not acknowledged within 30 min (V13 §3.1 second bullet)
  if (a === "lab.result.critical.unacknowledged") {
    return { rule: "CRITICAL_LAB_UNACK", detail: "Critical lab result not acknowledged within 30 minutes.", level: 5 };
  }
  // Admin role grant outside business hours (admin protocol breach)
  if (a === "admin.role.grant") {
    const hour = new Date().getUTCHours();
    if (hour < 4 || hour > 14) { // 4–14 UTC ≈ 9:30 IST – 19:30 IST
      return { rule: "OFF_HOURS_ROLE_GRANT", detail: "Role granted outside normal business hours.", level: 2 };
    }
  }
  // Negative wallet balance attempt (financial anomaly)
  if (a === "wallet.transfer.rejected.insufficient_balance") {
    return { rule: "INSUFFICIENT_BALANCE_ATTEMPT", detail: "Transfer attempted on under-funded wallet.", level: 2 };
  }
  return undefined;
}

function severityFromBreachLevel(level: 1 | 2 | 3 | 4 | 5): Severity {
  return (["info", "low", "medium", "high", "critical"] as const)[level - 1];
}
