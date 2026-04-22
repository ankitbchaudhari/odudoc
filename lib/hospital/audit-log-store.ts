// Unified audit log. Tenant-scoped. Append-only usage recommended.
import { bindPersistentArray } from "../persistent-array";

export type AuditAction = "create" | "read" | "update" | "delete" | "login" | "logout" | "export" | "print" | "approve" | "reject" | "void" | "reverse" | "other";
export type Severity = "info" | "warning" | "critical";

export interface AuditEntry {
  id: string; organizationId: string;
  occurredAt: string;
  actorId?: string;
  actorName: string;
  actorRole?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  severity: Severity;
  module?: string;
  before?: string;
  after?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  reason?: string;
  notes?: string;
  createdAt: string; updatedAt: string;
}

const entries: AuditEntry[] = [];
const h = bindPersistentArray<AuditEntry>("audit-log", entries, () => []);
await h;

export const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Create", read: "Read", update: "Update", delete: "Delete",
  login: "Login", logout: "Logout", export: "Export", print: "Print",
  approve: "Approve", reject: "Reject", void: "Void", reverse: "Reverse", other: "Other",
};
export const SEVERITY_LABEL: Record<Severity, string> = { info: "Info", warning: "Warning", critical: "Critical" };

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(list: AuditEntry[], orgId: string) {
  const p = `AUD-${suf(orgId)}-`;
  const m = list.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(6, "0")}`;
}

export function listEntries(opts: { organizationId: string; action?: AuditAction; severity?: Severity; module?: string; entityType?: string; entityId?: string; actorId?: string; from?: string; to?: string }): AuditEntry[] {
  return entries.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.action ? r.action === opts.action : true))
    .filter((r) => (opts.severity ? r.severity === opts.severity : true))
    .filter((r) => (opts.module ? r.module === opts.module : true))
    .filter((r) => (opts.entityType ? r.entityType === opts.entityType : true))
    .filter((r) => (opts.entityId ? r.entityId === opts.entityId : true))
    .filter((r) => (opts.actorId ? r.actorId === opts.actorId : true))
    .filter((r) => (opts.from ? r.occurredAt >= opts.from : true))
    .filter((r) => (opts.to ? r.occurredAt <= opts.to : true))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 500);
}
export function createEntry(orgId: string, input: Partial<AuditEntry>): { ok: true; record: AuditEntry } | { ok: false; error: string } {
  if (!input.actorName || !input.action || !input.entityType) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: AuditEntry = {
    id: nextId(entries, orgId), organizationId: orgId,
    occurredAt: input.occurredAt || now,
    actorId: input.actorId, actorName: input.actorName, actorRole: input.actorRole,
    action: input.action as AuditAction,
    entityType: input.entityType,
    entityId: input.entityId, entityLabel: input.entityLabel,
    severity: (input.severity || "info") as Severity,
    module: input.module,
    before: input.before, after: input.after,
    ipAddress: input.ipAddress, userAgent: input.userAgent, sessionId: input.sessionId,
    reason: input.reason, notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  entries.push(r); return { ok: true, record: r };
}
export function deleteEntry(id: string, orgId: string): boolean {
  const i = entries.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  entries.splice(i, 1); return true;
}

export function computeStats(orgId: string) {
  const my = entries.filter((r) => r.organizationId === orgId);
  const today = new Date().toISOString().slice(0, 10);
  const dayStart = today + "T00:00:00.000Z";
  return {
    total: my.length,
    today: my.filter((r) => r.occurredAt >= dayStart).length,
    critical: my.filter((r) => r.severity === "critical").length,
    warnings: my.filter((r) => r.severity === "warning").length,
    deletesToday: my.filter((r) => r.action === "delete" && r.occurredAt >= dayStart).length,
    loginsToday: my.filter((r) => r.action === "login" && r.occurredAt >= dayStart).length,
  };
}
