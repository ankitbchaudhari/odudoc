// Super-admin audit log — a queryable record of sensitive platform-level
// actions (org create/update/delete, module flips, plan changes, demo
// seeding, staff repair, suspension toggles, etc.). Exists so that when
// a customer calls asking "who enabled pharmacy on our account", we have
// an answer.
//
// Deliberately a flat append-only log capped at the last N events. Ops
// can pull the raw table via Postgres if they ever need longer history;
// the UI tier only needs the recent tail to diagnose incidents.

import { bindPersistentArray } from "./persistent-array";

export type AuditAction =
  // Organization lifecycle
  | "org.create"
  | "org.update"
  | "org.delete"
  | "org.plan_change"
  | "org.status_change"
  | "org.modules_change"
  // Demo / seeding
  | "demo.seed"
  | "demo.seed_for_lead"
  | "demo.repair_staff"
  // User admin
  | "user.create"
  | "user.update"
  | "user.ban"
  | "user.unban"
  | "user.reset_password"
  | "user.delete"
  | "user.role_change"
  // Platform
  | "module.request_submitted"
  // Inter-org network — partner handshake + patient/records transfers
  | "network.connect_request"
  | "network.connect_accept"
  | "network.connect_decline"
  | "network.disconnect"
  | "transfer.create"
  | "transfer.accept"
  | "transfer.decline"
  | "transfer.complete"
  | "transfer.cancel";

export interface AuditEntry {
  id: string;
  at: string;                 // ISO timestamp
  actorEmail: string;         // who did it — super-admin email, or "system"
  action: AuditAction;
  // Target identifiers — optional because not every event has all of them.
  orgId?: string;
  orgName?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  // Human-readable summary shown in the UI as the primary line.
  summary: string;
  // Freeform structured context (before/after diffs, IP, etc.). Kept
  // small (<2KB) so the JSONB row stays snappy.
  meta?: Record<string, unknown>;
}

const MAX_ENTRIES = 500;

const entries: AuditEntry[] = [];
const { hydrate, reload, flush } = bindPersistentArray<AuditEntry>(
  "audit_log",
  entries,
  () => []
);
await hydrate();

export async function reloadAuditLog(): Promise<void> {
  await reload();
}

export function listAuditEntries(filter?: {
  action?: AuditAction;
  orgId?: string;
  actorEmail?: string;
  sinceIso?: string;
  limit?: number;
}): AuditEntry[] {
  const limit = Math.min(Math.max(filter?.limit ?? 200, 1), MAX_ENTRIES);
  const since = filter?.sinceIso ? new Date(filter.sinceIso).getTime() : 0;
  const out: AuditEntry[] = [];
  // Iterate newest-first — entries are prepended on insert so the head
  // is the latest event.
  for (const e of entries) {
    if (filter?.action && e.action !== filter.action) continue;
    if (filter?.orgId && e.orgId !== filter.orgId) continue;
    if (filter?.actorEmail && e.actorEmail.toLowerCase() !== filter.actorEmail.toLowerCase()) continue;
    if (since && new Date(e.at).getTime() < since) continue;
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

export function recordAudit(input: Omit<AuditEntry, "id" | "at">): AuditEntry {
  const entry: AuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...input,
  };
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(MAX_ENTRIES);
  }
  flush();
  return entry;
}
